import crypto from "node:crypto";
import { cookies } from "next/headers";
import db, { User, ensureUserWallet } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "unicycle_student_secret_key_2026_secure_key";
const COOKIE_NAME = "unicycle_session";

// Băm mật khẩu sử dụng thuật toán scrypt tích hợp sẵn trong Node.js
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

// Kiểm tra mật khẩu an toàn với constant-time comparison chống timing attacks
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

// Cấu trúc payload của JWT Session
export interface SessionPayload {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  exp: number;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64url(input: string): string {
  let str = input.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64").toString("utf-8");
}

// Tạo Token JWT ký bằng HMAC-SHA256
export function createToken(payload: Omit<SessionPayload, "exp">, expiresInDays = 7): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify({ ...payload, exp }));

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();
  const encodedSignature = base64url(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

// Xác thực và giải mã Token JWT
export function verifyToken(token: string): SessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    const expectedSignature = base64url(
      crypto.createHmac("sha256", JWT_SECRET).update(`${encodedHeader}.${encodedPayload}`).digest()
    );

    if (encodedSignature !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(fromBase64url(encodedPayload)) as SessionPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Hết hạn
    }

    return payload;
  } catch {
    return null;
  }
}

// Lấy thông tin người dùng đang đăng nhập từ HTTP-only cookie
export async function getSessionUser(): Promise<Omit<User, "password_hash"> | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload?.userId) return null;

    ensureUserWallet(payload.userId);

    const query = db.prepare(`
      SELECT id, email, full_name, phone, university, campus_location, avatar_url, bio, wallet_address, point_balance, role, created_at, updated_at
      FROM users WHERE id = ?
    `);
    const user = query.get(payload.userId) as Omit<User, "password_hash"> | undefined;
    return user || null;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };

