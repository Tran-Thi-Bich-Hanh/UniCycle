import crypto from "crypto";

export const HANDOVER_TOKEN_TTL_SECONDS = 15 * 60;

const SECRET_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "unicycle-student-secret-key-2026";
const TOKEN_DOMAIN = "handover-v1";

export interface HandoverTokenPayload {
  orderId: string;
  sellerId: string;
  iat: number;
  exp: number;
}

export type VerifyHandoverTokenResult =
  | { valid: true; payload: HandoverTokenPayload }
  | {
      valid: false;
      reason: "invalid" | "expired" | "order_mismatch" | "seller_mismatch";
    };

function signEncodedPayload(encoded: string): Buffer {
  return crypto
    .createHmac("sha256", SECRET_KEY)
    .update(`${TOKEN_DOMAIN}:${encoded}`)
    .digest();
}

/**
 * Tạo token ngắn hạn (mặc định 15 phút) cho mã QR giao nhận của người bán theo từng đơn hẹn.
 */
export function createHandoverToken(
  orderId: string,
  sellerId: string,
  ttlSeconds = HANDOVER_TOKEN_TTL_SECONDS
): { token: string; expiresAt: string } {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttlSeconds;
  const payload: HandoverTokenPayload = { orderId, sellerId, iat, exp };

  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const signature = signEncodedPayload(encoded).toString("base64url");

  return {
    token: `${encoded}.${signature}`,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

/**
 * Xác thực token QR giao nhận đúng chữ ký HMAC, đúng đơn hàng, đúng người bán và còn hiệu lực.
 */
export function verifyHandoverToken(
  token: string,
  expectedOrderId: string,
  expectedSellerId: string
): VerifyHandoverTokenResult {
  try {
    const parts = token.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return { valid: false, reason: "invalid" };
    }

    const [encoded, signature] = parts;
    const expectedSigBuf = signEncodedPayload(encoded);
    const providedSigBuf = Buffer.from(signature, "base64url");

    if (expectedSigBuf.length !== providedSigBuf.length) {
      return { valid: false, reason: "invalid" };
    }
    if (!crypto.timingSafeEqual(expectedSigBuf, providedSigBuf)) {
      return { valid: false, reason: "invalid" };
    }

    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as Partial<HandoverTokenPayload>;

    if (
      typeof parsed.orderId !== "string" ||
      typeof parsed.sellerId !== "string" ||
      typeof parsed.iat !== "number" ||
      typeof parsed.exp !== "number"
    ) {
      return { valid: false, reason: "invalid" };
    }

    if (parsed.orderId !== expectedOrderId) {
      return { valid: false, reason: "order_mismatch" };
    }

    if (parsed.sellerId !== expectedSellerId) {
      return { valid: false, reason: "seller_mismatch" };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (parsed.exp <= nowSec) {
      return { valid: false, reason: "expired" };
    }

    return {
      valid: true,
      payload: {
        orderId: parsed.orderId,
        sellerId: parsed.sellerId,
        iat: parsed.iat,
        exp: parsed.exp,
      },
    };
  } catch {
    return { valid: false, reason: "invalid" };
  }
}

/**
 * Suy ra origin thực tế từ request (hỗ trợ cả localhost, LAN demo và proxy/production).
 */
export function resolveRequestOrigin(req: Request): string {
  const rawHost =
    req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const host = rawHost.split(",")[0].trim();

  if (host) {
    const rawProto = req.headers.get("x-forwarded-proto");
    const protoFromHeader = rawProto ? rawProto.split(",")[0].trim() : null;
    const isLocalHost =
      host.startsWith("localhost") ||
      host.startsWith("127.") ||
      host.startsWith("192.168.") ||
      host.startsWith("10.");
    const protocol = protoFromHeader || (isLocalHost ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
}
