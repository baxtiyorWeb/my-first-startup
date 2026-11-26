import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "../..");

function loadTsCjs(relPath, customRequire = require) {
  const fullPath = path.join(WEB_ROOT, relPath);
  const source = fs.readFileSync(fullPath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const mod = { exports: {} };
  const fn = new vm.Script(
    `(function(exports, require, module, __filename, __dirname) { ${outputText}\n })`,
    { filename: fullPath }
  ).runInThisContext();
  fn(mod.exports, customRequire, mod, fullPath, path.dirname(fullPath));
  return mod.exports;
}

const errorsMod = loadTsCjs("server/common/errors.ts");
const normalizer = loadTsCjs("server/modules/tags/tag-normalizer.ts", (spec) => {
  if (spec.endsWith("/errors") || spec === "../../common/errors") {
    return errorsMod;
  }
  return require(spec);
});

const { cleanTagDisplay, foldTagKey, normalizeSearchQuery, validateTagInput, assertValidTagInput } =
  normalizer;

test("cleanTagDisplay removes leading hashes, zero-width chars, extra whitespace, and unifies Uzbek apostrophes", () => {
  assert.equal(cleanTagDisplay("  ###O‘zbekiston \u200B Tech  "), "O'zbekiston Tech");
  assert.equal(cleanTagDisplay("Gʻayratʻjon"), "G'ayrat'jon");
});

test("foldTagKey unifies Latin apostrophes, Uzbek/Russian Cyrillic, Turkish I, and tech symbols", () => {
  const variants = ["O'zbekiston", "O‘zbekiston", "Oʻzbekiston", "Ozbekiston", "Ўзбекистон"];
  const folded = variants.map((v) => foldTagKey(v));
  for (const item of folded) {
    assert.deepEqual(item, { normalizedName: "ozbekiston", slug: "ozbekiston" });
  }

  assert.deepEqual(foldTagKey("Дастурлаш"), { normalizedName: "dasturlash", slug: "dasturlash" });
  assert.deepEqual(foldTagKey("İstanbul"), { normalizedName: "istanbul", slug: "istanbul" });
  assert.deepEqual(foldTagKey("Next.js"), { normalizedName: "nextjs", slug: "nextjs" });
  assert.deepEqual(foldTagKey("nextjs"), { normalizedName: "nextjs", slug: "nextjs" });
  assert.deepEqual(foldTagKey("C++"), { normalizedName: "cpp", slug: "cpp" });
  assert.deepEqual(foldTagKey("C#"), { normalizedName: "csharp", slug: "csharp" });
  assert.deepEqual(foldTagKey(".NET"), { normalizedName: "dotnet", slug: "dotnet" });
  assert.equal(normalizeSearchQuery("Sun’iy Intellekt"), "suniy intellekt");
});

test("validateTagInput accepts valid technical and Uzbek tags while rejecting spam, URLs, digits-only, and blocked terms", () => {
  const ok1 = validateTagInput("Sun'iy intellekt");
  assert.equal(ok1.valid, true);
  assert.equal(ok1.parts.slug, "suniy-intellekt");

  const ok2 = validateTagInput("C++");
  assert.equal(ok2.valid, true);
  assert.equal(ok2.parts.slug, "cpp");

  const ok3 = validateTagInput("C#");
  assert.equal(ok3.valid, true);
  assert.equal(ok3.parts.slug, "csharp");

  const rejected = [
    "a",
    "a+",
    "#",
    "x".repeat(45),
    "<script>",
    "https://t.me/channel",
    "spam.uz",
    "@myhandle",
    "123456",
    "aaaaa",
    "1xbet",
    "Qimor-Club",
  ];
  for (const bad of rejected) {
    const res = validateTagInput(bad);
    assert.equal(res.valid, false, `Expected '${bad}' to be rejected`);
  }

  assert.throws(
    () => assertValidTagInput("https://spam.com"),
    (err) => err instanceof errorsMod.AppError && err.statusCode === 400
  );
});

test("Postgres tags table handles concurrent ON CONFLICT DO NOTHING inserts safely", async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip("DATABASE_URL not set in current env");
    return;
  }

  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const slug = `zz-conc-tag-${Date.now()}`;
  const norm = slug.replace(/-/g, " ");

  try {
    await Promise.all(
      Array.from({ length: 6 }, (_, idx) =>
        pool.query(
          `INSERT INTO tags (name, normalized_name, slug, status)
           VALUES ($1, $2, $3, 'active')
           ON CONFLICT DO NOTHING`,
          [`Concurrency Tag ${idx}`, norm, slug]
        )
      )
    );

    const rows = await pool.query(
      "SELECT id, slug FROM tags WHERE slug = $1",
      [slug]
    );
    assert.equal(rows.rowCount, 1);
    assert.equal(rows.rows[0].slug, slug);
  } finally {
    await pool.query("DELETE FROM tags WHERE slug = $1", [slug]).catch(() => {});
    await pool.end();
  }
});
