import type { Metadata } from "next";
import PagePlaceholder from "@/components/common/PagePlaceholder";

// Scaffold — replace with the real page described in docs/specs/S01-studio-overview.md
export const metadata: Metadata = {
  title: "Studio Overview",
};

export default function StudioPage() {
  return (
    <PagePlaceholder
      pageId="S01"
      title="Studio Overview"
      description="ภาพรวมของ creator: จำนวน knowledge set / agent, งานที่กำลังประมวลผล, คะแนนทดสอบล่าสุด, คำถามที่ agent ตอบไม่ได้"
      role="Creator (ผู้สร้าง)"
      specPath="docs/specs/S01-studio-overview.md"
      branch="page/studio-overview"
    />
  );
}
