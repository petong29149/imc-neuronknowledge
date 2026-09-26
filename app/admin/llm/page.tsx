import type { Metadata } from "next";
import AdminPageHeading from "@/components/admin/AdminPageHeading";
import AdminLLMSection from "@/components/admin/AdminLLMSection";

export const metadata: Metadata = {
  title: "LLM & Models",
};

export default function AdminLLMPage() {
  return (
    <>
      <AdminPageHeading
        title="LLM & Models"
        description="จัดการการเชื่อมต่อผู้ให้บริการ LLM และโมเดลที่เปิดให้ใช้งาน"
      />
      <AdminLLMSection />
    </>
  );
}
