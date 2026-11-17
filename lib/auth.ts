import crypto from "crypto";
import { cookies } from "next/headers";

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

const SESSION_COOKIE_NAME = "unicycle_session";
const SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "unicycle-student-secret-key-2026";

export const DEMO_USERS: Record<string, SessionUser & { passwordPlain: string }> = {
  "hoangnam.bka@gmail.com": {
    id: "demo-user-nam",
    email: "hoangnam.bka@gmail.com",
    passwordPlain: "Student@123456",
    displayName: "Nguyễn Hoàng Nam",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    role: "USER",
    isStudentVerified: true,
    reputationScore: 4.95,
    schoolId: "hcmut",
    schoolShortName: "ĐH Bách Khoa",
    dorm: "Tòa B4 - KTX Khu B ĐHQG",
  },
  "haiyen.khtn@gmail.com": {
    id: "demo-user-yen",
    email: "haiyen.khtn@gmail.com",
    passwordPlain: "Student@123456",
    displayName: "Trần Hải Yến",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
    role: "USER",
    isStudentVerified: true,
    reputationScore: 5.0,
    schoolId: "ktx-b",
    schoolShortName: "KTX Khu B",
    dorm: "Tòa BA1 - KTX Khu B ĐHQG",
  },
  "admin@unicycle.vn": {
    id: "demo-user-admin",
    email: "admin@unicycle.vn",
    passwordPlain: "Admin@123456",
    displayName: "Ban Quản Trị UniCycle",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    role: "ADMIN",
    isStudentVerified: true,
    reputationScore: 5.0,
    schoolId: "ktx-b",
    schoolShortName: "BQT Hệ Thống",
    dorm: "Trung tâm Quản lý ĐHQG",
  },
};

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

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME };

