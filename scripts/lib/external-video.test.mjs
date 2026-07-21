import assert from "node:assert/strict";
import test from "node:test";
import { externalVideoInfo } from "./external-video.mjs";

test("normalizes supported hosted video URLs", () => {
  assert.equal(externalVideoInfo("https://vimeo.com/699501120")?.embedUrl, "https://player.vimeo.com/video/699501120");
  assert.equal(externalVideoInfo("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.embedUrl, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(externalVideoInfo("https://youtu.be/dQw4w9WgXcQ")?.provider, "youtube");
  assert.equal(
    externalVideoInfo("https://www.bilibili.com/video/BV1Yy4y1L7Ca")?.embedUrl,
    "https://player.bilibili.com/player.html?bvid=BV1Yy4y1L7Ca&high_quality=1&danmaku=0"
  );
});

test("does not classify direct files or unrelated pages as hosted video", () => {
  assert.equal(externalVideoInfo("https://cdn.example.com/video.mp4"), null);
  assert.equal(externalVideoInfo("https://example.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(externalVideoInfo("not-a-url"), null);
});
