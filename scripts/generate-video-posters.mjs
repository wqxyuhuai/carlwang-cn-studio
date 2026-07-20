import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import OSS from "ali-oss";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";
import sharp from "sharp";
import { configureProxyFromEnv } from "./lib/proxy.mjs";
import { revalidatePublicContent } from "./lib/revalidate-public-content.mjs";

const ENV_PATH = path.resolve(".env.local");
const DEFAULT_CONTENT_KEY = "uploads/admin/site-content.json";
const MAX_VIDEO_BYTES = Number(process.env.VIDEO_POSTER_MAX_BYTES || 250 * 1024 * 1024);
const SAMPLE_COUNT = Math.max(6, Math.min(16, Number(process.env.VIDEO_POSTER_SAMPLE_COUNT || 12)));
const POSTER_MAX_WIDTH = Math.max(640, Number(process.env.VIDEO_POSTER_MAX_WIDTH || 1600));
const DOWNLOAD_TIMEOUT_MS = Number(process.env.VIDEO_POSTER_DOWNLOAD_TIMEOUT_MS || 60000);
const DOWNLOAD_PROGRESS_MS = Number(process.env.VIDEO_POSTER_DOWNLOAD_PROGRESS_MS || 5000);

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

function envValue(...keys) {
  return keys.map((key) => process.env[key]).find(Boolean) || "";
}

function ossConfig() {
  return {
    accessKeyId: envValue("ALIYUN_OSS_ACCESS_KEY_ID", "ALIYUN_ACCESS_KEY_ID"),
    accessKeySecret: envValue("ALIYUN_OSS_ACCESS_KEY_SECRET", "ALIYUN_ACCESS_KEY_SECRET"),
    bucket: envValue("ALIYUN_OSS_BUCKET"),
    endpoint: envValue("ALIYUN_OSS_ENDPOINT"),
    region: envValue("ALIYUN_OSS_REGION"),
    publicBaseUrl: envValue("ALIYUN_OSS_PUBLIC_BASE_URL").replace(/\/+$/g, ""),
    uploadPrefix: (envValue("ALIYUN_OSS_UPLOAD_PREFIX", "ALIYUN_OSS_DIR") || "uploads/admin").replace(/^\/+|\/+$/g, ""),
    contentKey: envValue("ALIYUN_OSS_CONTENT_KEY") || DEFAULT_CONTENT_KEY
  };
}

function requiredConfig(config) {
  return [
    ["ALIYUN_ACCESS_KEY_ID or ALIYUN_OSS_ACCESS_KEY_ID", config.accessKeyId],
    ["ALIYUN_ACCESS_KEY_SECRET or ALIYUN_OSS_ACCESS_KEY_SECRET", config.accessKeySecret],
    ["ALIYUN_OSS_BUCKET", config.bucket],
    ["ALIYUN_OSS_REGION or ALIYUN_OSS_ENDPOINT", config.region || config.endpoint],
    ["ALIYUN_OSS_PUBLIC_BASE_URL", config.publicBaseUrl]
  ].filter(([, value]) => !value).map(([key]) => key);
}

function createClient(config) {
  return new OSS({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    bucket: config.bucket,
    endpoint: config.endpoint || undefined,
    region: config.region || undefined
  });
}

function slugify(value, fallback = "project") {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || fallback;
}

function publicUrl(config, key) {
  return `${config.publicBaseUrl}/${key.replace(/^\/+/, "")}`;
}

function contentKeyFor(config, slug) {
  return `${config.uploadPrefix}/notion-sync/studio-projects/${slugify(slug)}/content.json`;
}

function posterKeyFor(config, slug, source) {
  const hash = createHash("sha256").update(source).digest("hex").slice(0, 16);
  return `${config.uploadPrefix}/notion-sync/studio-projects/${slugify(slug)}/posters/${hash}.webp`;
}

function parseArgs() {
  return {
    dryRun: process.argv.includes("--dry-run"),
    help: process.argv.includes("--help") || process.argv.includes("-h"),
    skipPublish: process.argv.includes("--skip-publish"),
    slug: process.argv.find((item) => item.startsWith("--slug="))?.slice("--slug=".length) || ""
  };
}

function printUsage() {
  console.log("Usage: npm run content:generate-video-posters -- [--dry-run] [--skip-publish] [--slug=<project-slug>]");
  console.log("  --dry-run       Analyze and select frames without uploading posters or updating content JSON.");
  console.log("  --skip-publish  Skip the initial Notion-to-OSS project content publish step.");
  console.log("  --slug          Process one published project only.");
}

