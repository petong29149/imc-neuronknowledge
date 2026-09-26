import type { Metadata } from "next";
import AdminPageHeading from "@/components/admin/AdminPageHeading";
import AdminMCPSection from "@/components/admin/AdminMCPSection";

export const metadata: Metadata = {
  title: "MCP Servers",
};

export default function AdminMCPPage() {
  return (
    <>
      <AdminPageHeading
        title="MCP Servers"
        description="เชื่อมต่อ MCP Servers และเปิด/ปิด Tools ที่ให้ผู้ช่วย AI เรียกใช้"
      />
      <AdminMCPSection />
    </>
  );
}
