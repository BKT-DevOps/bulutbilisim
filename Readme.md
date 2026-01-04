# BTK Cloud Group Questions – Card Renderer

This repo generates **quiz cards** and **info cards** (PNG/JPG images) from JSON files.
Cards are rendered via **HTML/CSS templates** + **Playwright screenshot**.

Use cases:
- Share daily questions or knowledge cards in WhatsApp/Telegram communities
- Batch-generate 30–60 images at once
- Keep templates consistent across topics (Linux, Docker, AWS...)

## Features

- Render cards from JSON
- Multiple card types via templates:
  - `quiz` (multiple choice)
  - `info` (title + content + example)
- Custom sizes (square/story/custom)
- Optional logo support (embedded as base64)
- Deterministic output naming using `filenamePattern`
- `onExists` behavior:
  - `fail` (safe mode)
  - `overwrite` (re-render mode)
- Works locally or via GitHub Actions

## Requirements

- Node.js 18+ (recommended: 20)
- Playwright Chromium

## Install

```bash
npm install
npx playwright install chromium
```

## Project Structure

```text
templates/
  quiz/
    card.html
    styles.css
  info/
    card.html
    styles.css
  logo.png              # optional (or logo.jpg)
topics/
  linux/
    quiz.config.json
    info.config.json
    question1.json
    info1.json
  docker/
    quiz.config.json
    question1.json
scripts/
  build.mjs
  build-all.mjs         # optional: builds all configs automatically
output/
package.json
README.md
```

## Config File (.config.json)

Each build is driven by a config file (example: `topics/linux/quiz.config.json`).

Minimal example:

```json
{
  "topic": "Linux",
  "input": "topics/linux/question1.json",
  "template": "quiz",
  "community": "Bilgisayar Kavramlari Toplulugu",
  "startDate": "2026-01-07",
  "perDay": 1,
  "format": "png",
  "size": "square",
  "onExists": "fail",
  "filenamePattern": "{set}_{date}_q{qno}_{id}.{ext}"
}
```

Supported config options:

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| topic | string | - | Topic output folder name (`output/<topic>/...`) |
| input | string | - | JSON file path (required) |
| template | string | `quiz` | Template folder name (`templates/<template>/...`) |
| community | string | Bilgisayar Kavramlari Toplulugu | Header title |
| startDate | string | `2026-01-04` | Starting date for auto distribution |
| perDay | number | `1` | How many cards per day |
| format | `png`/`jpg` | `png` | Output image format |
| size | `square`/`story`/`custom` | `square` | Output size preset |
| width | number | `1080` | Only for `custom` |
| height | number | `1080` | Only for `custom` |
| onExists | `fail`/`overwrite` | `fail` | Behavior if output file already exists |
| outputDir | string | `output` | Output root folder |
| filenamePattern | string | `{set}_{date}_q{qno}_{id}.{ext}` | Output filename pattern |
| includeSlug | boolean | `false` | Adds `{slug}` from question text |
| slugMaxLen | number | `40` | Slug length |
| clean | boolean | `false` | Deletes output folder before rendering (optional) |

## Output Folder Structure

By default output goes to:

```text
output/<topic>/<template>/...
```

Example:

```text
output/Linux/quiz/...
output/Linux/info/...
```

## Build Commands

Run a single build:

```bash
node scripts/build.mjs --config topics/linux/quiz.config.json
```

Using npm scripts (recommended):

```json
"build:linux:quiz": "node scripts/build.mjs --config topics/linux/quiz.config.json",
"build:linux:info": "node scripts/build.mjs --config topics/linux/info.config.json"
```

Then:

```bash
npm run build:linux:quiz
npm run build:linux:info
```

## Build All Topics (Optional)

If you add `scripts/build-all.mjs`, it can automatically find all `*.config.json` under `topics/` and build them.

```bash
node scripts/build-all.mjs
```

Or add a script:

```json
"build:all": "node scripts/build-all.mjs"
```

Then:

```bash
npm run build:all
```

## JSON Formats

### Quiz JSON Format (Multiple Choice)

`question1.json` example:

```json
[
  {
    "id": "linux-0001",
    "question": "find komutu ile boyutu 100MB'dan buyuk dosyalari listelemek icin hangi parametre kullanilir?",
    "options": [
      "find . -size 100M",
      "find . -size +100M",
      "find . -s > 100",
      "find . -type f --big 100"
    ],
    "answerIndex": 1,
    "explanation": "find . -size +100M ile 100MB'dan buyuk dosyalar listelenir."
  }
]
```

Fields:

- `id` (required)
- `question` (required)
- `options` (required)
- `answerIndex` (optional)
- `explanation` (optional)

### Info JSON Format (Knowledge Cards)

`info1.json` example:

```json
[
  {
    "id": "linux-info-0001",
    "title": "find komutu ile dosya arama",
    "content": "find, Linux uzerinde dosya ve dizin aramak icin kullanilan guclu bir komuttur.",
    "example": "find . -type f -name \"*.log\" -size +100M"
  }
]
```

Fields:

- `id` (required)
- `title` (required)
- `content` (required)
- `example` (optional)

## Custom Sizes

Supported sizes:

- `square` -> 1080x1080
- `story` -> 1080x1920
- `custom` -> `width` x `height` from config

Example (Instagram post portrait):

```json
"size": "custom",
"width": 1080,
"height": 1350
```

Note: Portrait is `width < height`. Example `1920x1080` is landscape.

## Logo Support

Place a logo at:

```text
templates/logo.png
```

(or `templates/logo.jpg`)

The script embeds it as base64, so it always renders correctly.

## GitHub Actions (Optional)

You can generate outputs without cloning locally using GitHub Actions.
A workflow can build all configs and upload `output/` as an artifact.

Recommended approach:

- Keep `output/` in `.gitignore`
- Download results as Actions artifact

## FAQ

**onExists ne zaman calisir?**
Only when the output file already exists.

- `fail`: stops build
- `overwrite`: replaces old file

**Output'u git'e commit etmeli miyiz?**
Not recommended long-term (image history grows). Better:

- Use GitHub Actions artifact
- Or keep `output/` in a separate branch

**Her topic ayni takvimi paylasabilir mi?**
Yes, if you add a date field into JSON and update the script to prefer it.
Otherwise each config uses `startDate` + `perDay`.

**Can I create completely different info card topics?**
Yes. You can create any topic/content you want as long as JSON includes the fields your template expects.

`info` template expects:

- `title`
- `content`
- optional `example`

If you want different fields (ex: quote, author, tags) you can:

- create a new template under `templates/<name>/`
- update template in config
- optionally update the mapping in `build.mjs`

## License

MIT (or choose your preferred license)
