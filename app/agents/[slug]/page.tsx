import type { Metadata } from "next";
import PagePlaceholder from "@/components/common/PagePlaceholder";

// Scaffold — replace with the real page described in docs/specs/P02-agent-detail.md
export const metadata: Metadata = {
  title: "Agent Detail",
};

export default async function AgentsSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PagePlaceholder
      pageId="P02"
      title="Agent Detail"
      description="รายละเอียด agent: knowledge ที่มี, ตัวอย่าง use case, วิธีใช้, ช่องทางเรียกใช้ (เว็บ, API, MCP, LINE)"
      role="User (ผู้ใช้ทั่วไป)"
      specPath="docs/specs/P02-agent-detail.md"
      branch="page/agent-detail"
      detail={`slug: ${slug}`}
    />
  );
}
