import assert from "node:assert/strict";
import test from "node:test";
import { previewFromHtml, vimeoOembedTarget } from "./bookmark-preview.mjs";

test("extracts Open Graph bookmark preview metadata", () => {
  const preview = previewFromHtml(`
    <html><head>
      <meta property="og:title" content="A &amp; B">
      <meta content="Preview description" property="og:description">
      <meta property="og:image" content="https://cdn.example.com/preview.jpg">
      <meta property="og:site_name" content="Example Studio">
    </head></html>
  `, "https://example.com/work");
  assert.deepEqual(preview, {
    title: "A & B",
    description: "Preview description",
    imageUrl: "https://cdn.example.com/preview.jpg",
    siteName: "Example Studio"
  });
});

test("falls back to the document title and hostname", () => {
  const preview = previewFromHtml("<title>Fallback title</title>", "https://www.example.com/work");
  assert.equal(preview.title, "Fallback title");
  assert.equal(preview.siteName, "example.com");
});

test("normalizes Vimeo showcase links for oEmbed", () => {
  assert.equal(
    vimeoOembedTarget("https://vimeo.com/showcase/masterfilm?video=1019677121"),
    "https://vimeo.com/1019677121"
  );
});

test("resolves protocol-relative preview images and removes Bilibili thumbnail cropping", () => {
  const preview = previewFromHtml(
    '<meta property="og:image" content="//i2.hdslb.com/bfs/archive/cover.jpg@100w_100h_1c.png">',
    "https://www.bilibili.com/video/BV123"
  );
  assert.equal(preview.imageUrl, "https://i2.hdslb.com/bfs/archive/cover.jpg");
});
