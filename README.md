# Geters (my-first-startup) Monorepo

Geters platformasi uchun monorepo loyiha tuzilmasi.

## Loyiha tuzilmasi

```
my-first-startup/
├── web/          # Next.js 16 Web ilovasi (App Router, Tailwind CSS, Drizzle ORM)
├── mobile/       # Mobil ilova (React Native / Flutter / Expo — keyinroq qo'shiladi)
├── package.json  # Monorepo asosiy boshqaruv skriptlari
└── README.md
```

## Ishga tushirish (Web)

Ilovani ildiz (root) papkadan yoki to'g'ridan-to'g'ri `web` papkasidan ishga tushirishingiz mumkin:

```bash
# Ildiz papkadan:
npm run dev

# Yoki web papkasiga o'tib:
cd web
npm run dev
```

Brauzerda: [http://localhost:3000](http://localhost:3000)

## Build qilish

```bash
# Ildiz papkadan:
npm run build

# Yoki web papkasida:
cd web
npm run build
```
