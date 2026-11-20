"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { compressImage, CompressedImageResult } from "@/lib/utils/image-compress";
import { checkProhibitedContent } from "@/lib/utils/prohibited-words";
import {
  ItemJourneyTimeline,
  JourneyNextStep,
  JourneyOwnerStep,
} from "@/components/passport/ItemJourneyTimeline";

interface CategoryOption {
  id: string;
  slug: string;
  name: string;
}

interface SchoolOption {
  id: string;
  name: string;
  shortName: string;
}

interface CurrentUser {
  id: string;
  displayName: string;
  email: string;
  isStudentVerified: boolean;
  schoolId?: string | null;
  dorm?: string | null;
}

interface UploadedImage {
  id: string;
  url: string;
  sha256: string;
  compressedSize: number;
  originalSize: number;
  ratio: number;
}

interface ResellOwnerSnapshot {
  seq: number;
  isMe?: boolean;
  showName: boolean;
  displayName: string;
  realDisplayName?: string | null;
  since: string;
  schoolShortName?: string | null;
  txHash?: string | null;
}

// Dữ liệu mẫu demo nhanh để người dùng test trong 1 chạm
const DEMO_PRESETS = [
  {
    label: "Giáo trình Giải tích 1",
    title: "Giáo trình Giải tích 1 - ĐHQG TP.HCM (Kèm tập đề cương thi)",
    categorySlug: "giao-trinh-sach",
    condition: "Còn rất tốt",
    price: 35000,
    isFree: false,
    description: "Sách mới 95%, không rách, có ghi chú bút chì các dạng bài trọng tâm giữa kỳ và cuối kỳ. Tặng kèm tập photo đề thi có lời giải chi tiết cho bạn nào cần.",
    imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800",
  },
  {
    label: "Máy tính Casio fx-580",
    title: "Máy tính Casio fx-580VNX chính hãng Bitex (Nguyên tem, màn sáng đẹp)",
    categorySlug: "do-dien-tu-phu-kien",
    condition: "Mới 98%",
    price: 380000,
    isFree: false,
    description: "Máy tính mua từ năm nhất dùng thi đại học và toán cao cấp. Màn hình sắc nét, phím bấm êm, còn nắp đậy và nguyên tem bảo hành Bitex chính hãng.",
    imageUrl: "https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=800",
  },
  {
    label: "Quạt lỡ Senko",
    title: "Quạt bàn Senko B3 chạy êm ru, gió mạnh cho phòng KTX",
    categorySlug: "do-gia-dung-quat",
    condition: "Còn rất tốt",
    price: 120000,
    isFree: false,
    description: "Quạt chuyển phòng nên nhượng lại, 3 cấp tốc độ gió mát rượi, mô tơ êm không ồn ào lúc ngủ. Lồng quạt đã được tháo rửa sạch sẽ.",
    imageUrl: "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800",
  },
  {
    label: "Bàn học gấp KTX (0đ)",
    title: "Tặng bàn học gấp chân chữ U cho bạn sinh viên tân khóa",
    categorySlug: "goc-0d-cho-tang",
    condition: "Đã sử dụng",
    price: 0,
    isFree: true,
    description: "Mình sắp ra trường nên tặng lại bạn nào cần bàn học trên giường KTX. Chân bàn bằng thép sơn tĩnh điện vẫn cứng cáp, chỉ có vài vết trầy nhẹ ở mép.",
    imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800",
  },
];

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: "giao-trinh-sach", slug: "giao-trinh-sach", name: "Giáo trình & Sách" },
  { id: "do-dien-tu-phu-kien", slug: "do-dien-tu-phu-kien", name: "Đồ điện tử" },
  { id: "xe-dap-phuong-tien", slug: "xe-dap-phuong-tien", name: "Xe đạp & Di chuyển" },
  { id: "ban-ghe-tu-ktx", slug: "ban-ghe-tu-ktx", name: "Bàn ghế & Nội thất" },
  { id: "do-gia-dung-quat", slug: "do-gia-dung-quat", name: "Đồ gia dụng" },
  { id: "goc-0d-cho-tang", slug: "goc-0d-cho-tang", name: "Góc Cho Tặng" },
];

