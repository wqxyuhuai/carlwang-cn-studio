import { randomBytes } from "crypto";

type OssClient = {
  put: (name: string, file: Buffer, options?: { headers?: Record<string, string> }) => Promise<{ name?: string; url?: string }>;
};

const usagePathMap: Record<string, string> = {
  "Work Cover": "works/covers",
  Gallery: "works/gallery",
  Portrait: "about/portrait",
  "Tool Icon": "tools/icons",
  "Social Icon": "social/icons",
  General: "general",
  works: "works/gallery",
  about: "about/portrait",
  tools: "tools/icons",
  social: "social/icons",
  general: "general"
};

const usageLabelMap: Record<string, string> = {
  "Work Cover": "Work Cover",
  Gallery: "Gallery",
  Portrait: "Portrait",
  "Tool Icon": "Tool Icon",
  "Social Icon": "Social Icon",
  General: "General",
  works: "Gallery",
  about: "Portrait",
  tools: "Tool Icon",
  social: "Social Icon",
  general: "General"
};

function getEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return "";
}

export function getOssConfig() {
  return {
    accessKeyId: getEnv("ALIYUN_ACCESS_KEY_ID", "ALIYUN_OSS_ACCESS_KEY_ID"),
    accessKeySecret: getEnv("ALIYUN_ACCESS_KEY_SECRET", "ALIYUN_OSS_ACCESS_KEY_SECRET"),
    region: getEnv("ALIYUN_OSS_REGION"),
    endpoint: getEnv("ALIYUN_OSS_ENDPOINT", "ALIYUN_OSS_ENDPOINT"),
    bucket: getEnv("ALIYUN_OSS_BUCKET"),
    publicBaseUrl: getEnv("ALIYUN_OSS_PUBLIC_BASE_URL"),
    uploadPrefix: getEnv("ALIYUN_OSS_UPLOAD_PREFIX", "ALIYUN_OSS_DIR") || "uploads/admin"
  };
}

export function hasOssConfig() {
  const config = getOssConfig();
  return Boolean(config.accessKeyId && config.accessKeySecret && config.bucket && config.publicBaseUrl && (config.region || config.endpoint));
}

async function createOssClient(): Promise<OssClient> {
  const config = getOssConfig();

  if (!hasOssConfig()) {
    throw new Error("Aliyun OSS is not fully configured.");
  }

  const ossModule = await import("ali-oss");
  const OSS = ossModule.default;
  return new OSS({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    bucket: config.bucket,
    endpoint: config.endpoint || undefined,
    region: config.region || undefined
  }) as OssClient;
}

function extensionFromFile(file: File) {
  const namePart = file.name.split(".").pop() || "";
  const extension = namePart.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (extension) return extension;

  if (file.type.startsWith("image/")) return file.type.replace("image/", "");
  if (file.type.startsWith("video/")) return file.type.replace("video/", "");
  return "bin";
}

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "asset";
}

function imageDimensions(buffer: Buffer, mimeType: string) {
  try {
    if (mimeType === "image/png" && buffer.length >= 24 && buffer.toString("ascii", 1, 4) === "PNG") {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }

    if (mimeType === "image/gif" && buffer.length >= 10) {
      return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
    }

    if (mimeType === "image/jpeg") {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        const length = buffer.readUInt16BE(offset + 2);
        if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker)) {
          return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
        }
        offset += 2 + length;
      }
    }

    if (mimeType === "image/webp" && buffer.length >= 30 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
      const chunk = buffer.toString("ascii", 12, 16);
      if (chunk === "VP8X" && buffer.length >= 30) {
        return {
          width: 1 + buffer.readUIntLE(24, 3),
          height: 1 + buffer.readUIntLE(27, 3)
        };
      }
      if (chunk === "VP8 " && buffer.length >= 30) {
        return {
          width: buffer.readUInt16LE(26) & 0x3fff,
          height: buffer.readUInt16LE(28) & 0x3fff
        };
      }
      if (chunk === "VP8L" && buffer.length >= 25) {
        const bits = buffer.readUInt32LE(21);
        return {
          width: (bits & 0x3fff) + 1,
          height: ((bits >> 14) & 0x3fff) + 1
        };
      }
    }

    if (mimeType === "image/svg+xml") {
      const source = buffer.toString("utf8", 0, Math.min(buffer.length, 4096));
      const width = Number(source.match(/\bwidth=["']?([\d.]+)/i)?.[1] || 0);
      const height = Number(source.match(/\bheight=["']?([\d.]+)/i)?.[1] || 0);
      if (width > 0 && height > 0) return { width, height };
      const viewBox = source.match(/\bviewBox=["'][^"']*?\s([\d.]+)\s([\d.]+)["']/i);
      if (viewBox) return { width: Number(viewBox[1]), height: Number(viewBox[2]) };
    }
  } catch {
    return {};
  }

  return {};
}

export async function uploadFileToOss(file: File, usage: string) {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "video/mp4",
    "video/webm",
    "application/pdf"
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("File type is not allowed.");
  }

  const maxSize = file.type.startsWith("video/") ? 80 * 1024 * 1024 : 20 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("File is too large.");
  }

  const config = getOssConfig();
  const usagePath = usagePathMap[usage] || "general";
  const normalizedUsage = usageLabelMap[usage] || "General";
  const prefix = `${config.uploadPrefix.replace(/^\/+|\/+$/g, "")}/${usagePath}`;
  const client = await createOssClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = `${Date.now()}-${randomBytes(4).toString("hex")}-${sanitizeSegment(file.name.replace(/\.[^.]+$/, ""))}.${extensionFromFile(file)}`;
  const objectKey = `${prefix}/${safeName}`;
  const result = await client.put(objectKey, buffer, {
    headers: {
      "Content-Type": file.type
    }
  });

  const publicBase = config.publicBaseUrl.replace(/\/+$/g, "");
  const url = publicBase ? `${publicBase}/${objectKey}` : result.url || "";

  return {
    title: file.name,
    url,
    objectKey: result.name || objectKey,
    type: file.type.startsWith("video/") ? "Video" : file.type === "image/svg+xml" && normalizedUsage.includes("Icon") ? "Icon" : file.type.startsWith("image/") ? "Image" : "Document",
    usage: normalizedUsage,
    size: `${Math.round(file.size / 1024)} KB`,
    ...imageDimensions(buffer, file.type),
    uploadedAt: new Date().toISOString()
  };
}

export async function testOssConnection() {
  if (!hasOssConfig()) {
    return { status: "missing", error: "Aliyun OSS environment variables are incomplete." };
  }

  try {
    const client = await createOssClient();
    const content = Buffer.from("ok");
    const objectKey = `${getOssConfig().uploadPrefix.replace(/^\/+|\/+$/g, "")}/healthcheck-${Date.now()}.txt`;
    const result = await client.put(objectKey, content, {
      headers: {
        "Content-Type": "text/plain"
      }
    });
    return { status: "connected", objectKey: result.name || objectKey };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown OSS error"
    };
  }
}
