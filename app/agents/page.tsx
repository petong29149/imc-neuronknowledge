import type { Metadata } from "next";
import PagePlaceholder from "@/components/common/PagePlaceholder";

// Scaffold — replace with the real page described in docs/specs/P01-agent-catalog.md
export const metadata: Metadata = {
  title: "Agent Catalog",
};

export default function AgentsPage() {
  return (
    <PagePlaceholder
      pageId="P01"
      title="Agent Catalog"
      description="รายการ agent ที่ผู้ใช้ใช้ได้ ค้นหาและกรองตามโดเมน"
      role="User (ผู้ใช้ทั่วไป)"
      specPath="docs/specs/P01-agent-catalog.md"
      branch="page/agent-catalog"
    />
  );
}