const DEFAULT_SCHOOLS: SchoolOption[] = [
  { id: "ktx-b", name: "KTX Khu B - ĐHQG TP.HCM", shortName: "KTX Khu B" },
  { id: "ktx-a", name: "KTX Khu A - ĐHQG TP.HCM", shortName: "KTX Khu A" },
  { id: "hcmut", name: "Trường ĐH Bách Khoa - ĐHQG TP.HCM", shortName: "ĐH Bách Khoa" },
  { id: "hcmus", name: "Trường ĐH Khoa học Tự nhiên", shortName: "ĐH KHTN" },
  { id: "ueh", name: "Trường ĐH Kinh tế TP.HCM (UEH)", shortName: "UEH" },
  { id: "uit", name: "Trường ĐH Công nghệ Thông tin (UIT)", shortName: "ĐH CNTT" },
];

// Helper tạo id ảnh sạch không gọi impure functions trong render
let imageCounter = 0;
function getNextImageId(prefix: string): string {
  imageCounter += 1;
  return `${prefix}-${imageCounter}`;
}

export function SellForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resellItemId = searchParams?.get("resellItemId") || null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Người dùng hiện tại
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Thông tin món đồ bán lại (BR24, BR25, BR33)
  const [resellItemData, setResellItemData] = useState<{
    id: string;
    title: string;
    passportId: string;
    categorySlug: string;
    myOwnerSeq: number;
    totalOwners: number;
    txHash?: string | null;
    owners: ResellOwnerSnapshot[];
  } | null>(null);
  const [availableResellItems, setAvailableResellItems] = useState<Array<{
    id: string;
    title: string;
    passportId: string;
    categorySlug: string;
    myOwnerSeq: number;
    totalOwners: number;
    showNameOnPassport: boolean;
    txHash?: string | null;
    isCurrentlyListed: boolean;
    owners: ResellOwnerSnapshot[];
  }>>([]);

  // Danh mục và Trường học
  const [categories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES);
  const [schools] = useState<SchoolOption[]>(DEFAULT_SCHOOLS);

  // Form states
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("giao-trinh-sach");
  const [condition, setCondition] = useState("Còn rất tốt");
  const [price, setPrice] = useState<string>("50000");
  const [isFree, setIsFree] = useState(false);
  const [description, setDescription] = useState("");
  const [schoolId, setSchoolId] = useState("ktx-b");
  const [zaloPhone, setZaloPhone] = useState("0987654321");
  const [hidePhone, setHidePhone] = useState(true);

  // Product Passport states (mặc định bật 100% Hộ chiếu số - chỉ giữ tùy chọn hiển thị tên)
  const [showNameOnPassport, setShowNameOnPassport] = useState(false);

  // Quản lý ảnh
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  // Trạng thái Submit & Dialog
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdListingResult, setCreatedListingResult] = useState<{
    id: string;
    passportId: string | null;
    txHash?: string | null;
    snowtraceUrl?: string | null;
    title: string;
  } | null>(null);

  // 1. Kiểm tra session đăng nhập
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
            if (data.user.schoolId) setSchoolId(data.user.schoolId);
          } else {
            // Chuyển hướng đăng nhập nếu chưa có session
            router.push("/login?returnTo=/sell");
          }
        }
      } catch (err) {
        console.warn("Lỗi kiểm tra auth:", err);
      } finally {
        setAuthChecked(true);
      }
    }

    checkAuth();
  }, [router]);

  // 1b. Tải danh sách đồ đang sở hữu & thông tin Bán Lại (Resell - BR24, BR25, BR33)
  useEffect(() => {
    if (!currentUser) return;

    let ignore = false;
    async function loadResellInfo() {
      try {
        const res = await fetch("/api/my-items", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const mappedItems = (data.items || [])
            .filter((i: { passportId?: string | null }) => Boolean(i.passportId))
            .map(
              (i: {
                id: string;
                title: string;
                passportId: string;
                category: { slug: string };
                myOwnerSeq?: number;
                totalOwners?: number;
                showNameOnPassport?: boolean;
                chainTx?: { txHash?: string | null } | null;
                isCurrentlyListed?: boolean;
                owners?: ResellOwnerSnapshot[];
              }) => ({
                id: i.id,
                title: i.title,
                passportId: i.passportId,
                categorySlug: i.category.slug,
                myOwnerSeq: i.myOwnerSeq || i.totalOwners || 1,
                totalOwners: i.totalOwners || 1,
                showNameOnPassport: Boolean(i.showNameOnPassport),
                txHash: i.chainTx?.txHash || null,
                isCurrentlyListed: Boolean(i.isCurrentlyListed),
                owners: Array.isArray(i.owners) ? i.owners : [],
              })
            );

          if (!ignore) {
            setAvailableResellItems(
              mappedItems.filter((item: { isCurrentlyListed: boolean }) => !item.isCurrentlyListed)
            );

            if (resellItemId) {
              const found = mappedItems.find((i: { id: string }) => i.id === resellItemId);
              if (found) {
                setResellItemData({
                  id: found.id,
                  title: found.title,
                  passportId: found.passportId,
                  categorySlug: found.categorySlug,
                  myOwnerSeq: found.myOwnerSeq,
                  totalOwners: found.totalOwners,
                  txHash: found.txHash,
                  owners: found.owners,
                });
                setTitle(found.title);
                const matchingCat = categories.find((c) => c.slug === found.categorySlug);
                if (matchingCat) setCategoryId(matchingCat.id);
                setShowNameOnPassport(found.showNameOnPassport);
              }
            }
          }
        }
      } catch (err) {
        console.warn("Lỗi tải thông tin bán lại:", err);
      }
    }

    loadResellInfo();
    return () => {
      ignore = true;
    };
  }, [currentUser, resellItemId, categories]);

  const handleSelectResellItem = (item: (typeof availableResellItems)[number]) => {
    setResellItemData({
      id: item.id,
      title: item.title,
      passportId: item.passportId,
      categorySlug: item.categorySlug,
      myOwnerSeq: item.myOwnerSeq,
      totalOwners: item.totalOwners,
      txHash: item.txHash || null,
      owners: item.owners,
    });
    setTitle(item.title);
    const matchingCat = categories.find((c) => c.slug === item.categorySlug);
    if (matchingCat) setCategoryId(matchingCat.id);
    setShowNameOnPassport(item.showNameOnPassport);
    setFormError(null);
  };

  const handleClearResellItem = () => {
    setResellItemData(null);
    if (resellItemId) {
      router.replace("/sell");
    }
  };

  // Xử lý nén và tải ảnh lên từ máy
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      setFormError("Tối đa 5 hình ảnh cho mỗi tin đăng.");
      return;
    }

    setFormError(null);
    setIsCompressing(true);

    try {
      const newImages: UploadedImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;

        const compressed: CompressedImageResult = await compressImage(file, 1200, 1200, 0.82);

        newImages.push({
          id: getNextImageId("img"),
          url: compressed.dataUrl,
          sha256: compressed.sha256,
          compressedSize: compressed.compressedSize,
          originalSize: compressed.originalSize,
          ratio: compressed.compressionRatio,
        });
      }

      setImages((prev) => [...prev, ...newImages]);
    } catch (err) {
      console.error("Lỗi nén ảnh:", err);
      setFormError("Không thể xử lý hình ảnh, vui lòng thử lại ảnh khác.");
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Xóa ảnh đã chọn
  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Chọn dữ liệu mẫu demo 1-chạm
  const handleApplyPreset = (preset: typeof DEMO_PRESETS[0], presetIndex: number) => {
    setTitle(preset.title);
    setCondition(preset.condition);
    setIsFree(preset.isFree);
    setPrice(preset.price.toString());
    setDescription(preset.description);

    // Tìm category
    const cat = categories.find((c) => c.slug === preset.categorySlug);
    if (cat) setCategoryId(cat.id);

    // Thêm ảnh preset nếu chưa có ảnh
    if (images.length === 0) {
      setImages([
        {
          id: getNextImageId(`preset-${presetIndex}`),
          url: preset.imageUrl,
          sha256: "0x7a8f1e2d3c4b5a6978899aabbccddeeff00112233445566778899aabbccddeef",
          compressedSize: 185000,
          originalSize: 1200000,
          ratio: 84,
        },
      ]);
    }

    setFormError(null);
  };

  // Xử lý nút gạt tặng miễn phí 0đ
  const handleToggleFree = (checked: boolean) => {
    setIsFree(checked);
    if (checked) {
      setPrice("0");
      const freeCat = categories.find((c) => c.slug === "goc-0d-cho-tang");
      if (freeCat) setCategoryId(freeCat.id);
    } else {
      if (price === "0") setPrice("50000");
    }
  };

  // Submit bài đăng
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Client-side validations
    if (images.length === 0) {
      setFormError("Vui lòng tải lên ít nhất 1 hình ảnh thật của món đồ.");
      return;
    }

    if (title.trim().length < 5) {
      setFormError("Tiêu đề món đồ cần ít nhất 5 ký tự.");
      return;
    }

    if (description.trim().length < 10) {
      setFormError("Mô tả chi tiết món đồ cần ít nhất 10 ký tự.");
      return;
    }

    if (!/^(0[3|5|7|8|9])[0-9]{8}$/.test(zaloPhone.trim())) {
      setFormError("Số điện thoại Zalo không đúng định dạng 10 chữ số.");
      return;
    }

    // Kiểm tra hàng cấm phía client
    const prohibited = checkProhibitedContent(`${title} ${description}`);
    if (prohibited) {
      setFormError(`Nội dung chứa từ khóa bị cấm: "${prohibited}". UniCycle không cho phép giao dịch chất kích thích, cồn, vũ khí trong môi trường học đường.`);
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        categoryId,
        price: isFree ? 0 : parseInt(price.replace(/\D/g, "")) || 0,
        isFree,
        condition,
        description: description.trim(),
        schoolId,
        zaloPhone: zaloPhone.trim(),
        hidePhone,
        passportEnabled: true,
        showNameOnPassport,
        resellItemId: resellItemData?.id || resellItemId || undefined,
        images: images.map((img) => ({
          url: img.url,
          sha256: img.sha256,
        })),
      };

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Không thể đăng tin, vui lòng thử lại.");
        return;
      }

      window.dispatchEvent(new Event("unicycle-listings-change"));

      // Đăng thành công: Mở modal chúc mừng
      setCreatedListingResult({
        id: data.listing.id,
        passportId: data.passportId,
        txHash: data.txHash || null,
        snowtraceUrl:
          data.snowtraceUrl ||
          (data.txHash ? `https://testnet.snowtrace.io/tx/${data.txHash}` : null),
        title: data.listing.title,
      });
    } catch (err) {
      console.error("Lỗi đăng tin:", err);
      setFormError("Đã xảy ra lỗi kết nối mạng. Vui lòng kiểm tra lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedSchool = schools.find((s) => s.id === schoolId) || schools[0];
  const isResellMode = Boolean(resellItemData || resellItemId);

  let journeySteps: JourneyOwnerStep[] = [];
  let journeyNextStep: JourneyNextStep | null = null;

  if (resellItemData) {
      const rawOwners: ResellOwnerSnapshot[] =
        resellItemData.owners.length > 0
          ? resellItemData.owners
          : [
              {
                seq: resellItemData.myOwnerSeq,
                isMe: true,
                showName: showNameOnPassport,
                displayName: showNameOnPassport
                  ? currentUser?.displayName || "Bạn"
                  : `Sinh viên ẩn danh (${selectedSchool?.shortName || "UniCycle"})`,
                realDisplayName: currentUser?.displayName || null,
                since: "",
                schoolShortName: selectedSchool?.shortName || null,
                txHash: resellItemData.txHash || null,
              },
            ];

      journeySteps = rawOwners.map((owner) => {
        const isFirst = owner.seq === 1;
        const isCurrent = Boolean(owner.isMe) || owner.seq === resellItemData.myOwnerSeq;
        const schoolShort =
          (isCurrent ? selectedSchool?.shortName : null) ||
          owner.schoolShortName ||
          "UniCycle";
        const ownerDisplayName = isCurrent
          ? showNameOnPassport
            ? owner.realDisplayName || currentUser?.displayName || "Bạn"
            : `Sinh viên ẩn danh (${schoolShort})`
          : owner.displayName;
        const schoolMeta =
          (isCurrent ? selectedSchool?.shortName : null) ||
          owner.schoolShortName ||
          "Khuôn viên Đại học";
        const datePart = owner.since
          ? ` • Từ ${new Date(owner.since).toLocaleDateString("vi-VN")}`
          : "";
        const eventPart = isFirst
          ? " • Đăng ký vào hệ thống UniCycle"
          : " • Xác nhận bàn giao kế thừa Passport";

        return {
          key: owner.seq,
          seq: owner.seq,
          title: `Đời chủ #${owner.seq}: ${ownerDisplayName}`,
          badgeLabel: isFirst
            ? "Khởi tạo"
            : isCurrent
            ? "Chủ hiện tại (Đang bán lại)"
            : "Đã chuyển nhượng",
          badgeTone: isFirst ? "origin" : isCurrent ? "current" : "transferred",
          isCurrent,
          metaText: `${schoolMeta}${datePart}${eventPart}`,
          txHash: owner.txHash || null,
        };
      });

      journeyNextStep = {
        title: `Đời chủ #${resellItemData.totalOwners + 1}: Người mua tiếp theo`,
        badgeLabel: "Kế thừa tiếp theo",
        description: `Tự động kế thừa tiếp nối hồ sơ xuất xứ (từ Đời chủ #${resellItemData.myOwnerSeq}) khi hoàn tất xác nhận trao tay.`,
      };
    } else {
      const schoolShort = selectedSchool?.shortName || "UniCycle";
      const ownerDisplayName = showNameOnPassport
        ? currentUser?.displayName || "Bạn"
        : `Sinh viên ẩn danh (${schoolShort})`;

      journeySteps = [
        {
          key: 1,
          seq: 1,
          title: `Đời chủ #1: ${ownerDisplayName}`,
          badgeLabel: "Khởi tạo",
          badgeTone: "origin",
          isCurrent: true,
          metaText: `${selectedSchool?.shortName || "Khuôn viên Đại học"} • Hôm nay • Đăng ký vào hệ thống UniCycle`,
        },
      ];

      journeyNextStep = {
        title: "Đời chủ #2: Người mua tiếp theo",
        badgeLabel: "Kế thừa tiếp theo",
        description:
          "Tự động kế thừa tiếp nối hồ sơ xuất xứ (từ Đời chủ #1) khi hoàn tất xác nhận trao tay.",
      };
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* 1. Header Đăng Tin & Thông điệp < 60s */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-[#D6E8EE] text-[#001B48]">
            Đăng tin dưới 60 giây
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Bảo vệ số điện thoại
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#018ABE] border border-blue-200">
            Tự động tạo hành trình đồ vật
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#001B48] tracking-tight">
          Đăng Bán & Sang Nhượng Đồ Dùng
        </h1>
        <p className="text-sm sm:text-base text-[#02457A] mt-1.5">
          Tiếp nối vòng đời đồ dùng học tập, kết nối trao tay an toàn tại cổng KTX và trường học.
        </p>

        {/* Banner Bán lại kế thừa Hành trình */}
        {resellItemData && (
          <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3 min-w-0">
              <span
                className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </span>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-emerald-900 font-extrabold text-xs sm:text-sm">
                    Bán lại 1 chạm · Kế thừa hành trình đồ vật
                  </strong>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white whitespace-nowrap shrink-0">
                    Đời chủ #{resellItemData.myOwnerSeq} → #{resellItemData.totalOwners + 1}
                  </span>
                </div>
                <p className="text-emerald-900/90 leading-relaxed text-xs sm:text-[13px]">
                  Bạn đang đăng bán lại món đồ <strong>{resellItemData.title}</strong> với tư cách <strong>Đời chủ #{resellItemData.myOwnerSeq}</strong>. Hồ sơ hành trình trước đó sẽ được kế thừa tự động. Vui lòng chụp và tải lên ảnh mới phản ánh đúng tình trạng hiện tại để người mua dễ đối chiếu.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearResellItem}
              className="shrink-0 self-start text-xs font-bold text-emerald-800 hover:text-emerald-950 px-3 py-1.5 rounded-lg bg-white border border-emerald-200 hover:bg-emerald-100/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              Đổi sang đăng mới
            </button>
          </div>
        )}

        {/* Hộp chọn nhanh món đồ đang sở hữu để bán lại kế thừa Hành trình */}
        {!resellItemData && availableResellItems.length > 0 && (
          <div className="mt-4 p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 shadow-xs space-y-2.5">
            <div className="text-xs font-bold text-emerald-900">
              Bạn muốn bán lại món đồ đã mua trong Đồ của tôi để tiếp nối hành trình?
            </div>
            <div className="flex flex-wrap gap-2">
              {availableResellItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectResellItem(item)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-[#001B48] border border-emerald-200 transition-colors cursor-pointer inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <span className="truncate max-w-[220px]">{item.title}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200 shrink-0 whitespace-nowrap">
                    Đời chủ #{item.myOwnerSeq}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nút bấm điền nhanh dữ liệu mẫu 1-chạm (Ẩn khi đang bán lại món đồ có sẵn) */}
        {!resellItemData && !resellItemId && (
          <div className="mt-4 p-3.5 bg-white rounded-2xl border border-[#D6E8EE] shadow-xs">
            <div className="text-xs font-bold text-[#001B48] mb-2">
              Thử nhanh mẫu tin sinh viên phổ biến:
            </div>
            <div className="flex flex-wrap gap-2">
              {DEMO_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset, idx)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#D6E8EE]/60 text-[#001B48] transition-colors cursor-pointer border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Thông báo lỗi nếu có */}
      {formError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
          <svg className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <span className="font-bold block">Thông báo kiểm tra:</span>
            <span>{formError}</span>
          </div>
        </div>
      )}

      {/* 2. FORM ĐĂNG BÁN CHÍNH */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* KHỐI 1: HÌNH ẢNH MÓN ĐỒ (NÉN CANVAS CLIENT) */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#D6E8EE] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#001B48] flex items-center gap-2">
                <span>1. Hình ảnh thật món đồ</span>
                <span className="text-xs font-normal text-[#02457A]">({images.length}/5 ảnh)</span>
              </h2>
              <p className="text-xs text-[#02457A]">
                Tự động nén qua Canvas dưới 1200px giúp tải siêu tốc trên mạng 4G ký túc xá
              </p>
            </div>
            {isCompressing && (
              <span className="text-xs font-bold text-[#018ABE] flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#018ABE]" /> Đang nén ảnh...
              </span>
            )}
          </div>

          {/* Grid ảnh đã chọn */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
            {images.map((img, idx) => (
              <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group bg-slate-50">
                <Image src={img.url} alt={`Ảnh ${idx + 1}`} fill className="object-cover" />
                {idx === 0 && (
                  <span className="absolute top-1.5 left-1.5 bg-[#018ABE] text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shadow-xs">
                    Ảnh bìa
                  </span>
                )}
                {img.ratio > 0 && (
                  <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[9px] font-mono px-1 py-0.5 rounded">
                    -{img.ratio}%
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  aria-label="Xóa ảnh"
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-80 group-hover:opacity-100 hover:bg-rose-600 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  title="Xóa ảnh"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Ô thêm ảnh mới */}
            {images.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                className="aspect-square rounded-2xl border-2 border-dashed border-[#018ABE]/40 hover:border-[#018ABE] hover:bg-[#D6E8EE]/20 transition-all flex flex-col items-center justify-center p-3 text-center cursor-pointer disabled:opacity-50"
              >
                <svg className="w-7 h-7 text-[#018ABE] mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs font-bold text-[#001B48]">Thêm ảnh</span>
                <span className="text-[10px] text-[#02457A]">PNG, JPG, WebP</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* KHỐI 2: THÔNG TIN CHI TIẾT */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#D6E8EE] shadow-xs space-y-5">
          <h2 className="text-base sm:text-lg font-bold text-[#001B48]">
            2. Thông tin chi tiết món đồ
          </h2>

          {/* Tiêu đề */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-[#001B48] mb-1.5">
              Tiêu đề món đồ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Giáo trình Giải tích 1 - ĐHQG TP.HCM (Kèm tập đề cương thi)"
              className="w-full h-11 px-4 rounded-xl border border-[#D6E8EE] bg-white text-sm font-medium text-[#001B48] placeholder:text-slate-400 focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20 outline-none transition-all"
              required
            />
          </div>

          {/* Danh mục & Tình trạng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-[#001B48] mb-1.5">
                Danh mục sản phẩm <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-[#D6E8EE] bg-white text-sm font-semibold text-[#001B48] focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20 outline-none cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-[#001B48] mb-1.5">
                Tình trạng sử dụng <span className="text-rose-500">*</span>
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-[#D6E8EE] bg-white text-sm font-semibold text-[#001B48] focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20 outline-none cursor-pointer"
              >
                <option value="Mới 99%">Mới 99% (Nguyên hộp, chưa qua sử dụng nhiều)</option>
                <option value="Mới 98%">Mới 98% (Rất ít dùng, giữ gìn cẩn thận)</option>
                <option value="Còn rất tốt">Còn rất tốt (Hoạt động hoàn hảo, trơn tru)</option>
                <option value="Đã sử dụng">Đã sử dụng (Có trầy xước nhẹ theo thời gian)</option>
              </select>
            </div>
          </div>

          {/* Giá bán & Nút gạt tặng 0đ */}
          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#D6E8EE]">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs sm:text-sm font-bold text-[#001B48]">
                Giá mong muốn (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => handleToggleFree(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Tặng miễn phí 0đ
                </span>
              </label>
            </div>

            <div className="relative">
              <input
                type="number"
                disabled={isFree}
                value={isFree ? 0 : price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="50000"
                className="w-full h-11 pl-4 pr-14 rounded-xl border border-[#D6E8EE] bg-white text-base font-extrabold text-[#001B48] focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                min={0}
                step={5000}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#02457A]">
                VNĐ
              </span>
            </div>
            {!isFree && parseInt(price) > 0 && (
              <span className="text-xs text-[#02457A] font-semibold mt-1.5 block">
                Tương đương: {parseInt(price).toLocaleString("vi-VN")} đ
              </span>
            )}
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-[#001B48] mb-1.5">
              Mô tả chi tiết món đồ <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nêu rõ tình trạng, năm mua, phụ kiện đi kèm, thời gian xem đồ phù hợp (ít nhất 10 ký tự)..."
              rows={4}
              className="w-full p-4 rounded-xl border border-[#D6E8EE] bg-white text-sm font-normal text-[#001B48] placeholder:text-slate-400 focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20 outline-none transition-all resize-y"
              required
            />
          </div>
        </div>

        {/* KHỐI 3: ĐỊA ĐIỂM GIAO DỊCH & BẢO VỆ SĐT ZALO (BR36) */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#D6E8EE] shadow-xs space-y-5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#001B48]">
              3. Địa điểm trao tay & Liên hệ Zalo
            </h2>
            <p className="text-xs text-[#02457A]">
              Giao dịch trực tiếp tại cổng KTX hoặc trường học, tuyệt đối không chuyển khoản trước
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-[#001B48] mb-1.5">
                Ký túc xá / Trường học thuận tiện <span className="text-rose-500">*</span>
              </label>
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-[#D6E8EE] bg-white text-sm font-semibold text-[#001B48] focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20 outline-none cursor-pointer"
              >
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-[#001B48] mb-1.5">
                Số điện thoại Zalo <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={zaloPhone}
                onChange={(e) => setZaloPhone(e.target.value)}
                placeholder="0987654321"
                className="w-full h-11 px-4 rounded-xl border border-[#D6E8EE] bg-white text-sm font-bold text-[#001B48] focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20 outline-none"
                required
              />
            </div>
          </div>

          {/* Công tắc Ẩn SĐT công khai */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
            <input
              type="checkbox"
              id="hidePhoneCheck"
              checked={hidePhone}
              onChange={(e) => setHidePhone(e.target.checked)}
              className="mt-1 w-4 h-4 text-[#018ABE] rounded border-slate-300 focus:ring-[#018ABE] cursor-pointer"
            />
            <label htmlFor="hidePhoneCheck" className="text-xs sm:text-sm text-[#001B48] cursor-pointer select-none space-y-1">
              <span className="font-bold text-[#018ABE] inline-flex flex-wrap items-center gap-2">
                <span>Ẩn số điện thoại trên bài đăng công khai</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E3F1F9] text-[#0088C2] border border-[#BAE6FD] whitespace-nowrap">
                  Khuyên dùng
                </span>
              </span>
              <span className="text-[#02457A] text-xs block">
                Người mua sẽ bấm nút &quot;Mở Zalo&quot; bảo mật và hệ thống chuyển tiếp trực tiếp, ngăn chặn kẻ xấu cào số spam tin nhắn rác hoặc quảng cáo.
              </span>
            </label>
          </div>
        </div>

        {/* KHỐI 4: HÀNH TRÌNH ĐỒ VẬT (ĐỒNG BỘ VỚI TRANG CHI TIẾT SẢN PHẨM) */}
        <ItemJourneyTimeline
          title="Hành trình đồ vật"
          subtitle={
            isResellMode
              ? "Xem trước hành trình kế thừa sẽ hiển thị trên trang sản phẩm"
              : "Xem trước hành trình sẽ hiển thị trên trang sản phẩm"
          }
          animate={false}
          headerRight={
            isResellMode ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#E6F6EE] text-[#0B6B3A] border border-[#B7E4CB] whitespace-nowrap">
                Kế thừa tự động
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#E3F1F9] text-[#02457A] border border-[#BAE6FD] whitespace-nowrap">
                Tự động cấp Hộ chiếu
              </span>
            )
          }
          steps={journeySteps}
          nextStep={journeyNextStep}
          footer={
            <div className="rounded-2xl p-3.5 sm:p-4 bg-white/90 border border-[#BAE6FD] flex items-start gap-3">
              <input
                type="checkbox"
                id="showNameCheck"
                checked={showNameOnPassport}
                onChange={(e) => setShowNameOnPassport(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#018ABE] border-slate-300 focus:ring-[#018ABE] cursor-pointer"
              />
              <label htmlFor="showNameCheck" className="text-xs text-[#0B1F4B] cursor-pointer select-none space-y-0.5">
                <span className="font-bold block">
                  Hiển thị tên thật ({currentUser?.displayName || "Bạn"}) tại Đời chủ #{resellItemData ? resellItemData.myOwnerSeq : 1}
                </span>
                <span className="text-[#475569] block">
                  Mặc định ẩn danh để bảo vệ quyền riêng tư sinh viên.
                </span>
              </label>
            </div>
          }
        />

        {/* NÚT SUBMIT */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/"
            className="px-5 py-3 rounded-xl text-sm font-semibold text-[#02457A] hover:bg-slate-100 transition-colors"
          >
            Hủy bỏ
          </Link>
          <button
            type="submit"
            disabled={submitting || isCompressing}
            className="px-8 py-3.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang xử lý đăng tin...</span>
              </>
            ) : (
              <span>{isResellMode ? "Đăng bán lại ngay" : "Đăng tin ngay"}</span>
            )}
          </button>
        </div>
      </form>

      {/* 3. MODAL THÀNH CÔNG */}
      {createdListingResult && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sell-success-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl space-y-4">
            <div
              className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner"
              aria-hidden="true"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 id="sell-success-title" className="text-xl sm:text-2xl font-extrabold text-[#001B48]">
              {isResellMode ? "Đăng bán lại thành công" : "Đăng tin thành công"}
            </h3>
            <p className="text-xs sm:text-sm text-[#02457A]">
              Món đồ <span className="font-bold text-[#001B48]">&quot;{createdListingResult.title}&quot;</span> {isResellMode ? "đã kế thừa trọn vẹn hành trình đồ vật và sẵn sàng kết nối đời chủ kế tiếp." : "đã được đăng lên sàn UniCycle và sẵn sàng kết nối người mua."}
            </p>

            {createdListingResult.passportId && (
              <div className="p-4 bg-[#F0F9FF] rounded-2xl border border-[#BAE6FD] text-left space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#001B48]">
                    Hành trình đồ vật đã sẵn sàng
                  </span>
                  <span className="text-[11px] font-mono text-[#475569] shrink-0">
                    {createdListingResult.passportId.slice(0, 8)}...{createdListingResult.passportId.slice(-6)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    href={`/passport/${createdListingResult.passportId}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#018ABE] hover:text-[#02457A] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] rounded"
                  >
                    <span>Xem hành trình đồ vật</span>
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                    </svg>
                  </Link>

                  {createdListingResult.snowtraceUrl && (
                    <a
                      href={createdListingResult.snowtraceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
                    >
                      <span>Tra cứu trên Snowtrace</span>
                      <svg
                        className="w-3.5 h-3.5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <Link
                href="/products"
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#001B48] text-xs sm:text-sm font-bold transition-colors"
              >
                Khám phá chợ đồ
              </Link>
              <Link
                href={`/products/${createdListingResult.id}`}
                className="flex-1 py-3 px-4 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs sm:text-sm font-bold shadow-md transition-all"
              >
                Xem tin vừa đăng
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
