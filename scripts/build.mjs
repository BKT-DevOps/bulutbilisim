import fs from "fs";
import path from "path";
import { chromium } from "playwright";

// ---------------------
// CLI Args
// ---------------------
function getArg(name, fallback = null) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

// ---------------------
// Load config
// ---------------------
const configPath = getArg("config", null);

if (!configPath) {
  console.error("❌ Missing --config. Example:");
  console.error(
    "   node scripts/build.mjs --config topics/linux/quiz.config.json"
  );
  process.exit(1);
}

if (!fs.existsSync(configPath)) {
  console.error(`❌ Config not found: ${configPath}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

// ---------------------
// Resolve args (CLI overrides config)
// ---------------------
const topic = getArg("topic", config.topic || "Topic");
const input = getArg("input", config.input || null);
const templateName = getArg("template", config.template || "quiz");

const community = getArg(
  "community",
  config.community || "Bilgisayar Kavramları Topluluğu"
);
const groupName = getArg("group", config.group || "Bulut Bilişim Grubu");

const startDate = getArg("startDate", config.startDate || "2026-01-04"); // used if q.date is missing
const perDay = parseInt(getArg("perDay", String(config.perDay ?? 1)), 10);

const format = getArg("format", config.format || "png"); // png | jpg
const size = getArg("size", config.size || "square"); // square | story | custom
const showAnswer =
  getArg("showAnswer", String(config.showAnswer ?? false)) === "true";
const onExists = getArg("onExists", config.onExists || "fail"); // fail | overwrite

// Optional advanced config
const outputDir = getArg("outputDir", config.outputDir || "output");
const filenamePattern = getArg(
  "filenamePattern",
  config.filenamePattern || "{set}_{date}_q{qno}_{id}.{ext}"
);
const includeSlug =
  getArg("includeSlug", String(config.includeSlug ?? false)) === "true";
const slugMaxLen = parseInt(
  getArg("slugMaxLen", String(config.slugMaxLen ?? 40)),
  10
);
const clean = getArg("clean", String(config.clean ?? false)) === "true";

// Custom size
const width = parseInt(getArg("width", String(config.width ?? 1080)), 10);
const height = parseInt(getArg("height", String(config.height ?? 1080)), 10);

// ---------------------
// Validate
// ---------------------
if (!input) {
  console.error('❌ Missing "input" in config.json');
  process.exit(1);
}
if (!fs.existsSync(input)) {
  console.error(`❌ Input not found: ${input}`);
  process.exit(1);
}
if (!["png", "jpg"].includes(format)) {
  console.error(`❌ Invalid format: ${format} (allowed: png|jpg)`);
  process.exit(1);
}
if (!["square", "story", "custom"].includes(size)) {
  console.error(`❌ Invalid size: ${size} (allowed: square|story|custom)`);
  process.exit(1);
}
if (!["fail", "overwrite"].includes(onExists)) {
  console.error(`❌ Invalid onExists: ${onExists} (allowed: fail|overwrite)`);
  process.exit(1);
}

// ---------------------
// Viewport
// ---------------------
const viewport =
  size === "custom"
    ? { width, height }
    : size === "story"
    ? { width: 1080, height: 1920 }
    : { width: 1080, height: 1080 };

// ---------------------
// Helpers
// ---------------------
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function slugify(str, maxLen = 40) {
  return String(str || "")
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, maxLen);
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function applyPattern(pattern, vars) {
  return pattern.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

function rmDirSafe(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

// Generic engine supports: {{field}}, {{nested.field}}, {{field|default}}
function getValue(obj, keyPath) {
  if (!keyPath) return "";
  const parts = keyPath.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
    else return "";
  }
  return cur ?? "";
}

function renderGeneric(template, data) {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, raw) => {
    const expr = raw.trim();
    const [keyPath, defVal] = expr.split("|").map((s) => s.trim());
    const val = getValue(data, keyPath);
    const finalVal =
      val === "" || val === null || val === undefined
        ? defVal ?? ""
        : String(val);
    return escapeHtml(finalVal);
  });
}

function loadLogo(pathOrBuffer) {
  if (!pathOrBuffer) return "";
  try {
     const buf = fs.readFileSync(pathOrBuffer);
     const ext = path.extname(pathOrBuffer).toLowerCase();
     const mime = ext === ".jpg" || ext === ".jpeg" ? "jpeg" : "png";
     return `data:image/${mime};base64,${buf.toString("base64")}`;
  } catch (e) {
    console.warn(`⚠️ Failed to load logo: ${pathOrBuffer}`);
    return "";
  }
}

// ---------------------
// Load data + template
// ---------------------
const data = JSON.parse(fs.readFileSync(input, "utf8"));

const templateHtmlPath = `template/${templateName}/card.html`;
const templateCssPath = `template/${templateName}/styles.css`;

if (!fs.existsSync(templateHtmlPath)) {
  console.error(`❌ Template HTML not found: ${templateHtmlPath}`);
  process.exit(1);
}
if (!fs.existsSync(templateCssPath)) {
  console.error(`❌ Template CSS not found: ${templateCssPath}`);
  process.exit(1);
}

const templateHtml = fs.readFileSync(templateHtmlPath, "utf8");
let stylesCss = fs.readFileSync(templateCssPath, "utf8");

// ---------------------
// Load logo as base64 (optional)
// ---------------------
// Transparent 1x1 pixel fallback
const TRANSPARENT_PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3Z9pEAAAAASUVORK5CYII=";

// Check config for overrides, else default
let logo1Path = config.logo1;
if (logo1Path === undefined) {
  if (fs.existsSync("template/logo.png")) logo1Path = "template/logo.png";
  else if (fs.existsSync("template/logo.jpg")) logo1Path = "template/logo.jpg";
}

let logo2Path = config.logo2;
if (logo2Path === undefined) {
  if (fs.existsSync("template/logo2.png")) logo2Path = "template/logo2.png";
  else if (fs.existsSync("template/logo2.jpg")) logo2Path = "template/logo2.jpg";
}

let logoSrc = "";
if (logo1Path && fs.existsSync(logo1Path)) {
  logoSrc = loadLogo(logo1Path);
} else {
  logoSrc = TRANSPARENT_PIXEL;
}

let logo2Src = "";
if (logo2Path && fs.existsSync(logo2Path)) {
  logo2Src = loadLogo(logo2Path);
} else {
  logo2Src = TRANSPARENT_PIXEL;
}

const logo1Visibility = logoSrc === TRANSPARENT_PIXEL ? "hidden" : "";
const logo2Visibility = logo2Src === TRANSPARENT_PIXEL ? "hidden" : "";


// ---------------------
// Load background image as base64 (if referenced in CSS)
// ---------------------
let bgSrc = "";
const bgPathPng = `template/${templateName}/background.png`;
const bgPathJpg = `template/${templateName}/background.jpg`;

if (fs.existsSync(bgPathPng)) {
  const buf = fs.readFileSync(bgPathPng);
  bgSrc = `data:image/png;base64,${buf.toString("base64")}`;
} else if (fs.existsSync(bgPathJpg)) {
  const buf = fs.readFileSync(bgPathJpg);
  bgSrc = `data:image/jpeg;base64,${buf.toString("base64")}`;
}

// Replace in CSS if placeholder exists
if (bgSrc) {
  stylesCss = stylesCss.replace("{{BG_SRC}}", bgSrc);
} else {
  // If no image, remove the url() wrapper if it exists or just empty
  // Better approach: User uses url('{{BG_SRC}}') in CSS.
  // If empty, we might want to replace with empty string or fallback.
  // For now, let's just make it empty which might break url('').
  // A cleaner way relies on CSS structure. Let's assume user handles fallback or we replace the whole declaration.
  // Simplest: Replace {{BG_SRC}} with emptiness or a 1x1 transparent pixel if needed to avoid syntax errors?
  // Let's replace with empty string, user CSS should handle valid values.
  // Actually, if I replace url('{{BG_SRC}}') with url(''), it is valid but empty.
  stylesCss = stylesCss.replace("{{BG_SRC}}", "");
}

// ---------------------
// Build overview
// ---------------------
const baseDate = parseDate(startDate);
const total = data.length;
const setBaseName = path.basename(input, path.extname(input)); // e.g. question1
const setName = slugify(setBaseName, 30);

console.log("=====================================");
console.log("🧾 Card Render Build");
console.log("Config:", configPath);
console.log("Input:", input);
console.log("Topic:", topic);
console.log("Template:", templateName);
console.log("Set:", setName);
console.log("StartDate:", startDate);
console.log("PerDay:", perDay);
console.log("Format:", format);
console.log("Size:", size, viewport);
console.log("Total Items:", total);
console.log("OnExists:", onExists);
console.log("OutputDir:", outputDir);
console.log("FilenamePattern:", filenamePattern);
console.log("IncludeSlug:", includeSlug);
console.log("Clean:", clean);
console.log("=====================================");

// ---------------------
// Output folder
// output/<topic>/<template>/
ensureDir(outputDir);
const outRoot = path.join(outputDir, topic, templateName);

if (clean) {
  console.warn(`⚠️ Clean enabled. Deleting: ${outRoot}`);
  rmDirSafe(outRoot);
}

ensureDir(outRoot);

// ---------------------
// Render
// ---------------------
const browser = await chromium.launch();
const page = await browser.newPage({ viewport });

for (let i = 0; i < data.length; i++) {
  const q = data[i];

  // Date logic:
  // 1) If JSON has `date`, use it (YYYY-MM-DD)
  // 2) Else auto-calc from startDate & perDay
  const dateStr = q.date
    ? String(q.date)
    : formatDate(addDays(baseDate, Math.floor(i / perDay)));

  const qNo = String(i + 1).padStart(3, "0");
  const qIdRaw = q.id || `${topic}-${qNo}`;
  const qIdSafe = slugify(qIdRaw, 50);

  // for filename slug (optional)
  const baseTextForSlug =
    q.question || q.title || q.content || q.subtitle || qIdRaw || "";
  const qSlug = slugify(baseTextForSlug, slugMaxLen);

  // Common data for generic templates
  // Common data for generic templates
  const commonData = {
    ...q,
    TOPIC: topic,
    TEMPLATE: templateName,
    COMMUNITY: community,
    GROUP_NAME: groupName,
    DATE: dateStr,
    NO: String(i + 1),
    ID: qIdRaw,
    LOGO_SRC: logoSrc,
    LOGO2_SRC: logo2Src,
  };

  let html = "";

  // ---------------------
  // Special templates
  // ---------------------
  if (templateName === "quiz") {
    // ... (quiz logic remains same, it already has it)
    const qText = q.question || "";
    const options = Array.isArray(q.options) ? q.options : [];

    const optionsHtml = options
      .map((opt) => `<li>${escapeHtml(String(opt))}</li>`)
      .join("\n");

    const explanation = q.explanation ? String(q.explanation) : "";
    const explanationBlock = explanation
      ? `<div class="explanation"><div class="title">Açıklama</div>${escapeHtml(
          explanation
        )}</div>`
      : "";

    html = templateHtml
      .replaceAll("{{LOGO_SRC}}", logoSrc)
      .replaceAll("{{LOGO2_SRC}}", logo2Src)
      .replaceAll("{{LOGO1_VISIBILITY}}", logo1Visibility)
      .replaceAll("{{LOGO2_VISIBILITY}}", logo2Visibility)
      .replaceAll("{{COMMUNITY}}", escapeHtml(community))
      .replaceAll("{{GROUP_NAME}}", escapeHtml(groupName))
      .replaceAll("{{TOPIC}}", escapeHtml(topic))
      .replaceAll("{{DATE}}", escapeHtml(dateStr))
      .replaceAll("{{NO}}", escapeHtml(String(i + 1)))
      .replaceAll("{{ID}}", escapeHtml(qIdRaw))
      .replaceAll("{{QUESTION}}", escapeHtml(qText))
      .replaceAll("{{OPTIONS}}", optionsHtml)
      .replaceAll("{{EXPLANATION_BLOCK}}", explanationBlock);

    // showAnswer only affects quiz templates
    if (showAnswer && q.answerIndex !== undefined && q.answerIndex !== null) {
      const answerLetter = String.fromCharCode(65 + Number(q.answerIndex));
      // Inject after options list (safe if template has </ol>)
      html = html.replace(
        "</ol>",
        `</ol><div style="margin-top:16px;color:rgba(255,255,255,0.7);font-weight:800;">Cevap: ${answerLetter}</div>`
      );
    }
  } else if (templateName === "info") {
    const title = q.title || "";
    const content = q.content || "";
    const example = q.example ? String(q.example) : "";

    const exampleBlock = example
      ? `<div class="example"><div class="title">Örnek</div><pre>${escapeHtml(
          example
        )}</pre></div>`
      : "";

    html = templateHtml
      .replaceAll("{{LOGO_SRC}}", logoSrc)
      .replaceAll("{{LOGO2_SRC}}", logo2Src)
      .replaceAll("{{LOGO1_VISIBILITY}}", logo1Visibility)
      .replaceAll("{{LOGO2_VISIBILITY}}", logo2Visibility)
      .replaceAll("{{COMMUNITY}}", escapeHtml(community))
      .replaceAll("{{GROUP_NAME}}", escapeHtml(groupName))
      .replaceAll("{{TOPIC}}", escapeHtml(topic))
      .replaceAll("{{DATE}}", escapeHtml(dateStr))
      .replaceAll("{{NO}}", escapeHtml(String(i + 1)))
      .replaceAll("{{ID}}", escapeHtml(qIdRaw))
      .replaceAll("{{TITLE}}", escapeHtml(title))
      .replaceAll("{{CONTENT}}", escapeHtml(content))
      .replaceAll("{{EXAMPLE_BLOCK}}", exampleBlock);
  } else if (templateName === "social") {
    // Social template: Title + Content + Signature (Minimal)
    const title = q.title || q.question || "";
    // If content missing, fallback to question's explanation or raw text
    const content = q.content || q.explanation || "";
    const footerText = q.footer || "Bilgisayar Kavramları Topluluğu"; // Default if empty
    
    // Code block handling
    const code = q.code ? String(q.code) : "";
    const codeBlock = code
      ? `<div class="code-snippet">${escapeHtml(code)}</div>`
      : "";

    html = templateHtml
      .replaceAll("{{TITLE}}", escapeHtml(title))
      .replaceAll("{{CONTENT}}", escapeHtml(content))
      .replaceAll("{{FOOTER}}", escapeHtml(footerText))
      .replaceAll("{{CODE_BLOCK}}", codeBlock);
      
  } else {
    // ---------------------
    // Generic template
    // Any {{field}} will map from JSON automatically
    // Supports default: {{field|Default Text}}
    // Also includes: {{TOPIC}}, {{COMMUNITY}}, {{DATE}}, {{NO}}, {{ID}}, {{LOGO_SRC}}
    html = renderGeneric(templateHtml, commonData);
  }

  // Inline CSS
  let fullHtml = html.replace(
    '<link rel="stylesheet" href="./styles.css" />',
    `<style>${stylesCss}</style>`
  );

  // ---------------------
  // Theme Injection
  // ---------------------
  if (config.theme) {
    const t = config.theme;
    let themeCss = ":root {";
    if (t.background) themeCss += ` --bg-color: ${t.background};`;
    if (t.accent) {
       themeCss += ` --text-accent: ${t.accent};`;
       themeCss += ` --option-border-active: ${t.accent};`;
       themeCss += ` --accent: ${t.accent};`;
    }
    if (t.gradient) themeCss += ` --accent-gradient: ${t.gradient};`;
    if (t.textPrimary) themeCss += ` --text-primary: ${t.textPrimary};`;
    if (t.textSecondary) themeCss += ` --text-secondary: ${t.textSecondary};`;
    if (t.cardGlass) themeCss += ` --card-glass: ${t.cardGlass};`;
    if (t.cardBorder) themeCss += ` --card-border: ${t.cardBorder};`;
    themeCss += "}";
    
    // Check if </style> exists in fullHtml, append before it so it overrides
    // Actually, appending AFTER standard styles is better for override.
    // We already inlined styles. So we can just append this block.
    fullHtml = fullHtml.replace("</style>", `${themeCss}</style>`);
  }

  await page.setContent(fullHtml, { waitUntil: "networkidle" });

  // Build filename
  const vars = {
    topic,
    set: setName,
    date: dateStr,
    qno: qNo,
    id: qIdSafe,
    slug: includeSlug ? qSlug : "",
    ext: format,
  };

  const fileName = applyPattern(filenamePattern, vars)
    .replace(/__+/g, "_")
    .replace(/-_+/g, "-")
    .replace(/_-+/g, "_")
    .replace(/(^[_-]+|[_-]+$)/g, "");

  const outFile = path.join(outRoot, fileName);

  if (fs.existsSync(outFile)) {
    if (onExists === "overwrite") {
      console.warn(`⚠️ Exists, overwriting: ${outFile}`);
    } else {
      console.error(`❌ Output already exists (onExists=fail): ${outFile}`);
      console.error(
        "   - Delete output files OR set onExists=overwrite in config."
      );
      await browser.close();
      process.exit(1);
    }
  }

  await page.screenshot({
    path: outFile,
    type: format === "jpg" ? "jpeg" : "png",
    fullPage: true,
  });

  console.log(`✅ [${i + 1}/${total}] -> ${outFile}`);
}

await browser.close();

console.log("=====================================");
console.log("🎉 Done. Output folder ready:", path.resolve(outputDir));
console.log("=====================================");
