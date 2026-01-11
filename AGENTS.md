<INSTRUCTIONS>
Bu repoda AGENT olarak calisirken oncelikle `template/` ve `scripts/build.mjs` yapisini kullan.

Genel akis:
- `template/<name>/card.html` + `template/<name>/styles.css` ikilisi bir template'i temsil eder.
- Template'ler `scripts/build.mjs` tarafindan HTML/CSS olarak birlestirilir ve Playwright ile ekran goruntusu uretilir.
- `scripts/build.mjs` "generic engine" ile `{{field}}` yerlerine JSON verilerini basar.
- `info`, `quiz`, `aws-cert`, `social` gibi template'ler ozel islenir.
- `cloud` template'i generic engine ile calisir; alan isimleri dogrudan JSON'dan gelir.

Cloud template notlari:
- `template/cloud/card.html` icinde `{{title}}`, `{{content}}`, `{{example}}` kullanilir.
- `{{example}}` bossa ornek bolumu CSS ile gizlenir.
- `{{COMMUNITY}}`, `{{GROUP_NAME}}`, `{{TOPIC}}`, `{{NO}}`, `{{DATE}}` gibi ortak alanlar `scripts/build.mjs` ile otomatik gelir.

Cloud set standartlari:
- Veri: `Topics/Cloud/info-1.json`
- Config: `Topics/Cloud/info-1.config.json`
- Cikti seti: `output/Cloud/cloud-1/`

Kullanim ornegi:
- `node scripts/build.mjs --config Topics/Cloud/info-1.config.json`

Yeni template ekleme:
- `template/<yeni-ad>/card.html` ve `template/<yeni-ad>/styles.css` olustur.
- Gerekliyse `scripts/build.mjs` icine ozel render dalini ekle; gerek degilse generic engine kullan.

Not:
- Playwright ekran goruntusu için viewport `--size story|square|custom` ile ayarlanir.
</INSTRUCTIONS>
