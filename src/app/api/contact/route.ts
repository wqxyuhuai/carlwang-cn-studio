import { NextRequest, NextResponse } from "next/server";
import { createRecord } from "@/lib/admin/content-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contactAttempts = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function clientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function rateLimited(request: NextRequest) {
  const key = clientKey(request);
  const now = Date.now();
  const attempts = (contactAttempts.get(key) || []).filter((time) => now - time < WINDOW_MS);
  if (attempts.length >= MAX_ATTEMPTS) {
    contactAttempts.set(key, attempts);
    return true;
  }
  attempts.push(now);
  contactAttempts.set(key, attempts);
  return false;
}

export async function POST(request: NextRequest) {
  try {
    if (rateLimited(request)) {
      return NextResponse.json({ error: "Too many messages. Try again later." }, { status: 429 });
    }

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      company?: string;
      projectType?: string;
      sourcePage?: string;
      message?: string;
      website?: string;
    };

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const message = String(body.message || "").trim();

    if (body.website) {
      return NextResponse.json({ ok: true });
    }

    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });
    if (message.length > 2000) return NextResponse.json({ error: "Message is too long." }, { status: 400 });

    const rawSource = String(body.sourcePage || request.headers.get("referer") || "/").trim();
    const sourcePage = (() => {
      try {
        return new URL(rawSource, request.url).toString();
      } catch {
        return request.url;
      }
    })();

    await createRecord(
      "contact-messages",
      {
        name,
        email,
        sourcePage,
        message,
        status: "New",
        mailNotifyStatus: "未通知",
        notionNotifyStatus: "未通知",
        createdAt: new Date().toISOString()
      },
      { includeReadOnly: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Message failed." }, { status: 500 });
  }
}
