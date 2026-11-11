// @ts-ignore
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { generatePassportHash } from "./passport";
import { generateStudentWallet } from "./blockchain";

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
    point_balance INTEGER DEFAULT 0,
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

  -- 6. Bảng Lịch sử Tuần hoàn Sở hữu (Chain of Ownership)
  CREATE TABLE IF NOT EXISTS ownership_history (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    university TEXT,
    cohort TEXT,
    period TEXT,
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
  );

  -- 7. Bảng Lịch sử Giao dịch Điểm UniPoint (1 VNĐ = 1 UNIP)
  CREATE TABLE IF NOT EXISTS point_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    direction TEXT NOT NULL,
    reference_id TEXT,
    description TEXT NOT NULL,
    tx_hash TEXT,
    chain_mode TEXT DEFAULT 'ONCHAIN',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  );

  -- 8. Bảng Đơn Đặt cọc Giữ chỗ Smart Escrow (Lưu vết kèm Passport Hash & Tự xử lý 2 chiều)
  CREATE TABLE IF NOT EXISTS escrow_orders (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    buyer_wallet TEXT NOT NULL,
    seller_wallet TEXT NOT NULL,
    amount INTEGER NOT NULL,
    passport_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'LOCKED',
    lock_tx_hash TEXT,
    settle_tx_hash TEXT,
    chain_mode TEXT DEFAULT 'ONCHAIN',
    expires_at TEXT,
    extended_count INTEGER DEFAULT 0,
    meeting_note TEXT,
    cancel_reason TEXT,
    cancel_requested_by TEXT,
    cancel_requested_at TEXT,
    inspection_checked INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    settled_at TEXT,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users (id),
    FOREIGN KEY (seller_id) REFERENCES users (id)
  );

  -- 9. Bảng Yêu cầu Nạp điểm 2 bước (PENDING -> CONFIRMED / EXPIRED / CANCELLED)
  CREATE TABLE IF NOT EXISTS topup_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reference_code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    tx_hash TEXT,
    chain_mode TEXT DEFAULT 'ONCHAIN',
    expires_at TEXT NOT NULL,
    confirmed_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  );

  -- 10. Bảng Lịch sử Phiên bản Chỉnh sửa Sản phẩm (Minh bạch hóa UniCycle Passport)
  CREATE TABLE IF NOT EXISTS product_revisions (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    editor_id TEXT NOT NULL,
    revision_number INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    price REAL NOT NULL,
    condition TEXT NOT NULL,
    pickup_location TEXT NOT NULL,
    description TEXT NOT NULL,
    specs_json TEXT,
    data_hash TEXT NOT NULL,
    change_summary TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    FOREIGN KEY (editor_id) REFERENCES users (id)
  );

  -- Tạo index tối ưu truy vấn
  CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);
  CREATE INDEX IF NOT EXISTS idx_products_seller ON products (seller_id);
  CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);
  CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);
  CREATE INDEX IF NOT EXISTS idx_ownership_product ON ownership_history (product_id);
  CREATE INDEX IF NOT EXISTS idx_point_tx_user ON point_transactions (user_id);
  CREATE INDEX IF NOT EXISTS idx_escrow_product ON escrow_orders (product_id);
  CREATE INDEX IF NOT EXISTS idx_escrow_buyer ON escrow_orders (buyer_id);
  CREATE INDEX IF NOT EXISTS idx_escrow_seller ON escrow_orders (seller_id);
  CREATE INDEX IF NOT EXISTS idx_topup_user ON topup_requests (user_id);
  CREATE INDEX IF NOT EXISTS idx_topup_status ON topup_requests (status);
  CREATE INDEX IF NOT EXISTS idx_revisions_product ON product_revisions (product_id, revision_number);
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
      attributes: {
        dimensions: "60 x 40 x 28 cm",
        material: "Mặt gỗ ép viền cao su bo góc, chân sắt sơn tĩnh điện",
        sturdiness: "Rất chắc chắn, gập mở êm ru",
        defects: "Viền trầy nhẹ góc phải 1mm, chân gập còn mới nguyên",
      },
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
      attributes: {
        edition: "NXB ĐHQG TP.HCM 2023",
        annotations: "Có ghi chú bút chì (gôm được)",
        missing_pages: "Đầy đủ 100% trang, gáy chắc chắn",
        book_cover: "Bọc nilon sạch sẽ",
      },
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
      attributes: {
        brand_model: "Senko B102",
        working_status: "Hoạt động hoàn hảo 100% như mới",
        power: "28W (220V - 50Hz)",
        accessories: "Dây nguồn zin nguyên bản kèm phích cắm đúc",
      },
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
      attributes: {
        brand_model: "Rạng Đông RD-RL-20.LED",
        working_status: "Hoạt động hoàn hảo 100% như mới",
        accessories: "Củ sạc và dây cắm chính hãng",
      },
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
      attributes: {
        dimensions: "1m x 2m x 5cm",
        core_material: "Ruột bông ép Hàn Quốc chống lún",
        hygiene_status: "Đã giặt sấy thơm tho, dùng được ngay",
        usage_time: "Dùng 1 học kỳ (khoảng 4 tháng)",
      },
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
      attributes: {
        origin: "Mua lại từ sinh viên K19 Bách Khoa",
        defects: "Yên xe hơi bạc màu, khung xe và xích líp phanh tốt 100%",
        accessories: "Kèm rổ sắt, chuông, gac-baga sau",
      },
      images: [
        "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop&q=80",
      ],
    },
  ];

  const insertProduct = db.prepare(`
    INSERT INTO products (id, title, slug, description, price, condition, status, category_id, seller_id, pickup_location, attributes, passport_hash, view_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertImg = db.prepare(`
    INSERT INTO product_images (id, product_id, url, is_cover, display_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const p of products) {
    const attrJson = p.attributes ? JSON.stringify(p.attributes) : null;
    const passportHash = generatePassportHash({
      productId: p.id,
      title: p.title,
      categoryId: p.category_id,
      sellerId: p.seller_id,
      condition: p.condition,
      price: p.price,
      pickupLocation: p.pickup_location,
      description: p.description,
      images: p.images,
      attributes: p.attributes || {},
      createdAt: now,
    });

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
      attrJson,
      passportHash,
      p.view_count,
      now,
      now
    );

    p.images.forEach((url, idx) => {
      insertImg.run(`${p.id}_img_${idx}`, p.id, url, idx === 0 ? 1 : 0, idx, now);
    });
  }

  // Tự động kiểm tra và nâng cấp dữ liệu cho các sản phẩm đã có trong DB nếu chưa có passport_hash
  const sampleAttributesMap: Record<string, any> = {
    prod_ban_hoc_gap: {
      dimensions: "60 x 40 x 28 cm",
      material: "Mặt gỗ ép viền cao su bo góc, chân sắt sơn tĩnh điện",
      sturdiness: "Rất chắc chắn, gập mở êm ru",
      defects: "Viền trầy nhẹ góc phải 1mm, chân gập còn mới nguyên",
    },
    prod_giao_trinh_toan: {
      edition: "NXB ĐHQG TP.HCM 2023",
      annotations: "Có ghi chú bút chì (gôm được)",
      missing_pages: "Đầy đủ 100% trang, gáy chắc chắn",
      book_cover: "Bọc nilon sạch sẽ",
    },
    prod_quat_ban_senko: {
      brand_model: "Senko B102",
      working_status: "Hoạt động hoàn hảo 100% như mới",
      power: "28W (220V - 50Hz)",
      accessories: "Dây nguồn zin nguyên bản kèm phích cắm đúc",
    },
    prod_den_chong_can: {
      brand_model: "Rạng Đông RD-RL-20.LED",
      working_status: "Hoạt động hoàn hảo 100% như mới",
      accessories: "Củ sạc và dây cắm chính hãng",
    },
    prod_nem_gap_3: {
      dimensions: "1m x 2m x 5cm",
      core_material: "Ruột bông ép Hàn Quốc chống lún",
      hygiene_status: "Đã giặt sấy thơm tho, dùng được ngay",
      usage_time: "Dùng 1 học kỳ (khoảng 4 tháng)",
    },
    prod_xe_dap_mini: {
      origin: "Mua lại từ sinh viên K19 Bách Khoa",
      defects: "Yên xe hơi bạc màu, khung xe và xích líp phanh tốt 100%",
      accessories: "Kèm rổ sắt, chuông, gac-baga sau",
    },
  };

  const existingProds = db
    .prepare(
      "SELECT id, title, category_id, seller_id, condition, price, pickup_location, description, created_at, attributes, passport_hash FROM products"
    )
    .all() as any[];

  for (const ep of existingProds) {
    if (!ep.passport_hash || !ep.attributes) {
      const attrs = ep.attributes ? JSON.parse(ep.attributes) : sampleAttributesMap[ep.id] || {};
      const imgs = (
        db
          .prepare(
            "SELECT url FROM product_images WHERE product_id = ? ORDER BY is_cover DESC, display_order ASC"
          )
          .all(ep.id) as any[]
      ).map((i) => i.url);

      const hash = generatePassportHash({
        productId: ep.id,
        title: ep.title,
        categoryId: ep.category_id,
        sellerId: ep.seller_id,
        condition: ep.condition,
        price: ep.price,
        pickupLocation: ep.pickup_location,
        description: ep.description,
        images: imgs,
        attributes: attrs,
        createdAt: ep.created_at,
      });

      db.prepare("UPDATE products SET attributes = ?, passport_hash = ? WHERE id = ?").run(
        JSON.stringify(attrs),
        hash,
        ep.id
      );
    }
  }
}

