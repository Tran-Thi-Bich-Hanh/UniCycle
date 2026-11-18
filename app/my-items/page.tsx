import { redirect } from "next/navigation";

export const metadata = {
  title: "Sản Phẩm Của Tôi | UniCycle Sinh Viên",
  description: "Quản lý tin đăng bán và đồ dùng có Digital Product Passport.",
};

export default function MyItemsPage() {
  redirect("/my-products");
}
