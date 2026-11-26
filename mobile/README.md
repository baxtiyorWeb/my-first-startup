# Mobile Ilova (Geters)

Ushbu papka Geters platformasining **Flutter** asosidagi mobil ilovasini o'z ichiga oladi.

## Texnologiyalar
- **Framework:** Flutter 3.50+
- **Til:** Dart
- **Paket nomi:** `mobile` (`com.geters.mobile`)
- **Platformalar:** Android, iOS

## Ishga tushirish

1. Qaramliklarni o'rnatish:
   ```bash
   flutter pub get
   ```

2. Ilovani ishga tushirish (emulator yoki ulangan qurilma):
   ```bash
   # Android (internetdagi API)
   flutter run --dart-define-from-file=config/dev-android.json

   # Desktop / iOS simulyator (lokal backend)
   flutter run --dart-define-from-file=config/dev.json
   ```

   `--dart-define-from-file` berilmasa ham ilova `https://www.geters.uz/api` manzilidan foydalanadi. Lokal Android emulyator backendiga ulanish uchun `API_BASE_URL=http://10.0.2.2:3000/api` ni build vaqtida bering; jismoniy qurilmada `10.0.2.2` o'rniga kompyuterning LAN IP manzilini ishlating.

3. Statik tahlil (linter):
   ```bash
   flutter analyze
   ```

## API manzili (`API_BASE_URL`)

Ilova backend manzilini faqat build vaqtida oladi (`String.fromEnvironment`), kod ichida hardcode qilinmagan.

| Fayl | Manzil | Qachon |
|---|---|---|
| `config/dev.json` | `http://127.0.0.1:3000/api` | desktop, iOS simulyator |
| `config/dev-android.json` | `https://www.geters.uz/api` | Android qurilma va emulyator |
| `config/prod.example.json` | `https://www.geters.uz/api` | namuna, `prod.json` ga nusxalanadi |
| `config/prod.json` | haqiqiy production manzil | git'ga qo'shilmaydi |

Release build'da `API_BASE_URL` berilmasa ilova ishga tushishida `StateError` bilan to'xtaydi (`ApiConstants.assertConfiguredForRelease`). Bu qurilma o'ziga so'rov yuboradigan build'ni oldini oladi.

## Android release imzosi

Play Console debug kalit bilan imzolangan AAB'ni qabul qilmaydi, shuning uchun:

1. **Keystore yaratish** (bir marta, loyiha ildizida):
   ```bash
   ./scripts/generate_keystore.sh
   ```
   Skript `android/app/upload-keystore.jks` va `android/key.properties` fayllarini yaratadi (parolni so'raydi, fayl huquqi `600`).

   Qo'lda ham mumkin:
   ```bash
   cp android/key.properties.example android/key.properties
   # so'ng qiymatlarni to'ldiring
   ```

2. **Muhit faylini tayyorlash:**
   ```bash
   cp config/prod.example.json config/prod.json
   # API_BASE_URL ni production manziliga o'zgartiring
   ```

3. **AAB yig'ish:**
   ```bash
   ./scripts/build_release.sh
   ```
   Skript quyidagilarni tekshiradi va xato bo'lsa build qilmaydi:
   - `config/prod.json` mavjudmi va `API_BASE_URL` to'ldirilganmi;
   - manzil lokal (`127.0.0.1`, `10.0.2.2`, `192.168.*`) emasmi;
   - oxirida `/` yo'qmi;
   - `android/key.properties` mavjudmi.

   Natija: `build/app/outputs/bundle/release/app-release.aab`

4. **Versiyani oshirish** — har bir yuklashdan oldin `pubspec.yaml` dagi `version: 1.0.0+1` (build raqami `+N`) oshirilishi shart.

### Muhim

- `android/key.properties` va `*.jks` hech qachon commit qilinmaydi (`android/.gitignore`).
- Gradle `bundle` topshirig'i keystore'siz **xato beradi**; oddiy `assembleRelease` (qurilmada sinash) esa ogohlantirish bilan debug kalitda davom etadi.
- Keystore yo'qolsa, Play'dagi mavjud ilovaga yangilanish chiqarib bo'lmaydi — zaxira nusxasini xavfsiz saqlang.
