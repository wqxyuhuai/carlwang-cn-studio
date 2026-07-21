const previewCache = new Map();

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function cleanText(value) {
  return decodeHtml(value).replace(/\s+/g, " ").trim();
}

function safeHttpUrl(value, baseUrl = undefined) {
  try {
    const url = new URL(value, baseUrl);
    if (url.hostname.endsWith("hdslb.com")) url.pathname = url.pathname.replace(/@[^/]+$/, "");
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export function vimeoOembedTarget(value) {
  const url = new URL(value);
  const showcaseVideoId = url.pathname.startsWith("/showcase/") ? url.searchParams.get("video") : "";
  return showcaseVideoId && /^\d+$/.test(showcaseVideoId) ? `https://vimeo.com/${showcaseVideoId}` : url.href;
}

function attributesFromTag(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gs)) {
    attributes[match[1].toLowerCase()] = match[3];
  }
  return attributes;
}

export function previewFromHtml(html, sourceUrl) {
  const meta = {};
  for (const tag of String(html || "").match(/<meta\b[^>]*>/gi) || []) {
    const attributes = attributesFromTag(tag);
    const key = String(attributes.property || attributes.name || "").toLowerCase();
    if (key && attributes.content && !meta[key]) meta[key] = cleanText(attributes.content);
  }
  const titleMatch = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const hostname = (() => {
    try {
      return new URL(sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  return {
    title: meta["og:title"] || meta["twitter:title"] || cleanText(titleMatch?.[1]),
    description: meta["og:description"] || meta.description || meta["twitter:description"] || "",
    imageUrl: safeHttpUrl(meta["og:image"] || meta["twitter:image"] || "", sourceUrl),
    siteName: meta["og:site_name"] || hostname
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "CarlWangStudioContentPublisher/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`Preview request failed with ${response.status}`);
  return await response.json();
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 (compatible; CarlWangStudioContentPublisher/1.0)"
    },
    redirect: "follow",
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`Preview request failed with ${response.status}`);
  return previewFromHtml(await response.text(), response.url || url);
}

export async function fetchBookmarkPreview(value) {
  const url = safeHttpUrl(value);
  if (!url) return { title: String(value || ""), description: "", imageUrl: "", siteName: "" };
  if (previewCache.has(url)) return previewCache.get(url);

  const promise = (async () => {
    try {
      const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
      if (["vimeo.com", "player.vimeo.com"].includes(host)) {
        const target = vimeoOembedTarget(url);
        try {
          const data = await fetchJson(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(target)}`);
          return {
            title: cleanText(data.title),
            description: cleanText(data.description),
            imageUrl: safeHttpUrl(data.thumbnail_url),
            siteName: cleanText(data.provider_name) || "Vimeo"
          };
        } catch {
          const videoId = new URL(target).pathname.match(/\/(?:video\/)?(\d+)/)?.[1];
          if (!videoId) throw new Error("Vimeo preview unavailable");
          const [data] = await fetchJson(`https://vimeo.com/api/v2/video/${videoId}.json`);
          return {
            title: cleanText(data?.title),
            description: cleanText(data?.description),
            imageUrl: safeHttpUrl(data?.thumbnail_large || data?.thumbnail_medium || data?.thumbnail_small),
            siteName: "Vimeo"
          };
        }
      }
      if (["youtube.com", "youtu.be", "youtube-nocookie.com"].includes(host)) {
        const data = await fetchJson(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`);
        return {
          title: cleanText(data.title),
          description: cleanText(data.author_name),
          imageUrl: safeHttpUrl(data.thumbnail_url),
          siteName: cleanText(data.provider_name) || "YouTube"
        };
      }
      return await fetchHtml(url);
    } catch {
      const hostname = new URL(url).hostname.replace(/^www\./, "");
      return { title: url, description: "", imageUrl: "", siteName: hostname };
    }
  })();

  previewCache.set(url, promise);
  return promise;
}
