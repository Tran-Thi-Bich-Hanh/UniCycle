/**
 * Chuẩn hóa chuỗi tiếng Việt: loại bỏ dấu thanh, chuyển về chữ thường
 * VD: "Giáo trình Giải tích 1" -> "giao trinh giai tich 1"
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return "";
  let result = str.toLowerCase();

  result = result.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  result = result.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  result = result.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  result = result.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  result = result.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  result = result.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  result = result.replace(/đ/g, "d");

  // Loại bỏ các ký tự dấu tổ hợp Unicode
  result = result.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "");
  result = result.replace(/\u02C6|\u0306|\u031B/g, "");

  // Thay thế ký tự đặc biệt thừa
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

/**
 * Danh sách từ khóa hàng cấm theo quy định BR17
 * (Hàng giả, vũ khí, ma túy, rượu cồn, thuốc lá, tài liệu gian lận thi cử...)
 */
export const PROHIBITED_KEYWORDS = [
  "ma tuy",
  "can sa",
  "bong cuoi",
  "thuoc lac",
  "vu khi",
  "sung",
  "dao gam",
  "kiem",
  "thuoc la dien tu",
  "pod",
  "vape",
  "ruou",
  "phao hoa",
  "bang gia",
  "lam bang",
  "the gia",
  "chay diem",
  "de thi that",
  "phao thi",
];

/**
 * Kiểm tra nội dung có chứa từ khóa hàng cấm hay không
 */
export function checkProhibitedContent(text: string): { isProhibited: boolean; matchedKeyword?: string } {
  if (!text) return { isProhibited: false };
  const normalized = removeVietnameseTones(text);

  for (const kw of PROHIBITED_KEYWORDS) {
    const regex = new RegExp(`(^|\\s)${kw}($|\\s)`, "i");
    if (regex.test(normalized)) {
      return { isProhibited: true, matchedKeyword: kw };
    }
  }

  return { isProhibited: false };
}

