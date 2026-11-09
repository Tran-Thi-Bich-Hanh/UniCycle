import crypto from "node:crypto";

/**
 * Định nghĩa thông số chuyên biệt theo danh mục sản phẩm (Category-specific specs)
 */
export interface BookSpecs {
  edition?: string; // Ví dụ: "NXB ĐHQG TP.HCM 2023"
  annotations?: string; // "Không viết vẽ" | "Ghi chú bút chì" | "Highlight nhiều"
  missing_pages?: string; // "Đầy đủ 100% trang" | "Mất vài trang phụ"
  book_cover?: string; // "Bọc nilon sạch đẹp" | "Hơi sờn mép"
}

export interface FurnitureSpecs {
  dimensions?: string; // Ví dụ: "60 x 40 x 28 cm"
  material?: string; // "Gỗ công nghiệp, chân sắt sơn tĩnh điện"
  sturdiness?: string; // "Rất chắc chắn" | "Hơi rung rinh" | "Cần siết lại ốc"
  defects?: string; // "Trầy xước nhẹ góc mép" | "Không có khuyết điểm"
}

export interface ElectronicsSpecs {
  brand?: string; // "Rạng Đông", "Senko", "Logitech"...
  model?: string; // "B102", "RD-RL-20.LED"...
  working_status?: string; // "Hoạt động hoàn hảo 100%" | "Có lỗi nhỏ ngoại hình"
  accessories?: string; // "Đầy đủ sạc cáp zin" | "Chỉ có máy trần"
  power?: string; // "28W", "220V"...
}

export interface LivingSpecs {
  dimensions?: string; // "1m x 2m x 5cm"
  core_material?: string; // "Bông ép", "Cao su non", "Vải cotton"...
  hygiene_status?: string; // "Đã giặt sấy thơm tho" | "Cần giặt lại"
  usage_time?: string; // "Dùng 1 học kỳ", "Dùng 1 năm"...
}

export interface OtherSpecs {
  origin?: string; // "Mua mới chính hãng" | "Mua lại từ khóa trước"
  defects?: string;
  accessories?: string;
}

export type CategoryAttributes =
  | BookSpecs
  | FurnitureSpecs
  | ElectronicsSpecs
  | LivingSpecs
  | OtherSpecs
  | Record<string, any>;

/**
 * Payload chứa toàn bộ dữ liệu cấu thành Hộ chiếu số UniCycle Passport
 */
export interface PassportData {
  productId: string;
  title: string;
  categoryId: string;
  sellerId: string;
  condition: string;
  price: number;
  pickupLocation: string;
  description: string;
  images: string[];
  attributes: Record<string, any>;
  createdAt: string;
}

/**
 * Chuẩn hóa JSON theo thứ tự key có quy tắc (Deterministic Canonical JSON)
 * Đảm bảo cùng dữ liệu luôn sinh ra đúng 1 chuỗi string duy nhất bất kể thứ tự thuộc tính.
 */
export function canonicalStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalStringify).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + canonicalStringify(obj[k])).join(",") +
    "}"
  );
}

/**
 * Sinh mã băm Hộ chiếu số UniCycle Passport (SHA-256 định dạng 0x... bytes32)
 * Chuẩn 66 ký tự (tiền tố 0x + 64 ký tự hex) tương thích hoàn toàn với Smart Contract Avalanche bytes32.
 */
export function generatePassportHash(data: PassportData): string {
  const canonicalPayload = {
    attributes: data.attributes || {},
    categoryId: data.categoryId,
    condition: data.condition,
    createdAt: data.createdAt,
    description: data.description ? data.description.trim() : "",
    images: data.images || [],
    pickupLocation: data.pickupLocation ? data.pickupLocation.trim() : "",
    price: Number(data.price),
    productId: data.productId,
    sellerId: data.sellerId,
    title: data.title ? data.title.trim() : "",
  };

  const canonicalJson = canonicalStringify(canonicalPayload);
  const hash = crypto.createHash("sha256").update(canonicalJson, "utf8").digest("hex");
  return `0x${hash}`;
}

/**
 * Kiểm tra tính toàn vẹn của bài đăng so với mã băm đã lưu (Verify Integrity)
 */
export function verifyPassport(
  data: PassportData,
  expectedHash: string
): {
  isValid: boolean;
  computedHash: string;
  expectedHash: string;
} {
  const computedHash = generatePassportHash(data);
  const isValid =
    computedHash.toLowerCase().trim() === (expectedHash || "").toLowerCase().trim();

  return {
    isValid,
    computedHash,
    expectedHash,
  };
}

/**
 * Cấu hình các trường thông số đặc thù cho từng danh mục để hiển thị và nhập liệu
 */
export const CATEGORY_SPEC_CONFIG: Record<
  string,
  {
    categoryName: string;
    icon: string;
    fields: {
      key: string;
      label: string;
      placeholder: string;
      type: "text" | "select";
      options?: string[];
      helper?: string;
    }[];
  }
