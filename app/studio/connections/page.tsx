import type { Metadata } from "next";
import PagePlaceholder from "@/components/common/PagePlaceholder";

// Scaffold — replace with the real page described in docs/specs/S02-studio-connections.md
export const metadata: Metadata = {
  title: "Data Connections",
};

export default function StudioConnectionsPage() {
  return (
    <PagePlaceholder
      pageId="S02"
      title="Data Connections"
      description="สร้างการเชื่อมต่อ PostgreSQL / MySQL / SQL Server แบบอ่านอย่างเดียว ทดสอบ และดู schema แบบง่าย"
      role="Creator (ผู้สร้าง)"
      specPath="docs/specs/S02-studio-connections.md"
      branch="page/studio-connections"
    />
  );
}
