/**
 * Uzbek Latin to Cyrillic Transliteration Engine
 * Converts Uzbek text in Latin script to official Uzbek Cyrillic script
 */

const DIGRAPHS: [RegExp, string][] = [
  [/Sh/g, "Ш"],
  [/SH/g, "Ш"],
  [/sh/g, "ш"],
  [/Ch/g, "Ч"],
  [/CH/g, "Ч"],
  [/ch/g, "ч"],
  [/O['`‘ʼ’]/g, "Ў"],
  [/o['`‘ʼ’]/g, "ў"],
  [/G['`‘ʼ’]/g, "Ғ"],
  [/g['`‘ʼ’]/g, "ғ"],
  [/Yo/g, "Ё"],
  [/YO/g, "Ё"],
  [/yo/g, "ё"],
  [/Yu/g, "Ю"],
  [/YU/g, "Ю"],
  [/yu/g, "ю"],
  [/Ya/g, "Я"],
  [/YA/g, "Я"],
  [/ya/g, "я"],
  [/Ye/g, "Е"],
  [/YE/g, "Е"],
  [/ye/g, "е"],
];

const SINGLE_CHARS: Record<string, string> = {
  A: "А", a: "а",
  B: "Б", b: "б",
  D: "Д", d: "д",
  E: "Э", e: "е",
  F: "Ф", f: "ф",
  G: "Г", g: "г",
  H: "Ҳ", h: "ҳ",
  I: "И", i: "и",
  J: "Ж", j: "ж",
  K: "К", k: "к",
  L: "Л", l: "л",
  M: "М", m: "м",
  N: "Н", n: "н",
  O: "О", o: "о",
  P: "П", p: "п",
  Q: "Қ", q: "қ",
  R: "Р", r: "р",
  S: "С", s: "с",
  T: "Т", t: "т",
  U: "У", u: "у",
  V: "В", v: "в",
  X: "Х", x: "х",
  Y: "Й", y: "й",
  Z: "З", z: "з",
};

export function latinToCyrillic(text: string): string {
  if (!text) return text;

  let result = text;

  // 1. Replace multi-character digraphs first
  for (const [pattern, replacement] of DIGRAPHS) {
    result = result.replace(pattern, replacement);
  }

  // 2. Replace single letters
  let out = "";
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    out += SINGLE_CHARS[char] ?? char;
  }

  return out;
}
