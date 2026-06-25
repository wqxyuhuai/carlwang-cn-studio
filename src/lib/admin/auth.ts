import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "cw_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  sub: "admin";
  iat: number;
  exp: number;
  csrf: string;
};

type AuthResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse };

function base64UrlEncode(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || "";
}

export function hasAdminAuthConfig() {
  return Boolean(process.env.ADMIN_PASSWORD_HASH && sessionSecret().length >= 32);
}

export function createSessionToken() {
  const secret = sessionSecret();

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured.");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: "admin",
    iat: now,
    exp: now + ADMIN_SESSION_MAX_AGE_SECONDS,
    csrf: randomBytes(24).toString("base64url")
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  const secret = sessionSecret();

  if (!token || !secret || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  const expectedSignature = sign(encodedPayload, secret);

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
    if (payload.sub !== "admin" || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: NextRequest) {
  return verifySessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function secureCookieOption() {
  return process.env.NODE_ENV === "production" && process.env.ADMIN_COOKIE_SECURE !== "false" ? { secure: true } : {};
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: "/",
    ...secureCookieOption()
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
    ...secureCookieOption()
  });
}

export async function verifyAdminPassword(_request: NextRequest, password: string) {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    return { ok: false, message: "ADMIN_PASSWORD_HASH is not configured." };
  }

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    return { ok: false, message: "Invalid password." };
  }

  return { ok: true, message: "Authenticated." };
}

function isSafeMutationOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

export function requireAdmin(request: NextRequest, options: { mutate?: boolean } = {}): AuthResult {
  const session = getSessionFromRequest(request);

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    };
  }

  if (options.mutate) {
    if (!isSafeMutationOrigin(request)) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
      };
    }

    const csrf = request.headers.get("x-admin-csrf");
    if (!csrf || csrf !== session.csrf) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 })
      };
    }
  }

  return { ok: true, session };
}

export function assertStrongPassword(password: string) {
  const simplePatterns = ["123456", "password", "admin123", "qwerty", "carlwang"];
  const errors: string[] = [];

  if (password.length < 12) errors.push("Use at least 12 characters.");
  if (!/[a-z]/.test(password)) errors.push("Add a lowercase letter.");
  if (!/[A-Z]/.test(password)) errors.push("Add an uppercase letter.");
  if (!/\d/.test(password)) errors.push("Add a number.");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Add a special character.");
  if (simplePatterns.some((pattern) => password.toLowerCase().includes(pattern))) errors.push("Avoid common password words.");

  return {
    ok: errors.length === 0,
    errors
  };
}
