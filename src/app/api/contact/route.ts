import { NextRequest, NextResponse } from "next/server";

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

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Message failed." }, { status: 500 });
  }
}
