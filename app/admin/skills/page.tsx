import type { Metadata } from "next";
import AdminPageHeading from "@/components/admin/AdminPageHeading";
import AdminSkillsSection from "@/components/admin/AdminSkillsSection";

export const metadata: Metadata = {
  title: "Skills",
};

export default function AdminSkillsPage() {
  return (
    <>
      <AdminPageHeading
        title="Skills"
        description="สร้างชุดคำสั่งเฉพาะทางที่ผู้ช่วย AI โหลดมาใช้เมื่องานตรงกับ skill"
      />
      <AdminSkillsSection />
    </>
  );
}
