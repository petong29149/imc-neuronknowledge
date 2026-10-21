import type { Metadata } from "next";
import PagePlaceholder from "@/components/common/PagePlaceholder";

// Scaffold — replace with the real page described in docs/specs/S03-studio-knowledge-sets.md
export const metadata: Metadata = {
  title: "Knowledge Sets",
};

export default function StudioKnowledgeNewPage() {
  return (
    <PagePlaceholder
      pageId="S03"
      title="Knowledge Sets · /studio/knowledge/new"
      description="สร้าง Knowledge Set จากหลายแหล่ง (ไฟล์, ตารางจาก DB โหมด index หรือ query สด) ตั้งค่า hybrid RAG ด้วย preset และดูสถานะการประมวลผล"
      role="Creator (ผู้สร้าง)"
      specPath="docs/specs/S03-studio-knowledge-sets.md"
      branch="page/studio-knowledge-sets"
    />
  );
}
