import type { Metadata } from "next";
import PagePlaceholder from "@/components/common/PagePlaceholder";

// Scaffold — replace with the real page described in docs/specs/S06-studio-playground.md
export const metadata: Metadata = {
  title: "Playground and Evaluation",
};

export default async function StudioAgentsIdTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PagePlaceholder
      pageId="S06"
      title="Playground and Evaluation"
      description="ลองแชทพร้อมดูว่าระบบค้นเจออะไร รันชุดสอบจากตัวอย่างเพื่อได้ % ความแม่นยำ แล้วกดเผยแพร่"
      role="Creator (ผู้สร้าง)"
      specPath="docs/specs/S06-studio-playground.md"
      branch="page/studio-playground"
      detail={`id: ${id}`}
    />
  );
}
