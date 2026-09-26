import type { Metadata } from "next";
import AdminPageHeading from "@/components/admin/AdminPageHeading";
import AdminAgentsSection from "@/components/admin/AdminAgentsSection";

export const metadata: Metadata = {
  title: "AI Agents",
};

export default function AdminAgentsPage() {
  return (
    <>
      <AdminPageHeading
        title="AI Agents"
        description="กำหนดบทบาท Skills, MCP Tools และกลุ่มผู้ใช้ที่เข้าถึงได้ของ AI Agent แต่ละตัว"
      />
      <AdminAgentsSection />
    </>
  );
}