// Tự động kiểm tra và khởi tạo lịch sử tuần hoàn sở hữu (Chain of Ownership)
function ensureOwnershipHistory() {
  const countRow = db.prepare("SELECT COUNT(*) as count FROM ownership_history").get() as { count: number };
  if (countRow && countRow.count > 0) return;

  const now = new Date().toISOString();
  const insertHistory = db.prepare(`
    INSERT INTO ownership_history (id, product_id, owner_name, university, cohort, period, notes, order_index, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const sampleHistories = [
    {
      id: "own_ban_1",
      product_id: "prod_ban_hoc_gap",
      owner_name: "Hoàng Minh",
      university: "ĐH Bách Khoa (ĐHQG TP.HCM)",
      cohort: "K19 Kỹ thuật Máy tính",
      period: "2022 - 2024",
      notes: "Mua mới tại KTX Khu A, dùng học tập 2 năm.",
      order_index: 1,
    },
    {
      id: "own_ban_2",
      product_id: "prod_ban_hoc_gap",
      owner_name: "Nguyễn Văn An",
      university: "ĐH Bách Khoa (ĐHQG TP.HCM)",
      cohort: "K21 Cơ khí",
      period: "2024 - Hiện tại",
      notes: "Nhận lại từ anh khóa trên, mặt bàn còn rất mới, chân gập êm ru.",
      order_index: 2,
    },
    {
      id: "own_sach_1",
      product_id: "prod_giao_trinh_toan",
      owner_name: "Lê Quốc Tuấn",
      university: "ĐH Khoa học Tự nhiên",
      cohort: "K20 Công nghệ Thông tin",
      period: "2022 - 2023",
      notes: "Mua sách gốc tại NXB ĐHQG, đã qua môn Giải tích 1 đạt A.",
      order_index: 1,
    },
    {
      id: "own_sach_2",
      product_id: "prod_giao_trinh_toan",
      owner_name: "Trần Thị Mai",
      university: "ĐH Kinh tế - Luật",
      cohort: "K22 Tài chính",
      period: "2023 - Hiện tại",
      notes: "Bọc bìa nilon sạch sẽ, chỉ ghi chú bằng bút chì gôm được.",
      order_index: 2,
    },
    {
      id: "own_den_1",
      product_id: "prod_den_hoc_rangdong",
      owner_name: "Phạm Hải Đăng",
      university: "ĐH Sư phạm Kỹ thuật",
      cohort: "K21 Điện - Điện tử",
      period: "2023 - 2024",
      notes: "Đèn học chống cận 3 màu, dùng phòng trọ ôn thi cuối kỳ rất tốt.",
      order_index: 1,
    },
    {
      id: "own_den_2",
      product_id: "prod_den_hoc_rangdong",
      owner_name: "Nguyễn Văn An",
      university: "ĐH Bách Khoa (ĐHQG TP.HCM)",
      cohort: "K21 Cơ khí",
      period: "2024 - Hiện tại",
      notes: "Dùng tốt, sẵn sàng chuyền lại cho đàn em khóa sau.",
      order_index: 2,
    },
    {
      id: "own_quat_1",
      product_id: "prod_quat_dung_senko",
      owner_name: "Trần Văn Bình",
      university: "ĐH Công nghệ Thông tin",
      cohort: "K20 An toàn Thông tin",
      period: "2022 - 2024",
      notes: "Quạt Senko chính hãng, đã tra dầu bạc định kỳ, chạy cực êm.",
      order_index: 1,
    },
    {
      id: "own_quat_2",
      product_id: "prod_quat_dung_senko",
      owner_name: "Trần Thị Mai",
      university: "ĐH Kinh tế - Luật",
      cohort: "K22 Tài chính",
      period: "2024 - Hiện tại",
      notes: "Dùng mát mùa hè KTX, cánh quạt sạch sẽ không bám bụi.",
      order_index: 2,
    },
  ];

  sampleHistories.forEach((h) => {
    insertHistory.run(h.id, h.product_id, h.owner_name, h.university, h.cohort, h.period, h.notes, h.order_index, now);
  });
}

// Tự động nâng cấp cột point_balance và cấp địa chỉ ví riêng (0x...) cho toàn bộ sinh viên
function ensurePhase3Wallets() {
  const userCols = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  const hasPointBalance = userCols.some((c) => c.name === "point_balance");
  if (!hasPointBalance) {
    db.exec("ALTER TABLE users ADD COLUMN point_balance INTEGER DEFAULT 0;");
  }

  const usersWithoutWallet = db
    .prepare("SELECT id, wallet_address FROM users WHERE wallet_address IS NULL OR wallet_address = ''")
    .all() as Array<{ id: string; wallet_address: string | null }>;

  if (usersWithoutWallet.length > 0) {
    const updateWallet = db.prepare("UPDATE users SET wallet_address = ? WHERE id = ?");
    for (const u of usersWithoutWallet) {
      const { address } = generateStudentWallet();
      updateWallet.run(address, u.id);
    }
  }
}

/**
 * Đảm bảo một tài khoản sinh viên luôn có địa chỉ ví EVM riêng (0x...) và trả về thông tin ví
 */
export function ensureUserWallet(userId: string): {
  wallet_address: string;
  point_balance: number;
} | null {
  const row = db
    .prepare("SELECT id, wallet_address, point_balance FROM users WHERE id = ?")
    .get(userId) as { id: string; wallet_address: string | null; point_balance: number | null } | undefined;

  if (!row) return null;

  let walletAddress = row.wallet_address;
  if (!walletAddress) {
    walletAddress = generateStudentWallet().address;
    db.prepare("UPDATE users SET wallet_address = ? WHERE id = ?").run(walletAddress, userId);
  }

  return {
    wallet_address: walletAddress,
    point_balance: row.point_balance ?? 0,
  };
}

/**
 * Tự động nâng cấp Schema cho Phase 4:
 * - Bổ sung các cột quản lý hạn giữ chỗ 48h, gia hạn +24h và tự xử lý hủy 2 chiều trong escrow_orders
 * - Backfill hạn giữ chỗ 48h cho các đơn cũ nếu chưa có
 * - Khởi tạo bản ghi Revision #1 trong product_revisions cho tất cả sản phẩm hiện có
 */
function ensurePhase4Schema() {
  const escrowCols = db.prepare("PRAGMA table_info(escrow_orders)").all() as Array<{ name: string }>;
  const existingColNames = new Set(escrowCols.map((c) => c.name));

  const newEscrowColumns: Array<{ name: string; definition: string }> = [
    { name: "expires_at", definition: "TEXT" },
    { name: "extended_count", definition: "INTEGER DEFAULT 0" },
    { name: "meeting_note", definition: "TEXT" },
    { name: "cancel_reason", definition: "TEXT" },
    { name: "cancel_requested_by", definition: "TEXT" },
    { name: "cancel_requested_at", definition: "TEXT" },
    { name: "inspection_checked", definition: "INTEGER DEFAULT 0" },
  ];

  for (const col of newEscrowColumns) {
    if (!existingColNames.has(col.name)) {
      db.exec(`ALTER TABLE escrow_orders ADD COLUMN ${col.name} ${col.definition};`);
    }
  }

  // Backfill expires_at (+48h từ created_at) cho các đơn chưa có expires_at
  const ordersWithoutExpiry = db
    .prepare("SELECT id, created_at FROM escrow_orders WHERE expires_at IS NULL")
    .all() as Array<{ id: string; created_at: string }>;

  if (ordersWithoutExpiry.length > 0) {
    const updateExpiry = db.prepare("UPDATE escrow_orders SET expires_at = ? WHERE id = ?");
    for (const order of ordersWithoutExpiry) {
      const createdMs = Date.parse(order.created_at) || Date.now();
      const expiresIso = new Date(createdMs + 48 * 60 * 60 * 1000).toISOString();
      updateExpiry.run(expiresIso, order.id);
    }
  }

  // Khởi tạo Revision #1 cho các sản phẩm chưa có lịch sử phiên bản trong product_revisions
  const productsWithoutRevision = db
    .prepare(
      `SELECT p.id, p.title, p.price, p.condition, p.pickup_location, p.description,
              p.attributes, p.passport_hash, p.seller_id, p.created_at
       FROM products p
       LEFT JOIN product_revisions r ON p.id = r.product_id AND r.revision_number = 1
       WHERE r.id IS NULL`
    )
    .all() as Array<{
    id: string;
    title: string;
    price: number;
    condition: string;
    pickup_location: string;
    description: string;
    attributes: string | null;
    passport_hash: string | null;
    seller_id: string;
    created_at: string;
  }>;

  if (productsWithoutRevision.length > 0) {
    const insertRevision = db.prepare(
      `INSERT INTO product_revisions
        (id, product_id, editor_id, revision_number, title, price, condition, pickup_location, description, specs_json, data_hash, change_summary, created_at)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const prod of productsWithoutRevision) {
      const revId = `rev_${prod.id}_1`;
      insertRevision.run(
        revId,
        prod.id,
        prod.seller_id,
        prod.title,
        prod.price,
        prod.condition,
        prod.pickup_location,
        prod.description,
        prod.attributes,
        prod.passport_hash || "",
        "Khởi tạo hồ sơ UniCycle Passport khi đăng tin",
        prod.created_at || new Date().toISOString()
      );
    }
  }
}

