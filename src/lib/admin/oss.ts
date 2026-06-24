type OssClient = {
  put: (name: string, file: Buffer, options?: { headers?: Record<string, string> }) => Promise<{ name?: string; url?: string }>;
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
  return Boolean(config.accessKeyId && config.accessKeySecret && config.bucket && (config.region || config.endpoint));
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
  const prefix = `${config.uploadPrefix.replace(/^\/+|\/+$/g, "")}/${sanitizeSegment(usage)}`;
  const objectKey = `${prefix}/${Date.now()}-${sanitizeSegment(file.name.replace(/\.[^.]+$/, ""))}.${extensionFromFile(file)}`;
  const client = await createOssClient();
  const buffer = Buffer.from(await file.arrayBuffer());
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
    type: file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : "file",
    usage,
    size: `${Math.round(file.size / 1024)} KB`
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
