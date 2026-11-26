#!/usr/bin/env bash
# Imzolangan release AAB yig'adi: keystore va API_BASE_URL ikkalasi ham
# tekshiriladi, noto'g'ri konfiguratsiya bilan artifact yaratilmaydi.
#
#   ./scripts/build_release.sh                     # config/prod.json
#   ./scripts/build_release.sh config/staging.json # boshqa muhit
set -euo pipefail

cd "$(dirname "$0")/.."

CONFIG="${1:-config/prod.json}"

if [[ ! -f "$CONFIG" ]]; then
  echo "xato: '$CONFIG' topilmadi."
  echo "      Nusxa oling: cp config/prod.example.json config/prod.json"
  echo "      So'ng API_BASE_URL ni production manziliga o'zgartiring."
  exit 1
fi

API_URL=$(sed -n 's/.*"API_BASE_URL"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$CONFIG" | head -1)

if [[ -z "$API_URL" ]]; then
  echo "xato: $CONFIG ichida API_BASE_URL topilmadi."
  exit 1
fi

case "$API_URL" in
  *127.0.0.1*|*10.0.2.2*|*localhost*|*192.168.*)
    echo "xato: API_BASE_URL lokal manzilga ishora qilyapti: $API_URL"
    echo "      Release build production API manzilini talab qiladi."
    exit 1
    ;;
  https://*) ;;
  *)
    echo "ogohlantirish: API_BASE_URL HTTPS emas ($API_URL)."
    echo "               Android productionda cleartext HTTP bloklaydi."
    ;;
esac

case "$API_URL" in
  */) echo "xato: API_BASE_URL oxirida '/' bo'lmasligi kerak: $API_URL"; exit 1 ;;
esac

if [[ ! -f android/key.properties ]]; then
  echo "xato: android/key.properties yo'q."
  echo "      Avval: ./scripts/generate_keystore.sh"
  exit 1
fi

echo "Muhit:        $CONFIG"
echo "API_BASE_URL: $API_URL"
echo "Keystore:     android/key.properties"
echo

flutter pub get
flutter build appbundle --release --dart-define-from-file="$CONFIG"

echo
echo "Tayyor: build/app/outputs/bundle/release/app-release.aab"
echo "Keyingi qadam: Play Console'ga yuklang va versiyani pubspec.yaml da oshiring."
