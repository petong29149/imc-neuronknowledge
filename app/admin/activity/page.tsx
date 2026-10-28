import type { Metadata } from "next";
import PagePlaceholder from "@/components/common/PagePlaceholder";

// Scaffold — replace with the real page described in docs/specs/A01-admin-activity.md
export const metadata: Metadata = {
  title: "Activity Log",
};

export default function AdminActivityPage() {
  return (
    <PagePlaceholder
      pageId="A01"
      title="Activity Log"
      description="ประวัติการใช้งานของ user, creator และ admin กรองตามคน การกระทำ ช่วงเวลา และ export"
      role="Admin (ผู้ดูแลระบบ)"
      specPath="docs/specs/A01-admin-activity.md"
      branch="page/admin-activity"
    />
  );
}
