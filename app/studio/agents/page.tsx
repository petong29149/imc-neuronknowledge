import type { Metadata } from "next";
import PagePlaceholder from "@/components/common/PagePlaceholder";

// Scaffold — replace with the real page described in docs/specs/S05-studio-agent-builder.md
export const metadata: Metadata = {
  title: "Agent Builder",
};

export default function StudioAgentsPage() {
  return (
    <PagePlaceholder
      pageId="S05"
      title="Agent Builder · /studio/agents"
      description="ประกอบ agent จากหลาย Knowledge Set + MCP tool ให้ AI ร่าง system prompt จาก use case แล้วคนแก้ได้ มี version"
      role="Creator (ผู้สร้าง)"
      specPath="docs/specs/S05-studio-agent-builder.md"
      branch="page/studio-agent-builder"
    />
  );
}
