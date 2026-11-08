// @ts-ignore
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

// Khởi tạo thư mục data và file SQLite cục bộ
const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "unicycle.db");
const db = new DatabaseSync(dbPath);

// Bật chế độ WAL và ràng buộc khóa ngoại (foreign keys)
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  -- 1. Bảng Người dùng (Sinh viên)
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    university TEXT,
    campus_location TEXT,
    avatar_url TEXT,
    bio TEXT,
    wallet_address TEXT,
    role TEXT DEFAULT 'USER',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- 2. Bảng Danh mục sản phẩm (Đa danh mục: Sách, Nội thất, Đồ điện, KTX...)
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  -- 3. Bảng Sản phẩm đồ cũ (Đầy đủ thuộc tính cần thiết)
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    condition TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    category_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    pickup_location TEXT NOT NULL,
    attributes TEXT,
    passport_hash TEXT,
    view_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories (id),
    FOREIGN KEY (seller_id) REFERENCES users (id)
  );

  -- 4. Bảng Hình ảnh sản phẩm (Hỗ trợ nhiều ảnh cho mỗi món đồ)
  CREATE TABLE IF NOT EXISTS product_images (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    url TEXT NOT NULL,
    is_cover INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
  );

  -- 5. Bảng Yêu thích / Lưu tin
  CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
  );

  -- Tạo index tối ưu truy vấn
  CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);
  CREATE INDEX IF NOT EXISTS idx_products_seller ON products (seller_id);
  CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);
  CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);
