/**
 * Quy tắc BR17: Danh mục hàng hóa cấm giao dịch trong môi trường học đường
 * Kiểm tra tiêu đề và mô tả bài đăng để ngăn chặn gian lận, chất kích thích và vũ khí
 */

const PROHIBITED_KEYWORDS: string[] = [
  // 1. Thuốc lá, chất kích thích, vaping
  "thuoc la", "thuốc lá",
  "vape", "pod", "vaping",
  "thuoc lao", "thuốc lào",
  "can sa", "cần sa", "co my", "cỏ mỹ",
  "ma tuy", "ma túy", "ke", "kẹo", "da", "đá", "shisha",
  "tinh dau vape", "tinh dầu vape",

  // 2. Rượu bia
  "ruou", "rượu",
  "bia",

  // 3. Vũ khí, công cụ nguy hiểm, cháy nổ
  "dao", "kiem", "kiếm", "dao gam", "dao găm",
  "sung", "súng", "dan", "đạn",
  "roi dien", "roi điện", "dui cui", "dùi cui",
  "binh xit hoi cay", "bình xịt hơi cay",
  "phao", "pháo", "phao hoa", "pháo hoa",
  "thuoc no", "thuốc nổ",

  // 4. Giấy tờ giả mạo, hành vi gian lận thi cử
  "bang gia", "bằng giả",
  "chung chi gia", "chứng chỉ giả",
  "tien gia", "tiền giả",
  "giay to gia", "giấy tờ giả",
  "tai lieu phan dong", "tài liệu phản động",
  "de thi truoc", "đề thi trước", "gian lan thi", "gian lận thi",
];

/**
 * Kiểm tra xem văn bản có chứa từ khóa cấm hay không
 * Trả về từ khóa vi phạm đầu tiên nếu có, hoặc null nếu an toàn
 */
export function checkProhibitedContent(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  for (const keyword of PROHIBITED_KEYWORDS) {
    // Tìm kiếm nguyên từ hoặc cụm từ
    if (lower.includes(keyword)) {
      return keyword;
    }
  }

  return null;
}

