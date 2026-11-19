import crypto from "crypto";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  role: "USER" | "ADMIN";
  isStudentVerified: boolean;
  reputationScore: number;
  schoolId?: string | null;
  schoolShortName?: string | null;
  dorm?: string | null;
}

export const SESSION_COOKIE_NAME = "unicycle_session";
const SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "unicycle-student-secret-key-2026";

export function createSessionToken(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): SessionUser | null {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const expectedSig = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(payload)
      .digest("base64url");

    if (signature !== expectedSig) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return decoded as SessionUser;
  } catch {
    return null;
  }
}
