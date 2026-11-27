const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const assets = [...html.matchAll(/<(script|link)\b([^>]+)>/g)]
  .map(([, tag, attributes]) => {
    const url = attributes.match(/\b(?:src|href)="([^"]+)"/)?.[1];
    return { tag, url, stylesheet: /\brel="stylesheet"/.test(attributes) };
  })
  .filter(({ tag, stylesheet, url }) => url && (tag === "script" || stylesheet))
  .filter(({ url }) => !/^(?:https?:)?\/\//.test(url));

test("every production script and stylesheet exists with the exact filename", () => {
  for (const { url } of assets) {
    const filename = path.resolve(root, url.split(/[?#]/)[0].replace(/^\//, ""));
    assert.ok(filename.startsWith(root + path.sep), url);
    assert.ok(fs.statSync(filename).isFile(), `Missing asset: ${url}`);
    assert.ok(fs.readdirSync(path.dirname(filename)).includes(path.basename(filename)), url);
    assert.doesNotMatch(url, /^(?:\/?)(?:tmp|tests|dist)\//);
  }
});

test("classic scripts compile together in production load order", () => {
  const source = assets.filter(({ tag }) => tag === "script")
    .map(({ url }) => fs.readFileSync(path.join(root, url.split(/[?#]/)[0]), "utf8"))
    .join("\n;\n");
  assert.doesNotThrow(() => new vm.Script(source, { filename: "production-scripts.js" }));
});

test("archive stylesheet retains its position in the cascade", () => {
  const styles = assets.filter(({ stylesheet }) => stylesheet).map(({ url }) => url.split("?")[0]);
  assert.deepEqual(styles, ["styles.css", "archive.css", "series/styles/series.css", "series/styles/responsive-detail.css", "series/styles/desktop-detail.css", "analytics.css", "save-profile-tabs.css", "schedule-export.css", "couple-overview.css"]);
  assert.doesNotMatch(html, /<style\b/);
});
