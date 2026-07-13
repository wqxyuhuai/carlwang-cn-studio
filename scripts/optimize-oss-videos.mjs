import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import OSS from "ali-oss";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

const ENV_PATH = path.resolve(".env.local");
const DEFAULT_CONTENT_KEY = "uploads/admin/site-content.json";
const OSS_OPERATION_TIMEOUT_MS = Number(process.env.OSS_OPERATION_TIMEOUT_MS || 60000);
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v"];

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

function envValue(...keys) {
  for (const key of keys) {
    if (process.env[key]) return process.env[key];
  }
  return "";
}

function argValue(name) {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`))?.split("=").slice(1).join("=") || "";
  if (arg) return arg;
  return process.env[`npm_config_${name.replace(/-/g, "_")}`] || "";
}

function hasArg(name) {
  if (process.argv.includes(`--${name}`)) return true;
  const value = process.env[`npm_config_${name.replace(/-/g, "_")}`];
  return value === "true" || value === "1";
}

function getOssConfig() {
  return {
    accessKeyId: envValue("ALIYUN_OSS_ACCESS_KEY_ID", "ALIYUN_ACCESS_KEY_ID"),
    accessKeySecret: envValue("ALIYUN_OSS_ACCESS_KEY_SECRET", "ALIYUN_ACCESS_KEY_SECRET"),
    region: envValue("ALIYUN_OSS_REGION"),
    endpoint: envValue("ALIYUN_OSS_ENDPOINT"),
    bucket: envValue("ALIYUN_OSS_BUCKET"),
    publicBaseUrl: envValue("ALIYUN_OSS_PUBLIC_BASE_URL"),
    contentKey: envValue("ALIYUN_OSS_CONTENT_KEY") || DEFAULT_CONTENT_KEY
  };
}

function requiredEnv() {
  const oss = getOssConfig();
  return [
    ["ALIYUN_ACCESS_KEY_ID or ALIYUN_OSS_ACCESS_KEY_ID", Boolean(oss.accessKeyId)],
    ["ALIYUN_ACCESS_KEY_SECRET or ALIYUN_OSS_ACCESS_KEY_SECRET", Boolean(oss.accessKeySecret)],
    ["ALIYUN_OSS_BUCKET", Boolean(oss.bucket)],
    ["ALIYUN_OSS_REGION or ALIYUN_OSS_ENDPOINT", Boolean(oss.region || oss.endpoint)],
    ["ALIYUN_OSS_PUBLIC_BASE_URL", Boolean(oss.publicBaseUrl)]
  ];
}

function createOssClient() {
  const config = getOssConfig();
  return new OSS({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    bucket: config.bucket,
    endpoint: config.endpoint || undefined,
    region: config.region || undefined
  });
}

function publicUrlForObject(objectKey) {
  return `${getOssConfig().publicBaseUrl.replace(/\/+$/g, "")}/${objectKey}`;
}

function objectKeyFromOssUrl(url) {
  const base = getOssConfig().publicBaseUrl.replace(/\/+$/g, "");
  if (!base || typeof url !== "string" || !url.startsWith(`${base}/`)) return "";
  return decodeURIComponent(url.slice(base.length + 1));
}

function optimizedVideoObjectKeyFor(objectKey) {
  const directory = path.posix.dirname(objectKey);
  const extension = path.posix.extname(objectKey);
  const baseName = path.posix.basename(objectKey, extension).replace(/-optimized$/i, "");
  return `${directory}/${baseName}-optimized.mp4`;
}

function originalVideoObjectKeyFor(objectKey) {
  const directory = path.posix.dirname(objectKey);
  const extension = path.posix.extname(objectKey);
  const baseName = path.posix.basename(objectKey, extension).replace(/-optimized$/i, "");
  return `${directory}/${baseName}.mp4`;
}

function looksLikeVideoObjectKey(objectKey = "") {
  const extension = path.posix.extname(objectKey.split("?")[0]).toLowerCase();
  return VIDEO_EXTENSIONS.includes(extension);
}

function isOptimizedVideoObjectKey(objectKey = "") {
  return objectKey.toLowerCase().endsWith("-optimized.mp4");
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size >= 10 || unit === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unit]}`;
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

async function withTimeout(promise, label, timeoutMs = OSS_OPERATION_TIMEOUT_MS) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getJsonObject(client, objectKey) {
  console.log(`[content] read ${objectKey}`);
  const result = await withTimeout(client.get(objectKey), `read ${objectKey}`);
  const text = Buffer.isBuffer(result.content) ? result.content.toString("utf8") : String(result.content || "{}");
  return JSON.parse(text);
}

async function putJsonObject(client, objectKey, value, dryRun) {
  if (dryRun) return;
  const body = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  await withTimeout(client.put(objectKey, body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60"
    }
  }), `write ${objectKey}`);
}