/**
 * Helper ghi nhận phiên bản mới vào bảng product_revisions mỗi khi sản phẩm được tạo mới hoặc cập nhật
 */
export function recordProductRevision(params: {
  productId: string;
  editorId: string;
  title: string;
  price: number;
  condition: string;
  pickupLocation: string;
  description: string;
  specsJson: string | null;
  dataHash: string;
  changeSummary?: string;
}): ProductRevision {
  const now = new Date().toISOString();
  const latestRow = db
    .prepare(
      "SELECT COALESCE(MAX(revision_number), 0) as max_rev FROM product_revisions WHERE product_id = ?"
    )
    .get(params.productId) as { max_rev: number } | undefined;

  const nextRevision = (latestRow?.max_rev ?? 0) + 1;
  const revId = `rev_${crypto.randomBytes(8).toString("hex")}`;
  const summary =
    params.changeSummary ||
    (nextRevision === 1
      ? "Khởi tạo hồ sơ UniCycle Passport khi đăng tin"
      : `Cập nhật thông tin bài đăng (Phiên bản #${nextRevision})`);

  db.prepare(
    `INSERT INTO product_revisions
      (id, product_id, editor_id, revision_number, title, price, condition, pickup_location, description, specs_json, data_hash, change_summary, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    revId,
    params.productId,
    params.editorId,
    nextRevision,
    params.title,
    params.price,
    params.condition,
    params.pickupLocation,
    params.description,
    params.specsJson,
    params.dataHash,
    summary,
    now
  );

  return {
    id: revId,
    product_id: params.productId,
    editor_id: params.editorId,
    revision_number: nextRevision,
    title: params.title,
    price: params.price,
    condition: params.condition,
    pickup_location: params.pickupLocation,
    description: params.description,
    specs_json: params.specsJson,
    data_hash: params.dataHash,
    change_summary: summary,
    created_at: now,
  };
}

/**
 * Helper tính toán chính xác 3 chỉ số số dư của người dùng (chuẩn ứng dụng ngân hàng số):
 * - availableBalance: Số dư khả dụng hiện tại (sẵn sàng dùng để mua đồ)
 * - lockedBalance: Số điểm đang được giữ trong các đơn đặt mua chờ gặp mặt (LOCKED / CANCEL_REQUESTED)
 * - totalBalance = availableBalance + lockedBalance
 * Đồng thời tự động đánh dấu EXPIRED cho các lệnh nạp PENDING đã quá hạn 15 phút.
 */
export function getUserWalletSummary(userId: string): UserWalletSummary | null {
  const wallet = ensureUserWallet(userId);
  if (!wallet) return null;

  const now = new Date().toISOString();

  // Tự động đóng các lệnh nạp điểm PENDING đã hết hạn
  db.prepare(
    "UPDATE topup_requests SET status = 'EXPIRED' WHERE user_id = ? AND status = 'PENDING' AND expires_at < ?"
  ).run(userId, now);

  const buyerLockRow = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as locked_total,
              COUNT(*) as active_count
       FROM escrow_orders
       WHERE buyer_id = ? AND status IN ('LOCKED', 'CANCEL_REQUESTED')`
    )
    .get(userId) as { locked_total: number; active_count: number } | undefined;

  const sellerLockRow = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as incoming_total,
              COUNT(*) as incoming_count
       FROM escrow_orders
       WHERE seller_id = ? AND status IN ('LOCKED', 'CANCEL_REQUESTED')`
    )
    .get(userId) as { incoming_total: number; incoming_count: number } | undefined;

  const availableBalance = Number(wallet.point_balance || 0);
  const lockedBalance = Number(buyerLockRow?.locked_total || 0);
  const totalBalance = availableBalance + lockedBalance;

  return {
    wallet_address: wallet.wallet_address,
    availableBalance,
    lockedBalance,
    totalBalance,
    activeEscrowCount: Number(buyerLockRow?.active_count || 0),
    incomingLockedBalance: Number(sellerLockRow?.incoming_total || 0),
    incomingEscrowCount: Number(sellerLockRow?.incoming_count || 0),
  };
}

// Chạy seeder & migration ngay khi module được load
ensureSeeded();
ensureOwnershipHistory();
ensurePhase3Wallets();
ensurePhase4Schema();

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
  point_balance: number;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface UserWalletSummary {
  wallet_address: string;
  availableBalance: number;
  lockedBalance: number;
  totalBalance: number;
  activeEscrowCount: number;
  incomingLockedBalance: number;
  incomingEscrowCount: number;
}

export interface TopupRequest {
  id: string;
  user_id: string;
  amount: number;
  reference_code: string;
  status: "PENDING" | "CONFIRMED" | "EXPIRED" | "CANCELLED";
  tx_hash: string | null;
  chain_mode: "ONCHAIN" | "SIMULATED";
  expires_at: string;
  confirmed_at: string | null;
  created_at: string;
}

export interface ProductRevision {
  id: string;
  product_id: string;
  editor_id: string;
  revision_number: number;
  title: string;
  price: number;
  condition: string;
  pickup_location: string;
  description: string;
  specs_json: string | null;
  data_hash: string;
  change_summary: string;
  created_at: string;
  editor_name?: string;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  type: "MOMO_TOPUP" | "ESCROW_LOCK" | "ESCROW_RELEASE" | "ESCROW_REFUND";
  amount: number;
  direction: "IN" | "OUT";
  reference_id: string | null;
  description: string;
  tx_hash: string | null;
  chain_mode: "ONCHAIN" | "SIMULATED";
  created_at: string;
}

export interface EscrowOrder {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  buyer_wallet: string;
  seller_wallet: string;
  amount: number;
  passport_hash: string;
  status: "LOCKED" | "CANCEL_REQUESTED" | "RELEASED" | "COMPLETED" | "REFUNDED";
  lock_tx_hash: string | null;
  settle_tx_hash: string | null;
  chain_mode: "ONCHAIN" | "SIMULATED";
  expires_at: string | null;
  extended_count: number;
  meeting_note: string | null;
  cancel_reason: string | null;
  cancel_requested_by: string | null;
  cancel_requested_at: string | null;
  inspection_checked: number;
  created_at: string;
  settled_at: string | null;
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

export interface OwnershipRecord {
  id: string;
  product_id: string;
  owner_name: string;
  university?: string | null;
  cohort?: string | null;
  period?: string | null;
  notes?: string | null;
  order_index: number;
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
  ownership_history?: OwnershipRecord[];
  revisions?: ProductRevision[];
}