function run(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`${label}: ${result.stderr || result.stdout || `exit ${result.status}`}`.trim());
  }
  return result.stdout || "";
}

function probeDuration(videoPath) {
  const output = run(ffprobe.path, ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", videoPath], "ffprobe failed");
  const duration = Number.parseFloat(output.trim());
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("video duration is unavailable");
  return duration;
}

function sampleTimes(duration) {
  const start = duration > 12 ? Math.max(1.5, duration * 0.07) : duration * 0.12;
  const end = duration > 12 ? duration * 0.9 : duration * 0.84;
  const span = Math.max(0.1, end - start);
  return Array.from({ length: SAMPLE_COUNT }, (_, index) => start + span * ((index + 0.5) / SAMPLE_COUNT));
}

function extractFrame(videoPath, time, outputPath, width) {
  run(
    ffmpegPath,
    ["-hide_banner", "-loglevel", "error", "-y", "-ss", time.toFixed(3), "-i", videoPath, "-frames:v", "1", "-vf", `scale='min(${width},iw)':-2`, "-q:v", "3", outputPath],
    "ffmpeg frame extraction failed"
  );
}

async function frameScore(framePath) {
  const { data, info } = await sharp(framePath)
    .resize({ width: 240, withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const luma = new Float32Array(info.width * info.height);
  let total = 0;
  let totalSquared = 0;
  let black = 0;
  let clipped = 0;
  let edge = 0;

  for (let index = 0; index < luma.length; index += 1) {
    const offset = index * info.channels;
    const value = 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];
    luma[index] = value;
    total += value;
    totalSquared += value * value;
    if (value < 18) black += 1;
    if (value > 248) clipped += 1;
    const x = index % info.width;
    if (x > 0) edge += Math.abs(value - luma[index - 1]);
    if (index >= info.width) edge += Math.abs(value - luma[index - info.width]);
  }

  const count = luma.length;
  const mean = total / count;
  const contrast = Math.sqrt(Math.max(0, totalSquared / count - mean * mean));
  const blackRatio = black / count;
  const clippedRatio = clipped / count;
  const edgeEnergy = edge / Math.max(1, count * 2);
  const exposurePenalty = Math.abs(mean - 138) / 138;
  const score = contrast * 0.7 + edgeEnergy * 0.9 + (1 - blackRatio) * 30 + (1 - clippedRatio) * 8 - exposurePenalty * 18;
  return { blackRatio, score };
}

async function choosePosterFrame(videoPath, tempDir) {
  const duration = probeDuration(videoPath);
  let best = null;
  for (const [index, time] of sampleTimes(duration).entries()) {
    const framePath = path.join(tempDir, `candidate-${index}.jpg`);
    try {
      extractFrame(videoPath, time, framePath, 480);
      const quality = await frameScore(framePath);
      if (quality.blackRatio > 0.72) continue;
      if (!best || quality.score > best.score) best = { ...quality, time };
    } catch (error) {
      console.log(`[poster] skipped candidate ${time.toFixed(2)}s: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (!best) throw new Error("no suitable non-black frame found");
  return best;
}

async function downloadVideo(source, destination) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetch(source, { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`download failed ${response.status}`);
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_VIDEO_BYTES) throw new Error(`video exceeds ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB limit`);
    console.log(`[poster] download ${contentLength ? `${Math.round(contentLength / 1024 / 1024)} MB` : "unknown size"} from ${new URL(source).pathname}`);
    const chunks = [];
    let size = 0;
    let lastProgressAt = startedAt;
    if (!response.body?.getReader) {
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > MAX_VIDEO_BYTES) throw new Error(`video exceeds ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB limit`);
      fs.writeFileSync(destination, buffer);
      return;
    }
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      chunks.push(chunk);
      size += chunk.length;
      if (size > MAX_VIDEO_BYTES) throw new Error(`video exceeds ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB limit`);
      const now = Date.now();
      if (now - lastProgressAt >= DOWNLOAD_PROGRESS_MS) {
        const percent = contentLength ? ` ${Math.round(size / contentLength * 100)}%` : "";
        console.log(`[poster] download ${Math.round(size / 1024 / 1024)} MB${percent}`);
        lastProgressAt = now;
      }
    }
    fs.writeFileSync(destination, Buffer.concat(chunks));
  } finally {
    clearTimeout(timeout);
  }
}

function videoBlocks(blocks, result = []) {
  if (!Array.isArray(blocks)) return result;
  for (const block of blocks) {
    if (block?.type === "video" && block.media?.src) result.push(block);
    if (block?.type === "column_list") block.columns?.forEach((column) => videoBlocks(column, result));
    if (block?.type === "toggle") videoBlocks(block.children, result);
  }
  return result;
}

async function readJson(client, key) {
  const result = await client.get(key);
  return JSON.parse(Buffer.from(result.content).toString("utf8"));
}

async function objectExists(client, key) {
  try {
    await client.head(key);
    return true;
  } catch {
    return false;
  }
}

async function publishProjects() {
  const result = spawnSync(process.execPath, ["scripts/publish-oss-content.mjs", "--table=projects"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  });
  if (result.error || result.status !== 0) throw new Error("project content publish failed before poster generation");
}

async function processProject(client, config, work, options, tempRoot) {
  const contentKey = contentKeyFor(config, work.slug);
  const content = await readJson(client, contentKey);
  const videos = videoBlocks(content.blocks);
  if (videos.length === 0) return { generated: 0, skipped: 0, failed: 0 };
  const projectTemp = fs.mkdtempSync(path.join(tempRoot, `${slugify(work.slug)}-`));
  const stats = { generated: 0, skipped: 0, failed: 0 };
  let contentChanged = false;

  try {
    for (const [index, block] of videos.entries()) {
      if (block.media.poster) {
        stats.skipped += 1;
        continue;
      }
      const posterKey = posterKeyFor(config, work.slug, block.media.src);
      const posterUrl = publicUrl(config, posterKey);
      if (await objectExists(client, posterKey)) {
        block.media.poster = posterUrl;
        contentChanged = true;
        stats.skipped += 1;
        continue;
      }
      try {
        const extension = path.extname(new URL(block.media.src).pathname) || ".mp4";
        const videoPath = path.join(projectTemp, `video-${index}${extension}`);
        console.log(`[poster] ${work.slug} video ${index + 1}/${videos.length}: downloading`);
        await downloadVideo(block.media.src, videoPath);
        const selected = await choosePosterFrame(videoPath, projectTemp);
        const framePath = path.join(projectTemp, `poster-${index}.jpg`);
        extractFrame(videoPath, selected.time, framePath, POSTER_MAX_WIDTH);
        const posterBuffer = await sharp(framePath).rotate().webp({ quality: 82, effort: 5 }).toBuffer();
        console.log(`[poster] ${work.slug} selected ${selected.time.toFixed(2)}s, score ${selected.score.toFixed(1)}`);
        if (!options.dryRun) {
          await client.put(posterKey, posterBuffer, {
            headers: {
              "Content-Type": "image/webp",
              "Cache-Control": "public, max-age=31536000, immutable"
            }
          });
          block.media.poster = posterUrl;
          contentChanged = true;
        }
        stats.generated += 1;
      } catch (error) {
        stats.failed += 1;
        console.log(`[poster] ${work.slug} video ${index + 1} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (!options.dryRun && contentChanged) {
      content.updatedAt = new Date().toISOString();
      await client.put(contentKey, Buffer.from(`${JSON.stringify(content, null, 2)}\n`, "utf8"), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=300"
        }
      });
    }
  } finally {
    fs.rmSync(projectTemp, { recursive: true, force: true });
  }
  return stats;
}

async function main() {
  loadEnv(ENV_PATH);
  configureProxyFromEnv();
  const options = parseArgs();
  if (options.help) {
    printUsage();
    return;
  }
  const config = ossConfig();
  const missing = requiredConfig(config);
  if (missing.length) throw new Error(`Missing env: ${missing.join(", ")}`);
  if (!ffmpegPath || !ffprobe.path) throw new Error("Bundled ffmpeg or ffprobe is unavailable. Run npm install first.");

  console.log(`[poster] start dryRun=${options.dryRun} skipPublish=${options.skipPublish} slug=${options.slug || "all"}`);

  if (!options.dryRun && !options.skipPublish) await publishProjects();

  const client = createClient(config);
  const index = await readJson(client, config.contentKey);
  const works = (Array.isArray(index.works) ? index.works : []).filter((work) => !options.slug || work.slug === options.slug);
  if (works.length === 0) throw new Error(options.slug ? `No published project found for slug: ${options.slug}` : "No published projects found");
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "carlwang-video-posters-"));
  const total = { generated: 0, skipped: 0, failed: 0 };
  try {
    for (const work of works) {
      const stats = await processProject(client, config, work, options, tempRoot);
      total.generated += stats.generated;
      total.skipped += stats.skipped;
      total.failed += stats.failed;
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  console.log(`[poster] complete generated=${total.generated} skipped=${total.skipped} failed=${total.failed}${options.dryRun ? " dryRun=true" : ""}`);
  if (!options.dryRun && total.generated > 0) await revalidatePublicContent("poster");
  if (!options.dryRun && total.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
