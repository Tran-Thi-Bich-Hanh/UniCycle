"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Toast, useToast } from "@/components/toast";
import { IconAlert } from "@/components/icons";

const UNIVERSITIES = [
  "Đại học Bách Khoa TP.HCM",
  "Đại học Khoa học Tự nhiên TP.HCM",
  "Đại học Khoa học Xã hội và Nhân văn TP.HCM",
  "Đại học Công nghệ Thông tin (UIT)",
  "Đại học Kinh tế TP.HCM",
  "Đại học Sư phạm TP.HCM",
  "Đại học Y Dược TP.HCM",
  "Khác",
];

type Errors = Partial<Record<"fullName" | "phone", string>>;

export default function EditProfilePage() {
  const router = useRouter();
  const { toast, show, dismiss } = useToast();
  const summaryRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [university, setUniversity] = useState(UNIVERSITIES[0]);
  const [campusLocation, setCampusLocation] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.replace("/login?redirect=/profile/edit");
          return;
        }
        const u = data.user;
        setFullName(u.full_name || "");
        setPhone(u.phone || "");
        setUniversity(u.university || UNIVERSITIES[0]);
        setCampusLocation(u.campus_location || "");
        setBio(u.bio || "");
        setAvatarUrl(u.avatar_url || null);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const validate = (): Errors => {
    const e: Errors = {};
    if (fullName.trim().length < 2) e.fullName = "Vui lòng nhập họ tên (tối thiểu 2 ký tự).";
    const p = phone.trim().replace(/[\s.-]/g, "");
    if (p && !/^(0|\+84)\d{9}$/.test(p)) e.phone = "Số điện thoại không hợp lệ (ví dụ: 0912345678).";
    return e;
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("files", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tải ảnh.");
      setAvatarUrl(data.url);
    } catch (err: any) {
      show(err.message || "Không thể tải ảnh đại diện.", { type: "error" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setServerError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim().replace(/[\s.-]/g, ""),
          university,
          campusLocation: campusLocation.trim(),
          bio: bio.trim(),
          avatarUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể lưu hồ sơ.");
      router.push("/profile");
      router.refresh();
    } catch (err: any) {
      setServerError(err.message || "Đã xảy ra lỗi, vui lòng thử lại.");
      setSaving(false);
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  };

  const hasErrors = Object.values(errors).some(Boolean) || !!serverError;
  const field =
    "w-full px-4 py-3 rounded-xl border text-sm text-[#001B48] focus:outline-hidden focus:ring-1";
  const ok = "border-[#D6E8EE] focus:border-[#018ABE] focus:ring-[#018ABE]";
  const bad = "border-red-400 focus:border-red-500 focus:ring-red-400";

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
      <Navbar />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#02457A] mb-4 font-medium">
          <Link href="/" className="hover:text-[#018ABE]">Trang chủ</Link>
          <span aria-hidden="true">/</span>
          <Link href="/profile" className="hover:text-[#018ABE]">Tài khoản</Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#001B48] font-bold">Sửa hồ sơ</span>
        </nav>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">Sửa hồ sơ sinh viên</h1>
        <p className="text-sm text-[#02457A] mb-8 font-medium">
          Số điện thoại chỉ hiển thị cho người dùng đã đăng nhập khi họ xem tin của bạn.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-sm text-[#02457A] font-semibold" role="status">
            <div className="w-5 h-5 border-2 border-[#018ABE] border-t-transparent rounded-full animate-spin" />
            <span>Đang tải hồ sơ...</span>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-6 bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs">
            <div
              ref={summaryRef}
              tabIndex={-1}
              role={hasErrors ? "alert" : undefined}
              className={hasErrors ? "p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold outline-hidden" : "sr-only"}
            >
              {serverError || errors.fullName || errors.phone}
            </div>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-[#02457A] text-white flex items-center justify-center text-2xl font-extrabold overflow-hidden border-2 border-[#97CADB]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Ảnh đại diện hiện tại" className="w-full h-full object-cover" />
                ) : (
                  <span aria-hidden="true">{fullName.charAt(0) || "U"}</span>
                )}
              </div>
              <label className="px-4 py-2 rounded-xl text-xs font-bold bg-[#D6E8EE]/60 hover:bg-[#D6E8EE] text-[#001B48] cursor-pointer focus-within:ring-2 focus-within:ring-[#018ABE]">
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleAvatar} disabled={uploading} />
                {uploading ? "Đang tải..." : "Đổi ảnh đại diện"}
              </label>
            </div>

            <div>
              <label htmlFor="p-name" className="block text-xs font-bold uppercase tracking-wider mb-2">
                Họ và tên <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input id="p-name" value={fullName} onChange={(e) => { setFullName(e.target.value); setErrors((x) => ({ ...x, fullName: undefined })); }} aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? "p-name-err" : undefined} className={`${field} ${errors.fullName ? bad : ok}`} />
              {errors.fullName && (
                <p id="p-name-err" className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1.5"><IconAlert className="w-3.5 h-3.5" />{errors.fullName}</p>
              )}
            </div>

            <div>
              <label htmlFor="p-phone" className="block text-xs font-bold uppercase tracking-wider mb-2">Số điện thoại / Zalo</label>
              <input id="p-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0912345678" value={phone} onChange={(e) => { setPhone(e.target.value); setErrors((x) => ({ ...x, phone: undefined })); }} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "p-phone-err" : "p-phone-hint"} className={`${field} ${errors.phone ? bad : ok}`} />
              {errors.phone ? (
                <p id="p-phone-err" className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1.5"><IconAlert className="w-3.5 h-3.5" />{errors.phone}</p>
              ) : (
                <p id="p-phone-hint" className="mt-1.5 text-[11px] text-[#02457A]">Thêm số để người mua có thể gọi hoặc nhắn Zalo cho bạn.</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="p-uni" className="block text-xs font-bold uppercase tracking-wider mb-2">Trường</label>
                <select id="p-uni" value={university} onChange={(e) => setUniversity(e.target.value)} className={`${field} ${ok} bg-white`}>
                  {UNIVERSITIES.concat(UNIVERSITIES.includes(university) ? [] : [university]).map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="p-campus" className="block text-xs font-bold uppercase tracking-wider mb-2">Khuôn viên / KTX</label>
                <input id="p-campus" placeholder="KTX Khu B (ĐHQG)" value={campusLocation} onChange={(e) => setCampusLocation(e.target.value)} className={`${field} ${ok}`} />
              </div>
            </div>

            <div>
              <label htmlFor="p-bio" className="block text-xs font-bold uppercase tracking-wider mb-2">Giới thiệu ngắn</label>
              <textarea id="p-bio" rows={3} maxLength={200} value={bio} onChange={(e) => setBio(e.target.value)} className={`${field} ${ok}`} />
              <p className="mt-1 text-[11px] text-[#02457A] text-right">{bio.length}/200</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link href="/profile" className="px-5 py-3 rounded-xl text-sm font-bold text-[#02457A] hover:bg-[#D6E8EE]/40">Hủy</Link>
              <button type="submit" disabled={saving || uploading} className="px-7 py-3 rounded-xl text-sm font-extrabold bg-[#018ABE] hover:bg-[#02457A] text-white disabled:opacity-50 transition-colors">
                {saving ? "Đang lưu..." : "Lưu hồ sơ"}
              </button>
            </div>
          </form>
        )}
      </main>
      <Toast toast={toast} onDismiss={dismiss} />
      <Footer />
    </div>
  );
}