async function objectExists(client, objectKey) {
  try {
    await withTimeout(client.head(objectKey), `head ${objectKey}`);
    return true;
  } catch {
    return false;
  }
}

async function objectSize(client, objectKey) {
  const head = await withTimeout(client.head(objectKey), `head ${objectKey}`);
  return Number(head.res?.headers?.["content-length"] || head.res?.headers?.["Content-Length"] || 0);
}

function collectOssUrlRefs(root, label, markChanged) {
  const refs = [];
  const seen = new WeakSet();

  function walk(value, trail, parent, key) {
    if (typeof value === "string") {
      const objectKey = objectKeyFromOssUrl(value);
      if (objectKey) {
        refs.push({
          label: `${label}${trail ? `.${trail}` : ""}`,
          url: value,
          objectKey,
          set(nextUrl) {
            parent[key] = nextUrl;
            markChanged();
          }
        });
      }
      return;
    }
    if (!value || typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);

    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${trail}[${index}]`, value, index));
      return;
    }
    for (const [childKey, childValue] of Object.entries(value)) {
      walk(childValue, trail ? `${trail}.${childKey}` : childKey, value, childKey);
    }
  }

  walk(root, "", null, "");
  return refs;
}

function isProjectContentUrl(url) {
  const objectKey = objectKeyFromOssUrl(url);
  return Boolean(objectKey && objectKey.endsWith("/content.json") && objectKey.includes("/studio-projects/"));
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], ...options });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      const text = chunk.toString();
      const progress = text.match(/time=([0-9:.]+)/)?.[1];
      if (progress) console.log(`[ffmpeg] time=${progress}`);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${path.basename(command)} exited ${code}: ${stderr.slice(-1200)}`));
    });
  });
}

async function probeVideo(filePath) {
  const probePath = ffprobeStatic.path;
  const { stdout } = await runProcess(probePath, [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height,duration",
    "-of", "json",
    filePath
  ]);
  const parsed = JSON.parse(stdout || "{}");
  const stream = parsed.streams?.[0] || {};
  return {
    width: Number(stream.width || 0),
    height: Number(stream.height || 0),
    duration: Number(stream.duration || 0)
  };
}

async function transcodeVideo(inputPath, outputPath, options) {
  const maxWidth = Number(options.maxWidth || 1366);
  const maxHeight = Number(options.maxHeight || 768);
  const crf = Number(options.crf || 28);
  const preset = options.preset || "medium";
  const videoBitrate = options.videoBitrate || "";
  const scale = `scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`;
  const args = [
    "-y",
    "-i", inputPath,
    "-vf", scale,
    "-c:v", "libx264",
    "-preset", preset,
    "-crf", String(crf),
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart"
  ];
  if (options.noAudio) {
    args.push("-an");
  } else {
    args.push("-c:a", "aac", "-b:a", options.audioBitrate || "96k", "-ac", "2");
  }
  if (videoBitrate) args.push("-maxrate", videoBitrate, "-bufsize", videoBitrate);
  args.push(outputPath);
  await runProcess(ffmpegPath, args);
}

async function downloadObjectToFile(client, objectKey, filePath) {
  console.log(`[download] ${objectKey}`);
  const result = await withTimeout(client.get(objectKey), `download ${objectKey}`, Number(process.env.VIDEO_DOWNLOAD_TIMEOUT_MS || 180000));
  const buffer = Buffer.isBuffer(result.content) ? result.content : Buffer.from(result.content || "");
  await fs.promises.writeFile(filePath, buffer);
  return buffer.length;
}

