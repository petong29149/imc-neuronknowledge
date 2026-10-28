import type { Metadata } from "next";
import AdminPageHeading from "@/components/admin/AdminPageHeading";
import AdminMCPSection from "@/components/admin/AdminMCPSection";

export const metadata: Metadata = {
  title: "MCP Hub",
};

export default function AdminMCPPage() {
  return (
    <>
      <AdminPageHeading
        title="MCP Hub"
        description="จัดการ MCP Servers และ Tools ที่ผู้ช่วย AI เรียกใช้ — เชื่อมต่อ, ซิงค์, เปิด/ปิด และทดสอบเรียกจริง"
      />
      <AdminMCPSection />
    </>
  );
}
