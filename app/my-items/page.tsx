import { redirect } from "next/navigation";

export const metadata = {
  title: "Đồ Của Tôi | UniCycle Sinh Viên",
  description: "Quản lý đồ dùng và tin đăng bán có Digital Product Passport.",
};

export default function MyItemsPage() {
  redirect("/my-products");
}
