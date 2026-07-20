const DEFAULT_REVALIDATE_URL = "https://studio.carlwang.cn/api/revalidate";
const REVALIDATE_TIMEOUT_MS = 15_000;

export async function revalidatePublicContent(label = "publish") {
  const secret = String(process.env.REVALIDATE_SECRET || "").trim();
  if (!secret) {
    console.log(`[${label}] cache revalidation skipped: REVALIDATE_SECRET is not configured`);
    return false;
  }

  const endpoint = String(process.env.STUDIO_REVALIDATE_URL || DEFAULT_REVALIDATE_URL).trim();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-revalidate-secret": secret
      },
      signal: AbortSignal.timeout(REVALIDATE_TIMEOUT_MS)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    console.log(`[${label}] public cache revalidation requested`);
    return true;
  } catch (error) {
    console.warn(`[${label}] cache revalidation failed; TTL fallback remains active: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}
