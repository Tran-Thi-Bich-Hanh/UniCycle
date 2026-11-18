import { redirect } from "next/navigation";

export const metadata = {
  title: "Đồ Của Tôi & Digital Product Passport | UniCycle Sinh Viên",
  description: "Quản lý đồ dùng và tin đăng bán có Digital Product Passport.",
};

export default function MyProductsPage() {
  redirect("/my-items");
}
