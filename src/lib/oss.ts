import { createHmac } from "crypto";

function getEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return "";
}

function contentKeyFromPublicUrl(publicBaseUrl: string) {
  const contentUrl = getEnv("NEXT_PUBLIC_CONTENT_URL");
  if (!contentUrl) return "";

  try {
    const url = new URL(contentUrl);
    const base = publicBaseUrl ? new URL(publicBaseUrl) : null;
    if (base && url.origin !== base.origin) return "";
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return "";
  }
}

export function getOssConfig() {
  const publicBaseUrl = getEnv("ALIYUN_OSS_PUBLIC_BASE_URL");

  return {
    accessKeyId: getEnv("ALIYUN_ACCESS_KEY_ID", "ALIYUN_OSS_ACCESS_KEY_ID"),
    accessKeySecret: getEnv("ALIYUN_ACCESS_KEY_SECRET", "ALIYUN_OSS_ACCESS_KEY_SECRET"),
    region: getEnv("ALIYUN_OSS_REGION"),
    endpoint: getEnv("ALIYUN_OSS_ENDPOINT"),
    bucket: getEnv("ALIYUN_OSS_BUCKET"),
    publicBaseUrl,
    contentKey: getEnv("ALIYUN_OSS_CONTENT_KEY") || contentKeyFromPublicUrl(publicBaseUrl) || "uploads/admin/site-content.json"
  };
}

export function hasOssConfig() {
  const config = getOssConfig();
  return Boolean(config.accessKeyId && config.accessKeySecret && config.bucket && config.publicBaseUrl && (config.region || config.endpoint));
}

function ossEndpointHost() {
  const config = getOssConfig();
  const rawEndpoint = config.endpoint || `${config.region}.aliyuncs.com`;
  return rawEndpoint.replace(/^https?:\/\//, "").replace(/\/+$/g, "");
}

function ossObjectUrl(objectKey: string) {
  const config = getOssConfig();
  const host = ossEndpointHost();
  const encodedKey = objectKey.split("/").map(encodeURIComponent).join("/");
  return `https://${config.bucket}.${host}/${encodedKey}`;
}

export function ossPublicUrl(objectKey: string) {
  const config = getOssConfig();
  const publicBase = config.publicBaseUrl.replace(/\/+$/g, "");
  return publicBase ? `${publicBase}/${objectKey}` : ossObjectUrl(objectKey);
}

function ossAuthorization(method: string, objectKey: string, contentType: string, date: string) {
  const config = getOssConfig();
  const canonicalResource = `/${config.bucket}/${objectKey}`;
  const stringToSign = `${method}\n\n${contentType}\n${date}\n${canonicalResource}`;
  const signature = createHmac("sha1", config.accessKeySecret).update(stringToSign).digest("base64");
  return `OSS ${config.accessKeyId}:${signature}`;
}

async function putObjectToOss(objectKey: string, body: Buffer, contentType: string) {
  if (!hasOssConfig()) {
    throw new Error("Aliyun OSS is not fully configured.");
  }

  const date = new Date().toUTCString();
  const response = await fetch(ossObjectUrl(objectKey), {
    method: "PUT",
    headers: {
      Authorization: ossAuthorization("PUT", objectKey, contentType, date),
      Date: date,
      "Content-Type": contentType
    },
    body: body as unknown as BodyInit
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Aliyun OSS upload failed (${response.status}).${detail ? ` ${detail.slice(0, 300)}` : ""}`);
  }

  return { name: objectKey };
}

export async function putJsonToOss(objectKey: string, data: unknown) {
  const body = Buffer.from(`${JSON.stringify(data, null, 2)}\n`, "utf8");
  return putObjectToOss(objectKey, body, "application/json; charset=utf-8");
}
