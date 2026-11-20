import { ProductCardData } from "@/components/products/ProductCard";
import { CategoryItem } from "@/components/home/CategoryGrid";

export const FALLBACK_CATEGORIES: CategoryItem[] = [
  {
    id: "giao-trinh-sach",
    slug: "giao-trinh-sach",
    name: "Giáo trình & Sách học",
    description: "Tài liệu ôn thi, đề cương các khóa",
    count: "140+ tin",
    imageUrl: "/categories/giao-trinh-sach.jpg",
    icon: "book",
  },
  {
    id: "ban-ghe-tu-ktx",
    slug: "ban-ghe-tu-ktx",
    name: "Bàn ghế & Tủ KTX",
    description: "Bàn học gấp, ghế xoay, tủ vải",
    count: "85+ tin",
    imageUrl: "/categories/ban-ghe-tu-ktx.jpg",
    icon: "archive",
  },
  {
    id: "do-gia-dung-quat",
    slug: "do-gia-dung-quat",
    name: "Đồ gia dụng & Quạt",
    description: "Quạt Senko, ấm siêu tốc, nồi cơm",
    count: "110+ tin",
    imageUrl: "/categories/do-gia-dung-quat.jpg",
    icon: "bolt",
  },
  {
    id: "do-dien-tu-phu-kien",
    slug: "do-dien-tu-phu-kien",
    name: "Đồ điện tử & Máy tính",
    description: "Casio fx-580, chuột, bàn phím",
    count: "95+ tin",
    imageUrl: "/categories/do-dien-tu-phu-kien.jpg",
    icon: "chip",
  },
  {
    id: "xe-dap-phuong-tien",
    slug: "xe-dap-phuong-tien",
    name: "Xe đạp & Phương tiện",
    description: "Xe đạp làng ĐH, mũ bảo hiểm",
    count: "40+ tin",
    imageUrl: "/categories/xe-dap-phuong-tien.jpg",
    icon: "truck",
  },
  {
    id: "goc-0d-cho-tang",
    slug: "goc-0d-cho-tang",
    name: "Đồ tặng miễn phí",
    description: "Đồ dùng, giáo trình miễn phí 0đ",
    count: "50+ tin",
    imageUrl: "/categories/goc-0d-cho-tang.jpg",
    icon: "gift",
  },
];

export const FALLBACK_SCHOOLS = [
  { id: "ktx-b", name: "KTX Khu B - ĐHQG TP.HCM", shortName: "KTX Khu B" },
  { id: "ktx-a", name: "KTX Khu A - ĐHQG TP.HCM", shortName: "KTX Khu A" },
  { id: "hcmut", name: "Trường ĐH Bách Khoa - ĐHQG TP.HCM", shortName: "ĐH Bách Khoa" },
  { id: "hcmus", name: "Trường ĐH Khoa học Tự nhiên", shortName: "ĐH KHTN" },
  { id: "ueh", name: "Trường ĐH Kinh tế TP.HCM (UEH)", shortName: "UEH" },
  { id: "uit", name: "Trường ĐH Công nghệ Thông tin (UIT)", shortName: "ĐH CNTT" },
];

export const FALLBACK_PRODUCTS: ProductCardData[] = [
  {
    id: "demo-casio-580",
    title: "Máy tính Casio fx-580VNX chính hãng Bitex (Đời chủ #2, nguyên tem)",
    price: 380000,
    isFree: false,
    condition: "Mới 98%",
    zaloPhone: "0909123456",
    school: {
      id: "ktx-b",
      name: "KTX Khu B - ĐHQG TP.HCM",
      shortName: "KTX Khu B",
    },
    category: {
      id: "do-dien-tu-phu-kien",
      name: "Đồ điện tử & Máy tính",
      slug: "do-dien-tu-phu-kien",
    },
    seller: {
      id: "user-nam",
      displayName: "Nguyễn Hoàng Nam",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      isStudentVerified: true,
      reputationScore: 4.95,
      reviewCount: 6,
      completedOrdersCount: 8,
      dorm: "Tòa B4 - KTX Khu B",
    },
    item: {
      id: "item-casio-1",
      passportEnabled: true,
      passportId: "0x6a8f12c4b7890123456789abcdef0123456789abcdef0123456789abcdef01",
      passportStatus: "ACTIVE",
      owners: [
        { seq: 1, showName: false },
        { seq: 2, showName: true },
      ],
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=600",
      },
    ],
  },
  {
    id: "demo-quat-senko",
    title: "Quạt lỡ Senko êm ru, gió mạnh tiết kiệm điện phòng KTX",
    price: 130000,
    isFree: false,
    condition: "Còn rất tốt",
    zaloPhone: "0909123456",
    school: {
      id: "ktx-b",
      name: "KTX Khu B - ĐHQG TP.HCM",
      shortName: "KTX Khu B",
    },
    category: {
      id: "do-gia-dung-quat",
      name: "Đồ gia dụng & Quạt",
      slug: "do-gia-dung-quat",
    },
    seller: {
      id: "user-nam",
      displayName: "Nguyễn Hoàng Nam",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      isStudentVerified: true,
      reputationScore: 4.95,
      reviewCount: 6,
      completedOrdersCount: 8,
      dorm: "Tòa B4 - KTX Khu B",
    },
    item: {
      id: "item-fan-1",
      passportEnabled: true,
      passportId: "0x7b9a23d5c890123456789abcdef0123456789abcdef0123456789abcdef02",
      passportStatus: "ACTIVE",
      owners: [{ seq: 1, showName: true }],
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1618941716939-553df3c6c278?w=600",
      },
    ],
  },
  {
    id: "demo-giao-trinh-giai-tich",
    title: "Bộ Giáo trình Giải tích 1 & 2 ĐHQG kèm tuyển tập đề thi (Tặng 0đ)",
    price: 0,
    isFree: true,
    condition: "Đã sử dụng",
    zaloPhone: "0918765432",
    school: {
      id: "ktx-b",
      name: "KTX Khu B - ĐHQG TP.HCM",
      shortName: "KTX Khu B",
    },
    category: {
      id: "goc-0d-cho-tang",
      name: "Đồ tặng miễn phí",
      slug: "goc-0d-cho-tang",
    },
    seller: {
      id: "user-yen",
      displayName: "Trần Hải Yến",
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
      isStudentVerified: true,
      reputationScore: 5.0,
      reviewCount: 0,
      completedOrdersCount: 0,
      dorm: "Tòa BA1 - KTX Khu B",
    },
    item: null,
    images: [
      {
        url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600",
      },
    ],
  },
];

