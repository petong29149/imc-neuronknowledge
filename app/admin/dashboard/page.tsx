import type { Metadata } from "next";
import AdminPageHeading from "@/components/admin/AdminPageHeading";
import UsageDashboard from "@/components/admin/usage/UsageDashboard";

export const metadata: Metadata = {
  title: "แดชบอร์ดการใช้งาน",
};

export default function AdminDashboardPage() {
  return (
    <>
      <AdminPageHeading
        title="แดชบอร์ดการใช้งาน"
        description="ติดตามจำนวนคำถาม การใช้ Tokens และผู้ใช้งานจาก Test console ของ NeuronKnowledge (สถิติแชทจริงอยู่ที่ระบบแชท)"
      />
      <UsageDashboard />
    </>
  );
}
