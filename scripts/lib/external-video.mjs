const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{6,20}$/;
const VIMEO_ID_PATTERN = /^\d+$/;
const BILIBILI_BVID_PATTERN = /^BV[a-zA-Z0-9]+$/i;
const BILIBILI_AID_PATTERN = /^\d+$/;

function parseUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function normalizedHost(url) {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

function youtubeVideoId(url, host) {
  if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
  if (!["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) return "";
  if (url.pathname === "/watch") return url.searchParams.get("v") || "";
  const parts = url.pathname.split("/").filter(Boolean);
  return ["embed", "shorts", "live"].includes(parts[0]) ? parts[1] || "" : "";
}

function vimeoVideoId(url, host) {
  if (!["vimeo.com", "player.vimeo.com"].includes(host)) return "";
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "video") return parts[1] || "";
  return [...parts].reverse().find((part) => VIMEO_ID_PATTERN.test(part)) || "";
}

function bilibiliVideoId(url, host) {
  if (!["bilibili.com", "m.bilibili.com", "player.bilibili.com"].includes(host)) return null;
  const queryBvid = url.searchParams.get("bvid") || "";
  if (BILIBILI_BVID_PATTERN.test(queryBvid)) return { key: "bvid", value: queryBvid };
  const queryAid = url.searchParams.get("aid") || "";
  if (BILIBILI_AID_PATTERN.test(queryAid)) return { key: "aid", value: queryAid };

  const parts = url.pathname.split("/").filter(Boolean);
  const videoIndex = parts.findIndex((part) => part.toLowerCase() === "video");
  const pathId = videoIndex >= 0 ? parts[videoIndex + 1] || "" : "";
  if (BILIBILI_BVID_PATTERN.test(pathId)) return { key: "bvid", value: pathId };
  const aidMatch = pathId.match(/^av(\d+)$/i);
  return aidMatch ? { key: "aid", value: aidMatch[1] } : null;
}

export function externalVideoInfo(value) {
  const url = parseUrl(value);
  if (!url) return null;
  const host = normalizedHost(url);

  const youtubeId = youtubeVideoId(url, host);
  if (YOUTUBE_ID_PATTERN.test(youtubeId)) {
    return {
      provider: "youtube",
      url: url.href,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`
    };
  }

  const vimeoId = vimeoVideoId(url, host);
  if (VIMEO_ID_PATTERN.test(vimeoId)) {
    return {
      provider: "vimeo",
      url: url.href,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`
    };
  }

  const bilibiliId = bilibiliVideoId(url, host);
  if (bilibiliId) {
    const params = new URLSearchParams({
      [bilibiliId.key]: bilibiliId.value,
      high_quality: "1",
      danmaku: "0"
    });
    return {
      provider: "bilibili",
      url: url.href,
      embedUrl: `https://player.bilibili.com/player.html?${params}`
    };
  }

  return null;
}
