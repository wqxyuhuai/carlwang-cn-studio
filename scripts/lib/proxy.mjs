import { ProxyAgent, setGlobalDispatcher } from "undici";

let configuredProxy = "";

export function configureProxyFromEnv() {
  if (configuredProxy) return configuredProxy;
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY || "";
  if (!proxyUrl) return "";
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  configuredProxy = proxyUrl;
  try {
    const parsed = new URL(proxyUrl);
    console.log(`[proxy] using ${parsed.protocol}//${parsed.host}`);
  } catch {
    console.log("[proxy] using configured proxy");
  }
  return configuredProxy;
}
