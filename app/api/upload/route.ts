import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập để tải ảnh sản phẩm lên." },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const singleFile = formData.get("file") as File | null;

    const fileList: File[] = [];
    if (files && files.length > 0) {
      fileList.push(...files.filter((f) => f && typeof f.arrayBuffer === "function"));
    }
    if (singleFile && typeof singleFile.arrayBuffer === "function") {
      fileList.push(singleFile);
    }

    if (fileList.length === 0) {
      return NextResponse.json(
        { error: "Vui lòng chọn ít nhất một file ảnh." },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const uploadedUrls: string[] = [];

    for (const file of fileList) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          {
            error: `Định dạng ${file.type || "file"} không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WEBP, GIF.`,
          },
          { status: 400 }
        );
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File ảnh "${file.name}" vượt quá giới hạn 5MB.` },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = path.extname(file.name) || (file.type === "image/png" ? ".png" : ".jpg");
      const filename = `item_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
      const filePath = path.join(uploadDir, filename);

      await fs.writeFile(filePath, buffer);
      uploadedUrls.push(`/uploads/${filename}`);
    }

    return NextResponse.json({
      success: true,
      url: uploadedUrls[0],
      urls: uploadedUrls,
    });
  } catch (err: any) {
    console.error("Upload route error:", err);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi lưu file ảnh." },
      { status: 500 }
    );
  }
}