> = {
  cat_books: {
    categoryName: "Giáo trình & Sách",
    icon: "Book",
    fields: [
      {
        key: "edition",
        label: "Phiên bản / Năm xuất bản",
        placeholder: "Ví dụ: NXB ĐHQG TP.HCM 2023",
        type: "text",
      },
      {
        key: "annotations",
        label: "Mức độ ghi chú / Viết vẽ",
        placeholder: "Chọn tình trạng",
        type: "select",
        options: [
          "Sách sạch đẹp, không viết vẽ",
          "Có ghi chú bút chì (gôm được)",
          "Có highlight một số chương",
          "Viết bút bi nhiều",
        ],
      },
      {
        key: "missing_pages",
        label: "Độ nguyên vẹn trang",
        placeholder: "Chọn tình trạng",
        type: "select",
        options: ["Đầy đủ 100% trang, gáy chắc chắn", "Hơi long gáy nhẹ nhưng đủ trang", "Có sờn rách mép bìa"],
      },
    ],
  },
  cat_furniture: {
    categoryName: "Bàn ghế & Nội thất",
    icon: "Armchair",
    fields: [
      {
        key: "dimensions",
        label: "Kích thước (Dài x Rộng x Cao)",
        placeholder: "Ví dụ: 60 x 40 x 28 cm",
        type: "text",
      },
      {
        key: "material",
        label: "Chất liệu",
        placeholder: "Ví dụ: Gỗ công nghiệp MDF, chân sắt sơn tĩnh điện",
        type: "text",
      },
      {
        key: "sturdiness",
        label: "Độ vững chắc / Khả năng gập mở",
        placeholder: "Chọn độ vững",
        type: "select",
        options: ["Rất chắc chắn, gập mở êm ru", "Vững vàng, hơi rít nhẹ chân gập", "Hơi lung lay, cần siết lại ốc"],
      },
    ],
  },
  cat_electronics: {
    categoryName: "Đồ điện & Thiết bị",
    icon: "Zap",
    fields: [
      {
        key: "brand_model",
        label: "Thương hiệu & Tên Model",
        placeholder: "Ví dụ: Senko B102 hoặc Rạng Đông RD-RL-20",
        type: "text",
      },
      {
        key: "working_status",
        label: "Khả năng hoạt động",
        placeholder: "Chọn tình trạng hoạt động",
        type: "select",
        options: [
          "Hoạt động hoàn hảo 100% như mới",
          "Hoạt động tốt, ngoại hình có xước nhẹ",
          "Hoạt động bình thường, có lỗi nhỏ ngoại quan",
        ],
      },
      {
        key: "accessories",
        label: "Phụ kiện đi kèm",
        placeholder: "Ví dụ: Dây nguồn zin, củ sạc, hộp...",
        type: "text",
      },
    ],
  },
  cat_living: {
    categoryName: "Đồ dùng KTX & Sinh hoạt",
    icon: "Home",
    fields: [
      {
        key: "dimensions",
        label: "Kích thước / Dung tích",
        placeholder: "Ví dụ: 1m x 2m độ dày 5cm hoặc 1.8 Lít",
        type: "text",
      },
      {
        key: "hygiene_status",
        label: "Tình trạng vệ sinh",
        placeholder: "Chọn tình trạng vệ sinh",
        type: "select",
        options: [
          "Đã giặt sấy thơm tho, dùng được ngay",
          "Đã lau chùi sạch sẽ không một hạt bụi",
          "Người mua nên giặt/rửa lại trước khi dùng",
        ],
      },
      {
        key: "usage_time",
        label: "Thời gian đã sử dụng",
        placeholder: "Ví dụ: Dùng 1 học kỳ (khoảng 4 tháng)",
        type: "text",
      },
    ],
  },
  cat_others: {
    categoryName: "Phương tiện & Khác",
    icon: "Package",
    fields: [
      {
        key: "origin",
        label: "Nguồn gốc xuất xứ",
        placeholder: "Ví dụ: Mua lại từ sinh viên K19 Bách Khoa",
        type: "text",
      },
      {
        key: "defects",
        label: "Khuyết điểm lưu ý",
        placeholder: "Ví dụ: Yên xe hơi bạc màu, lốp và phanh hoạt động rất tốt",
        type: "text",
      },
      {
        key: "accessories",
        label: "Phụ kiện tặng kèm",
        placeholder: "Ví dụ: Rổ sắt, chuông xe, khóa dây...",
        type: "text",
      },
    ],
  },
};

export interface DisplaySpecItem {
  key: string;
  label: string;
  value: string;
  isHighlight?: boolean;
}

/**
 * Giải mã an toàn chuỗi JSON attributes từ DB thành Object
 */
export function parseProductAttributes(
  raw: string | Record<string, any> | null | undefined
): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Trừu tượng hóa việc trích xuất danh sách thông số kỹ thuật hiển thị ra giao diện
 * Tự động ánh xạ nhãn tiếng Việt theo danh mục mà UI không cần tự xử lý JSON
 */
export function extractDisplaySpecs(
  categoryId: string,
  rawAttributes: string | Record<string, any> | null | undefined
): DisplaySpecItem[] {
  const attrs = parseProductAttributes(rawAttributes);
  const config = CATEGORY_SPEC_CONFIG[categoryId];
  const items: DisplaySpecItem[] = [];
  const usedKeys = new Set<string>();

  if (config?.fields) {
    for (const field of config.fields) {
      usedKeys.add(field.key);
      const val = attrs[field.key];
      if (val && typeof val === "string" && val.trim() !== "") {
        items.push({
          key: field.key,
          label: field.label,
          value: val.trim(),
          isHighlight: field.key === "defects",
        });
      }
    }
  }

  const EXTRA_LABELS: Record<string, string> = {
    defects: "Lưu ý ngoại hình",
    book_cover: "Tình trạng bìa",
    specs_note: "Ghi chú thêm",
    origin: "Nguồn gốc",
    usage_time: "Thời gian đã dùng",
  };

  for (const [k, v] of Object.entries(attrs)) {
    if (!usedKeys.has(k) && v && typeof v === "string" && v.trim() !== "") {
      items.push({
        key: k,
        label: EXTRA_LABELS[k] || k,
        value: v.trim(),
        isHighlight: k === "defects",
      });
    }
  }

  return items;
}


