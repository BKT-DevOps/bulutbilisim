# Card Renderer (Quiz & Info & Social) 🎨

Bu proje, JSON formatındaki veri ve soruları şık **bilgi kartlarına (Info Cards)** ve **soru kartlarına (Quiz Cards)** dönüştüren, tamamen **özelleştirilebilir (White Label)** bir araçtır.

Topluluklar, eğitimciler ve içerik üreticileri için; Instagram, LinkedIn ve diğer sosyal medya platformlarına uygun, yüksek kaliteli görselleri saniyeler içinde üretir.

## ✨ Öne Çıkan Özellikler

- **Tamamen Generik Yapı**: "BKT" veya "Bulut Bilişim" bağımlılığı yoktur. Config dosyasından kendi marka adını, logosunu ve renklerini verebilirsin.
- **3 Ana Şablon**:
  1.  **Quiz**: Çoktan seçmeli sorular için (1080x1300).
  2.  **Info**: Bilgi ve kod örnekleri için (1080x1300).
  3.  **Social**: Logosuz, geniş format duyuru ve ipuçları için (1200x628).
- **Tema Sistemi**: CSS ile uğraşmadan config dosyasından renkleri (gradient, accent, background) değiştirebilirsin.
- **Akıllı Logo Yönetimi**: Logo vermezsen kutusu gizlenir, simetri bozulmaz.
- **Otomatik İsimlendirme**: Tarih sırasına göre düzenli dosya isimleri üretir.

## 🚀 Hızlı Başlangıç

### 1. Kurulum

```bash
npm install
npx playwright install chromium
```

### 2. Tek Komutla Her Şeyi Bas (`build:all`)

```bash
npm run build:all
```

_Bu komut tanımlı tüm setleri (Linux, Docker, AWS, Git, Duyuru) otomatik bulur ve basar._

### 3. Tekil Konu Basımı (Örnek: Docker Quiz)

```bash
npm run build:docker:quiz
```

---

## ⚙️ Yapılandırma (Config)

Her konu için bir `.config.json` dosyası bulunur (Örn: `Topics/Docker/quiz.config.json`).
Bu dosya ile tüm tasarımı yönetebilirsin:

```json
{
  "topic": "Docker",
  "input": "topics/docker/questions1.json",
  "template": "quiz",

  // --- MARKA & METİN ---
  "community": "Benim Topluluğum",
  "group": "DevOps Ekibi",

  // --- EKRAN & BOYUT ---
  "format": "png",
  "size": "custom",
  "width": 1080,
  "height": 1300,

  // --- LOGOLAR (Opsiyonel) ---
  // Boş bırakırsan ("") logo kutusu gizlenir.
  "logo1": "assets/sol-logo.png",
  "logo2": "",

  // --- TEMA (Opsiyonel) ---
  // Vermezsen varsayılan Mor/Mavi tema kullanılır.
  "theme": {
    "background": "#0f0101",
    "accent": "#ef4444", // Vurgu rengi (Kırmızı)
    "gradient": "linear-gradient(135deg, #ef4444 0%, #f97316 100%)"
  }
}
```

## 📂 Veri Formatları (JSON)

### 1. Quiz Formatı (`questions.json`)

Soru cevap kartları için kullanılır.

```json
[
  {
    "question": "Docker'da çalışan konteynerleri hangi komut listeler?",
    "options": ["docker ls", "docker ps", "docker run", "docker images"],
    "answerIndex": 1, // Doğru cevabın indeksi (B şıkkı için 1)
    "explanation": "docker ps komutu çalışan konteynerleri listeler."
  }
]
```

### 2. Info Formatı (`info.json`)

Bilgi kartları ve kod örnekleri için kullanılır.

```json
[
  {
    "title": "git commit",
    "content": "Değişiklikleri kalıcı olarak kaydeder.",
    "example": "git commit -m 'İlk özellik eklendi'"
  }
]
```

### 3. Social Formatı (`social.json`)

Logosuz, geniş ekran paylaşımlar için.

```json
[
  {
    "title": "Haftanın İpucu",
    "content": "Docker layer'larını optimize etmek için multi-stage build kullanın.",
    "code": "FROM node:18 AS builder\nWORKDIR /app...",
    "footer": "@slymanmrcan"
  }
]
```

---

## 📁 Proje Yapısı

```text
Topics/             # İçerik ve Config dosyaları burada tutulur
  ├── Docker/
  │   ├── quiz.config.json
  │   ├── questions1.json
  │   ├── info.config.json
  │   └── info1.json
  ├── AWS/
  ├── Linux/
  └── Git/
templates/          # HTML/CSS şablonları
  ├── quiz/
  ├── info/
  └── social/
scripts/            # Build scriptleri (Ellemenize gerek yok)
output/             # Çıktı klasörü (Buraya basılır)
```

## 🛠️ Sık Sorulan Sorular

**S: Kendi logomu nasıl eklerim?**
C: Config dosyasında `"logo1": "dosya/yolu.png"` vermen yeterli. Eğer yol vermezsen varsayılan logoları (`templates/logo.png`) kullanır.

**S: Tema değiştirmek istiyorum?**
C: Config dosyasına `theme` objesi ekle. `background` ve `accent` renklerini değiştirmen yeterli. CSS dosyasına girmene gerek yok.

**S: Çıktılar nereye gidiyor?**
C: Varsayılan olarak `output/` klasörüne, konu adıyla (Örn: `output/Docker/quiz/...`) kaydedilir.

---

**Lisans**: MIT