async function optimizeVideoRef(client, ref, options, cache) {
  if (cache.has(ref.url)) return cache.get(ref.url);
  const skipped = (reason) => {
    const result = { nextUrl: ref.url, action: "skipped", reason };
    cache.set(ref.url, result);
    return result;
  };

  if (!looksLikeVideoObjectKey(ref.objectKey)) return skipped("not a video path");
  if (isOptimizedVideoObjectKey(ref.objectKey) && !options.includeOptimized) return skipped("already optimized");

  let sourceObjectKey = ref.objectKey;
  if (isOptimizedVideoObjectKey(ref.objectKey)) {
    const originalObjectKey = originalVideoObjectKeyFor(ref.objectKey);
    if (await objectExists(client, originalObjectKey)) {
      sourceObjectKey = originalObjectKey;
    }
  }
  const optimizedObjectKey = optimizedVideoObjectKeyFor(sourceObjectKey);
  const optimizedUrl = publicUrlForObject(optimizedObjectKey);
  if (!options.force && await objectExists(client, optimizedObjectKey)) {
    const optimizedBytes = await objectSize(client, optimizedObjectKey).catch(() => 0);
    const result = { nextUrl: optimizedUrl, action: "reused", optimizedObjectKey, optimizedBytes };
    cache.set(ref.url, result);
    return result;
  }

  const originalBytes = await objectSize(client, sourceObjectKey);
  if (options.dryRun) {
    const result = { nextUrl: optimizedUrl, action: "would-optimize", optimizedObjectKey, originalBytes };
    cache.set(ref.url, result);
    return result;
  }

  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "cw-video-"));
  const inputPath = path.join(tempDir, path.basename(ref.objectKey));
  const outputPath = path.join(tempDir, "optimized.mp4");
  try {
    await downloadObjectToFile(client, sourceObjectKey, inputPath);
    const before = await probeVideo(inputPath).catch(() => ({}));
    console.log(`[video] ${sourceObjectKey} ${before.width || "?"}x${before.height || "?"} ${formatBytes(originalBytes)}`);
    await transcodeVideo(inputPath, outputPath, options);
    const optimizedBytes = (await fs.promises.stat(outputPath)).size;
    const after = await probeVideo(outputPath).catch(() => ({}));
    const savingRatio = 1 - optimizedBytes / originalBytes;
    if (savingRatio < options.minSavingRatio) {
      return skipped(`saving below threshold ${Math.round(savingRatio * 100)}%`);
    }
    console.log(`[video] upload ${optimizedObjectKey} ${after.width || "?"}x${after.height || "?"} ${formatBytes(optimizedBytes)}`);
    await withTimeout(client.put(optimizedObjectKey, outputPath, {
      headers: {
        "Content-Type": "video/mp4",
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    }), `upload ${optimizedObjectKey}`, Number(process.env.VIDEO_UPLOAD_TIMEOUT_MS || 180000));
    const result = {
      nextUrl: optimizedUrl,
      action: "optimized",
      optimizedObjectKey,
      originalBytes,
      optimizedBytes,
      savingRatio,
      before,
      after
    };
    cache.set(ref.url, result);
    return result;
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

function writeReport(report) {
  fs.mkdirSync("logs", { recursive: true });
  const reportPath = path.resolve("logs", `video-optimization-${timestamp()}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return reportPath;
}

async function main() {
  loadEnv(ENV_PATH);
  const missing = requiredEnv().filter(([, ok]) => !ok).map(([name]) => name);
  if (missing.length) throw new Error(`Missing env: ${missing.join(", ")}`);
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) throw new Error("ffmpeg-static binary not found");
  if (!ffprobeStatic.path || !fs.existsSync(ffprobeStatic.path)) throw new Error("ffprobe-static binary not found");

  const options = {
    dryRun: hasArg("dry-run"),
    force: hasArg("force"),
    includeOptimized: hasArg("include-optimized"),
    maxWidth: Number(argValue("max-width") || 1366),
    maxHeight: Number(argValue("max-height") || 768),
    crf: Number(argValue("crf") || 28),
    preset: argValue("preset") || "medium",
    videoBitrate: argValue("maxrate") || "",
    audioBitrate: argValue("audio-bitrate") || "96k",
    noAudio: hasArg("no-audio"),
    minSavingRatio: Number(argValue("min-saving-ratio") || 0.03),
    limit: Number(argValue("limit") || 0),
    slug: argValue("slug").trim()
  };

  const client = createOssClient();
  const contentKey = getOssConfig().contentKey;
  const siteContent = await getJsonObject(client, contentKey);
  let siteChanged = false;
  const siteRefs = collectOssUrlRefs(siteContent, "site", () => {
    siteChanged = true;
  });

  const projectDocs = [];
  for (const work of Array.isArray(siteContent.works) ? siteContent.works : []) {
    if (!isProjectContentUrl(work.contentUrl)) continue;
    const objectKey = objectKeyFromOssUrl(work.contentUrl);
    try {
      const document = { key: objectKey, slug: work.slug || objectKey, json: await getJsonObject(client, objectKey), changed: false };
      document.refs = collectOssUrlRefs(document.json, `project:${document.slug}`, () => {
        document.changed = true;
      });
      projectDocs.push(document);
    } catch (error) {
      console.log(`[content] skipped ${objectKey}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const refs = [
    ...siteRefs.filter((ref) => !isProjectContentUrl(ref.url)),
    ...projectDocs.flatMap((document) => document.refs)
  ]
    .filter((ref) => looksLikeVideoObjectKey(ref.objectKey))
    .filter((ref) => !options.slug || ref.objectKey.includes(`/studio-projects/${options.slug}/`));

  console.log(`[video] refs=${refs.length} dryRun=${options.dryRun} max=${options.maxWidth}x${options.maxHeight} crf=${options.crf} preset=${options.preset}`);
  const cache = new Map();
  const report = {
    options,
    contentKey,
    startedAt: new Date().toISOString(),
    rows: []
  };

  let attempted = 0;
  for (const ref of refs) {
    if (options.limit && attempted >= options.limit) {
      console.log(`[video] limit reached ${options.limit}`);
      break;
    }
    attempted += 1;
    try {
      const result = await optimizeVideoRef(client, ref, options, cache);
      if (result.nextUrl !== ref.url) ref.set(result.nextUrl);
      report.rows.push({
        label: ref.label,
        objectKey: ref.objectKey,
        action: result.action,
        reason: result.reason || "",
        optimizedObjectKey: result.optimizedObjectKey || "",
        originalBytes: result.originalBytes || 0,
        optimizedBytes: result.optimizedBytes || 0,
        savingRatio: result.savingRatio || 0,
        before: result.before || null,
        after: result.after || null
      });
      const bytes = result.originalBytes ? ` ${formatBytes(result.originalBytes)} -> ${formatBytes(result.optimizedBytes || 0)}` : "";
      console.log(`[video] ${attempted}/${options.limit || "all"} ${result.action} ${ref.objectKey}${bytes}`);
    } catch (error) {
      report.rows.push({
        label: ref.label,
        objectKey: ref.objectKey,
        action: "failed",
        reason: error instanceof Error ? error.message : String(error)
      });
      console.log(`[video] failed ${ref.objectKey}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  for (const document of projectDocs) {
    if (!document.changed) continue;
    await putJsonObject(client, document.key, document.json, options.dryRun);
    console.log(`[content] ${options.dryRun ? "would update" : "updated"} ${document.key}`);
  }
  if (siteChanged) {
    await putJsonObject(client, contentKey, siteContent, options.dryRun);
    console.log(`[content] ${options.dryRun ? "would update" : "updated"} ${contentKey}`);
  }

  report.finishedAt = new Date().toISOString();
  report.summary = report.rows.reduce((summary, row) => {
    summary[row.action] = (summary[row.action] || 0) + 1;
    summary.originalBytes += row.originalBytes || 0;
    summary.optimizedBytes += row.optimizedBytes || 0;
    return summary;
  }, { originalBytes: 0, optimizedBytes: 0 });
  report.summary.savedBytes = report.summary.originalBytes - report.summary.optimizedBytes;
  const reportPath = writeReport(report);
  console.log(`[video] report ${reportPath}`);
  console.log(`[video] summary ${JSON.stringify(report.summary)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
