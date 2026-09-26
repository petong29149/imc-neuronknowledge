import type { Metadata } from "next";
import AdminPageHeading from "@/components/admin/AdminPageHeading";
import AdminPromptsSection from "@/components/admin/AdminPromptsSection";

export const metadata: Metadata = {
  title: "System Prompt",
};

export default function AdminPromptsPage() {
  return (
    <>
      <AdminPageHeading
        title="System Prompt"
        description="กำหนด Persona ของผู้ช่วย AI และหลักการทำงานที่ใช้กับทุก Agent"
      />
      <AdminPromptsSection />
    </>
  );
}
