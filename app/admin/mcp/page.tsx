import type { Metadata } from "next";
import AdminPageHeading from "@/components/admin/AdminPageHeading";
import AdminHubNotice from "@/components/admin/AdminHubNotice";
import AdminMCPSection from "@/components/admin/AdminMCPSection";
import { CHAT_PRODUCTION_HOST } from "@/lib/site-links";

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
      <AdminHubNotice>
        NeuronKnowledge เป็นศูนย์กลาง MCP และคลังความรู้ ส่วนแชทสำหรับผู้ใช้จริงอยู่ที่{" "}
        <strong className="font-semibold">{CHAT_PRODUCTION_HOST}</strong> — หน้าแชทในระบบนี้ใช้ทดสอบ Tools
        ที่ตั้งค่าไว้ที่นี่เท่านั้น
      </AdminHubNotice>
      <AdminMCPSection />
    </>
  );
}
