# Google Play 2026 — nashrga tayyorlash ro'yxati

Bu hujjat Geters (Android) ilovasini Google Play'ga joylash uchun kodda
bajarilgan ishlar va Play Console'da qo'lda bajarilishi kerak bo'lgan
qadamlar ro'yxati. Har bir bandning holati belgilangan.

## 1. Kodda tayyor (ushbu repoda)

| Talab | Holat | Qayerda |
| --- | --- | --- |
| Maxfiylik siyosati (to'liq, 3 tilda, default: inglizcha) | ✅ | `/en/privacy`, `/ru/privacy`, `/uz/privacy` |
| Foydalanish shartlari (UGC qoidalari bilan) | ✅ | `/en/terms` va boshqa tillar |
| Hamjamiyat qoidalari + shikoyat/bloklash | ✅ | `/en/guidelines` |
| Bolalar xavfsizligi standartlari (CSAE) | ✅ | `/en/child-safety` |
| Hisobni o'chirish (ilova ichida) | ✅ | Sozlamalar → «Hisobni butunlay o'chirish» (`DELETE /api/settings/account`) |
| Hisobni o'chirish (ilovadan tashqarida, login talab qilmaydi) | ✅ | `/en/account/delete` → `POST /api/account/delete-request` |
| Shikoyat qilish (post, izoh, foydalanuvchi) | ✅ | Mobil: post/izoh/muallif menyusi; Veb: post/izoh `ReportModal` |
| Shikoyatlarni moderatsiya qilish | ✅ | Admin → Shikoyatlar (`/api/admin/reports`) |
| Foydalanuvchini bloklash | ✅ | Sozlamalar → Maxfiylik → Bloklanganlar |
| Hisob o'chirish so'rovlarini boshqarish | ✅ | Admin → Hisob o'chirish so'rovlari (`/api/admin/account-deletions`) |
| Ma'lumotlarni eksport qilish | ✅ | Sozlamalar → Tizim → Eksport (JSON) |
| Release imzolash majburiyati (debug AAB rad etiladi) | ✅ | `android/app/build.gradle.kts` |
| Cleartext HTTP faqat debug build'da | ✅ | `android/app/src/debug/AndroidManifest.xml` |
| Zaxira nusxalashda tokenlar chiqmasligi | ✅ | `android:allowBackup="false"` |
| Faqat `INTERNET` ruxsati (sensitive ruxsatlar yo'q) | ✅ | `android/app/src/main/AndroidManifest.xml` |

## 2. Play Console'da qo'lda bajariladi

### 2.1. Ilova ma'lumotlari (App content)

1. **Privacy policy** — `https://www.geters.uz/en/privacy` (yoki `https://www.geters.uz/privacy` — avtomatik ingliz tiliga yo'naltiradi)
2. **Account deletion** — `https://www.geters.uz/en/account/delete` (yoki `https://www.geters.uz/account/delete`)
   (Play talabi: login talab qilmaydigan veb-havola)
3. **Data safety** — quyidagilarni deklaratsiya qilish:
   - Collected: name, email, phone, user IDs, photos, messages, other
     user-generated content, app interactions, crash logs, device or other IDs,
     purchase history.
   - Shared: Google (Sign-In, Play Billing), RevenueCat (subscription status),
     push provayder (device token).
   - Security: TLS orqali shifrlangan, hisobni o'chirish imkoniyati bor.
   - Data deletion: "Users can request data deletion" + yuqoridagi havola.
4. **Content rating (IARC)** — UGC, foydalanuvchilar o'zaro muloqoti,
   foydalanuvchi kontenti ulashilishini belgilash. Taqiqlangan toifalar yo'q.
5. **Ads** — "No ads" (hozircha reklama yo'q).
6. **App access** — UGC ilova bo'lgani uchun tekshiruvchiga test hisob
   (login/parol) bering va moderatsiya qanday ishlashini qisqa izohda yozing.
7. **Target audience** — 13+ (bolalar uchun emas). "Designed for Families"
   dasturiga kirmang.
8. **Child safety standards** — `https://www.geters.uz/en/child-safety`
   (Play Console "Child safety standards" maydoni).
9. **Government apps / Financial features / Health** — tegishli emas.

### 2.2. Texnik talablar

1. **Target API level** — 2026-yil 31-avgustdan boshlab yangi ilova va
   yangilanishlar **API 36 (Android 16)** ni nishonlashi shart. Flutter
   versiyasi `targetSdkVersion` ni tekshiring:
   `flutter build appbundle` oldidan `android/app/build.gradle.kts` da
   `targetSdk = 36` va `compileSdk = 36` ekaniga ishonch hosil qiling
   (Flutter 3.35+ odatda 35–36 beradi; SDK o'rnatilgan bo'lishi kerak).
2. **16 KB page size** — Android 15+ qurilmalar uchun native kutubxonalar
   16 KB sahifa o'lchamini qo'llashi kerak (talab 2025-yil noyabrdan).
   Flutter 3.29+ buni qo'llaydi; `flutter build appbundle`dan keyin
   `bundletool` yoki Play Console pre-launch report orqali tekshiring.
3. **Release AAB** — `android/key.properties` to'ldirilgan bo'lishi shart
   (`mobile/scripts/generate_keystore.sh`). Kalitni yo'qotmang: Play App
   Signing yoqilgan bo'lsa ham upload kaliti kerak bo'ladi.
4. **Version code** — har bir yuklashda `pubspec.yaml` dagi `+N` ni oshiring.
5. **Pre-launch report** — Play Console'dagi reportda crash va API
   xatoliklarini tekshiring.
6. **API manzili** — release build `API_BASE_URL` bilan qurilishi shart
   (kod `ApiConstants.assertConfiguredForRelease()` orqali majburlaydi).

### 2.3. Do'kon sahifasi (Store listing)

- Ilova nomi: **Geters**
- Qisqa tavsif (80 belgi) va to'liq tavsif.
- Kamida 2 ta telefon skrinshoti (ilova ichidan), 512×512 ikonka,
  1024×500 feature graphic.
- Aloqa emaili: `support@thegogetters.uz`
- Maxfiylik siyosati va hisobni o'chirish havolalari.

## 3. Moderatsiya jarayoni (Play UGC talabi)

1. Foydalanuvchi post/izoh/muallif menyusidan **Shikoyat qilish**ni tanlaydi.
2. So'rov `reports` jadvaliga tushadi va **Admin → Shikoyatlar**da ko'rinadi.
3. Moderator 24 soat ichida:
   - «Kontentni o'chirish» — qoidabuzar post/izohni o'chiradi;
   - «Hisobni bloklash» — foydalanuvchini bloklaydi (`isDeactivated`);
   - «Bekor qilish» — shikoyatni asossiz deb yopadi.
4. Bolalar xavfsizligiga oid shikoyatlar ustuvor ko'rib chiqiladi va
   tasdiqlansa vakolatli organlarga xabar qilinadi.

## 4. Hisobni o'chirish oqimi

- **Ilova ichida:** Profil → Sozlamalar → «Hisobni butunlay o'chirish»
  (darhol, `DELETE /api/settings/account`).
- **Veb orqali (loginsiz):** `/en/account/delete` → so'rov yuboriladi →
  Admin → «Hisob o'chirish so'rovlari» → tasdiqlash → hisob va bog'liq
  ma'lumotlar o'chiriladi (30 kun ichida bajarilishi e'lon qilinadi).
- O'chiriladigan ma'lumotlar: hisob, profil, postlar, izohlar, layklar,
  saqlanganlar, obunalar, xabarlar, qurilma tokenlari.
