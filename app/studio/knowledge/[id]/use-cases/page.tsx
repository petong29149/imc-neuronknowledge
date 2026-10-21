import type { Metadata } from "next";
import PagePlaceholder from "@/components/common/PagePlaceholder";

// Scaffold — replace with the real page described in docs/specs/S04-studio-use-cases.md
export const metadata: Metadata = {
  title: "Use Cases",
};

export default async function StudioKnowledgeIdUseCasesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PagePlaceholder
      pageId="S04"
      title="Use Cases"
      description="use case ของแต่ละ Knowledge Set พร้อมตัวอย่างคำถาม เฉลย แหล่งที่ควรใช้ตอบ และตัวอย่างที่ต้องปฏิเสธ"
      role="Creator (ผู้สร้าง)"
      specPath="docs/specs/S04-studio-use-cases.md"
      branch="page/studio-use-cases"
      detail={`id: ${id}`}
    />
  );
}
