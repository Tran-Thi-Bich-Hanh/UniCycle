/**
 * Chỉ cho phép chuyển hướng tới đường dẫn nội bộ (bắt đầu bằng một dấu "/").
 * Chặn các dạng độc hại: "//evil.com", "/\evil.com", "https://evil.com", "javascript:..."
 */
export function safeRedirect(target: string | null | undefined, fallback = "/"): string {
  if (!target) return fallback;
  const value = target.trim();
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}

