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

function loadTsCjs(relPath) {
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
  fn(mod.exports, require, mod, fullPath, path.dirname(fullPath));
  return mod.exports;
}

const { buildCommentTree } = loadTsCjs("server/modules/comments/comment-tree.ts");

function row(id, parentId, createdAtMs = 0) {
  return {
    id,
    postId: "post-1",
    parentId,
    content: `content-${id}`,
    likesCount: 0,
    createdAt: new Date(1_700_000_000_000 + createdAtMs),
    authorId: `author-${id}`,
    authorName: `Name ${id}`,
    authorHandle: `@${id}`,
    authorRole: "Go-getter",
    authorAvatarUrl: null,
    authorVerified: false,
    isLiked: false,
  };
}

test("buildCommentTree keeps replies nested at arbitrary depth", () => {
  const tree = buildCommentTree([
    row("a", null, 0),
    row("b", "a", 1),
    row("c", "b", 2),
    row("d", "c", 3),
  ]);

  assert.equal(tree.length, 1, "only the root is top level");
  const a = tree[0];
  assert.equal(a.id, "a");
  assert.equal(a.replies.length, 1);
  const b = a.replies[0];
  const c = b.replies[0];
  const d = c.replies[0];
  assert.deepEqual([b.id, c.id, d.id], ["b", "c", "d"]);
  assert.equal(d.replies.length, 0);
});

test("buildCommentTree promotes replies whose parent is gone instead of dropping them", () => {
  const tree = buildCommentTree([row("a", null, 0), row("orphan", "missing-parent", 1)]);

  assert.equal(tree.length, 2);
  assert.deepEqual(
    tree.map((n) => n.id),
    ["a", "orphan"]
  );
  assert.equal(tree[1].parentId, null);
});

test("buildCommentTree preserves chronological ordering of roots", () => {
  const tree = buildCommentTree([
    row("first", null, 0),
    row("second", null, 1),
    row("third", null, 2),
  ]);

  assert.deepEqual(
    tree.map((n) => n.id),
    ["first", "second", "third"]
  );
});

test("buildCommentTree never drops rows when parent references form a cycle", () => {
  const tree = buildCommentTree([row("x", "y", 0), row("y", "x", 1)]);

  const ids = tree.map((n) => n.id).sort();
  assert.deepEqual(ids, ["x", "y"]);
  for (const node of tree) {
    assert.equal(node.replies.length, 0, "cyclic nodes are flattened to avoid infinite render");
  }
});

test("buildCommentTree returns an empty list for no comments", () => {
  assert.deepEqual(buildCommentTree([]), []);
});