`);

// Tự động khởi tạo dữ liệu mẫu (Seed) nếu database mới tạo
function ensureSeeded() {
  const check = db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
  if (check && check.count > 0) return;

  const now = new Date().toISOString();

  // Tạo hash mật khẩu mặc định: Password123
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync("Password123", salt, 64);
  const passwordHash = `${salt}:${derivedKey.toString("hex")}`;

  // 1. Danh mục đồ cũ sinh viên
  const categories = [
    {
      id: "cat_books",
      name: "Sách & Giáo trình",
      slug: "sach-giao-trinh",
      description: "Giáo trình đại học, sách tham khảo, tài liệu tiếng Anh, cương lĩnh...",
      icon: "Book",
      display_order: 1,
    },
    {
      id: "cat_furniture",
      name: "Bàn ghế & Nội thất",
      slug: "ban-ghe-noi-that",
      description: "Bàn gấp, ghế xoay, kệ sách mini, sào quần áo, gương soi cho phòng trọ",
      icon: "Armchair",
      display_order: 2,
    },
    {
      id: "cat_electronics",
      name: "Đồ điện & Thiết bị",
      slug: "do-dien-thiet-bi",
      description: "Quạt điện, đèn bàn học, bàn phím/chuột, ấm đun nước, tai nghe sinh viên",
      icon: "Zap",
      display_order: 3,
    },
    {
      id: "cat_living",
      name: "Đồ dùng KTX & Sinh hoạt",
      slug: "do-dung-ktx-sinh-hoat",
      description: "Mền gối, nệm gấp, hộp cơm cắm điện, giá để giày, chậu giặt, móc áo",
      icon: "Home",
      display_order: 4,
    },
    {
      id: "cat_others",
      name: "Phương tiện & Khác",
      slug: "phuong-tien-khac",
      description: "Xe đạp, vali, balo sinh viên, dụng cụ thể thao, đồ lưu niệm...",
      icon: "Package",
      display_order: 5,
    },
  ];

  const insertCat = db.prepare(`
    INSERT INTO categories (id, name, slug, description, icon, display_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const c of categories) {
    insertCat.run(c.id, c.name, c.slug, c.description, c.icon, c.display_order, now);
  }

  // 2. Tài khoản sinh viên mẫu
  const users = [
    {
      id: "usr_an_nguyen",
      email: "an.nguyen@student.hcmut.edu.vn",
      full_name: "Nguyễn Văn An",
      phone: "0912345678",
      university: "ĐH Bách Khoa TP.HCM",
      campus_location: "KTX Khu A ĐHQG (Dĩ An)",
      avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      bio: "Sinh viên năm 4 Khoa CNTT - Bách Khoa. Dọn phòng chuẩn bị tốt nghiệp nên thanh lý nhiều đồ dùng học tập.",
      role: "USER",
    },
    {
      id: "usr_mai_tran",
      email: "mai.tran@student.hcmus.edu.vn",
      full_name: "Trần Thị Mai",
      phone: "0987654321",
      university: "ĐH Khoa học Tự nhiên",
      campus_location: "KTX Khu B ĐHQG (Nhà B4)",
      avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      bio: "Sinh viên năm 3 ngành Sinh học. Đồ dùng giữ gìn cẩn thận, sạch sẽ, ưu tiên giao dịch trực tiếp trong KTX Khu B.",
      role: "USER",
    },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, phone, university, campus_location, avatar_url, bio, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const u of users) {
    insertUser.run(u.id, u.email, passwordHash, u.full_name, u.phone, u.university, u.campus_location, u.avatar_url, u.bio, u.role, now, now);
  }

  // 3. Món đồ cũ sinh viên mẫu
  const products = [
    {
      id: "prod_ban_hoc_gap",
      title: "Bàn học gấp gọn chân sắt kèm giá sách mini cho KTX",
      slug: "ban-hoc-gap-gon-chan-sat-kem-gia-sach-mini",
      description: "Bàn mình mua từ đầu năm 2 dùng học bài trên giường hoặc dưới sàn. Chân sắt gập mở chắc chắn, không bị lung lay, bề mặt gỗ công nghiệp có viền cao su, có khe cắm iPad tiện lợi. Tặng kèm giá sách nhựa mini 2 tầng để bàn.",
      price: 140000,
      condition: "LIKE_NEW",
      category_id: "cat_furniture",
      seller_id: "usr_an_nguyen",
      pickup_location: "KTX Khu A ĐHQG (Tòa A15)",
      view_count: 42,
      images: [
        "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80",
      ],
    },
    {
      id: "prod_giao_trinh_toan",
      title: "Combo Giáo trình Giải tích 1, 2 & Đại số tuyến tính ĐHQG",
      slug: "combo-giao-trinh-giai-tich-dai-so-tuyen-tinh",
      description: "Bộ sách chuẩn dành cho tân sinh viên khối kỹ thuật ĐHQG TP.HCM. Bìa bọc nilon sạch đẹp, các trang bên trong có bút chì ghi chú công thức quan trọng thi giữa kỳ và cuối kỳ. Tặng kèm tập tài liệu ôn tập giải đề cương các năm.",
      price: 65000,
      condition: "GOOD",
      category_id: "cat_books",
      seller_id: "usr_an_nguyen",
      pickup_location: "Cổng chính ĐH Bách Khoa Cơ sở Dĩ An",
      view_count: 89,
      images: [
        "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80",
      ],
    },
    {
      id: "prod_quat_ban_senko",
      title: "Quạt bàn Senko mini 3 cánh chạy êm ru cho phòng trọ",
      slug: "quat-ban-senko-mini-3-canh-chay-em-ru",
      description: "Quạt mua hè năm ngoái, công suất 28W tiết kiệm điện tối đa. 3 mức gió mát mẻ, lồng quạt đã được tháo rửa sạch sẽ không một hạt bụi. Dây điện zin nguyên bản, cắm là chạy êm ru không rung lắc.",
      price: 95000,
      condition: "LIKE_NEW",
      category_id: "cat_electronics",
      seller_id: "usr_mai_tran",
      pickup_location: "KTX Khu B ĐHQG (Nhà B4)",
      view_count: 67,
      images: [
        "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&auto=format&fit=crop&q=80",
      ],
    },
    {
      id: "prod_den_chong_can",
      title: "Đèn học LED chống cận Rạng Đông ánh sáng vàng dịu mắt",
      slug: "den-hoc-led-chong-can-rang-dong",
      description: "Đèn học chính hãng Rạng Đông ánh sáng vàng dịu mắt không gây chói, cần đèn có thể uốn gập 360 độ tùy chỉnh góc soi. Công tắc cảm ứng 3 mức sáng. Rất thích hợp thức đêm ôn thi mà không làm phiền bạn cùng phòng.",
      price: 85000,
      condition: "LIKE_NEW",
      category_id: "cat_electronics",
      seller_id: "usr_mai_tran",
      pickup_location: "KTX Khu B ĐHQG hoặc Cổng KHTN Linh Trung",
      view_count: 53,
      images: [
        "https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=800&auto=format&fit=crop&q=80",
      ],
    },
    {
      id: "prod_nem_gap_3",
      title: "Nệm gấp 3 bông ép Hàn Quốc 1m x 2m dọn phòng thanh lý",
      slug: "nem-gap-3-bong-ep-han-quoc-1m-x-2m",
      description: "Nệm gấp 3 khúc gọn gàng, độ dày 5cm nâng đỡ lưng rất tốt khi nằm sàn phòng trọ. Vỏ gấm sạch sẽ, ruột bông ép cứng không xẹp lún. Mình chuyển sang phòng có giường nên thanh lý nhanh cho bạn nào cần.",
      price: 180000,
      condition: "GOOD",
      category_id: "cat_living",
      seller_id: "usr_mai_tran",
      pickup_location: "Khu trọ hẻm 8 Hoàng Diệu 2, TP. Thủ Đức",
      view_count: 112,
      images: [
        "https://images.unsplash.com/photo-1615873968403-89e068629265?w=800&auto=format&fit=crop&q=80",
      ],
    },
    {
      id: "prod_xe_dap_mini",
      title: "Xe đạp mini cào cào đi học và đi chợ siêu bền",
      slug: "xe-dap-mini-cao-cao-di-hoc-va-di-cho",
      description: "Xe đạp khung sắt chắc chắn, lốp mới thay tháng trước đi rất nhẹ. Có rổ sắt đựng cặp sách balo, chuông reo vang, yên xe êm ái. Rất thích hợp đạp quanh làng đại học hoặc sang các giảng đường.",
      price: 390000,
      condition: "GOOD",
      category_id: "cat_others",
      seller_id: "usr_an_nguyen",
      pickup_location: "KTX Khu A ĐHQG",
      view_count: 145,
      images: [
        "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop&q=80",
      ],
    },
  ];

  const insertProduct = db.prepare(`
    INSERT INTO products (id, title, slug, description, price, condition, status, category_id, seller_id, pickup_location, view_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?)
  `);

  const insertImg = db.prepare(`
    INSERT INTO product_images (id, product_id, url, is_cover, display_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const p of products) {
    insertProduct.run(
      p.id,
      p.title,
      p.slug,
      p.description,
      p.price,
      p.condition,
      p.category_id,
      p.seller_id,
      p.pickup_location,
      p.view_count,
      now,
      now
    );

    p.images.forEach((url, idx) => {
      insertImg.run(`${p.id}_img_${idx}`, p.id, url, idx === 0 ? 1 : 0, idx, now);
    });
  }
}

// Chạy seeder ngay khi module được load
ensureSeeded();

export default db;

// Định nghĩa TypeScript Types
export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  phone: string | null;
  university: string | null;
  campus_location: string | null;
  avatar_url: string | null;
  bio: string | null;
  wallet_address: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  display_order: number;
  created_at: string;
  product_count?: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  is_cover: number;
  display_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR";
  status: "ACTIVE" | "RESERVED" | "SOLD" | "HIDDEN";
  category_id: string;
  seller_id: string;
  pickup_location: string;
  attributes: string | null;
  passport_hash: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  category?: Category;
  seller?: {
    id: string;
    full_name: string;
    university: string | null;
    campus_location: string | null;
    avatar_url: string | null;
    phone: string | null;
  };
  images?: ProductImage[];
}

