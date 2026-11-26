#!/usr/bin/env bash
# Android release keystore va android/key.properties faylini yaratadi.
# Bir marta ishga tushiriladi; natijani xavfsiz joyda zaxiralang.
set -euo pipefail

cd "$(dirname "$0")/.."

KEYSTORE_FILE="android/app/upload-keystore.jks"
KEY_PROPERTIES="android/key.properties"
ALIAS="${KEY_ALIAS:-upload}"

if [[ -f "$KEY_PROPERTIES" ]]; then
  echo "xato: $KEY_PROPERTIES allaqachon mavjud."
  echo "      Almashtirmoqchi bo'lsangiz, avval uni qo'lda ko'chirib oling."
  exit 1
fi

if [[ -f "$KEYSTORE_FILE" ]]; then
  echo "xato: $KEYSTORE_FILE allaqachon mavjud."
  exit 1
fi

if ! command -v keytool >/dev/null 2>&1; then
  echo "xato: keytool topilmadi. JDK o'rnating (masalan: sudo apt install default-jdk)."
  exit 1
fi

read -r -p "Kalit egasi (CN, masalan: Geters): " CN
read -r -s -p "Keystore paroli (kamida 6 belgi): " STORE_PASS; echo
read -r -s -p "Parolni takrorlang: " STORE_PASS2; echo

if [[ "$STORE_PASS" != "$STORE_PASS2" ]]; then
  echo "xato: parollar mos kelmadi."
  exit 1
fi

if [[ ${#STORE_PASS} -lt 6 ]]; then
  echo "xato: parol kamida 6 belgidan iborat bo'lishi kerak."
  exit 1
fi

umask 077

keytool -genkeypair -v \
  -keystore "$KEYSTORE_FILE" \
  -storetype JKS \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias "$ALIAS" \
  -storepass "$STORE_PASS" \
  -keypass "$STORE_PASS" \
  -dname "CN=${CN:-Geters}, OU=Mobile, O=Geters, L=Tashkent, ST=Tashkent, C=UZ"

cat > "$KEY_PROPERTIES" <<EOF
storePassword=$STORE_PASS
keyPassword=$STORE_PASS
keyAlias=$ALIAS
storeFile=upload-keystore.jks
EOF

chmod 600 "$KEY_PROPERTIES"

echo
echo "Tayyor:"
echo "  keystore:       $KEYSTORE_FILE"
echo "  credentials:    $KEY_PROPERTIES"
echo
echo "MUHIM: ikkala faylni ham hech qachon git'ga qo'shmang."
echo "Keystore yo'qolsa, Play'dagi ilovaga boshqa yangilanish chiqara olmaysiz."
echo "Zaxira nusxasini parol menejerida yoki shifrlangan diskda saqlang."
