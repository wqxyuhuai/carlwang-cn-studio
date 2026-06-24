import { collectionConfigList } from "./schema";
import { getDatabaseId, hasNotionToken, testNotionDatabase } from "./notion-store";
import { getOssConfig, hasOssConfig, testOssConnection } from "./oss";

function mask(value: string, visible = 4) {
  if (!value) return "";
  if (value.length <= visible) return "*".repeat(value.length);
  return `${"*".repeat(Math.max(4, value.length - visible))}${value.slice(-visible)}`;
}

function shortId(value: string) {
  if (!value) return "";
  return value.length <= 12 ? mask(value, 4) : `${value.slice(0, 6)}...${value.slice(-6)}`;
}

export async function getIntegrationStatus() {
  const oss = getOssConfig();

  return {
    notion: {
      status: hasNotionToken() ? "configured" : "missing",
      token: hasNotionToken() ? mask(process.env.NOTION_TOKEN || "") : "",
      sourceMode: process.env.ADMIN_CONTENT_SOURCE || "local",
      databases: collectionConfigList.map((config) => {
        const databaseId = getDatabaseId(config);
        return {
          key: config.key,
          label: config.label,
          status: databaseId ? "configured" : "missing",
          databaseId: shortId(databaseId),
          env: config.databaseEnv.join(" / ")
        };
      })
    },
    oss: {
      status: hasOssConfig() ? "configured" : "missing",
      bucket: oss.bucket,
      region: oss.region || oss.endpoint,
      publicBaseUrl: oss.publicBaseUrl,
      uploadPrefix: oss.uploadPrefix,
      accessKeyId: oss.accessKeyId ? mask(oss.accessKeyId, 4) : "",
      hasSecret: Boolean(oss.accessKeySecret)
    },
    admin: {
      hasPasswordHash: Boolean(process.env.ADMIN_PASSWORD_HASH),
      hasSessionSecret: Boolean(process.env.ADMIN_SESSION_SECRET),
      sessionSecretOk: Boolean((process.env.ADMIN_SESSION_SECRET || "").length >= 32)
    }
  };
}

export async function testNotionConnections() {
  return Promise.all(collectionConfigList.map((config) => testNotionDatabase(config)));
}

export async function testOss() {
  return testOssConnection();
}
