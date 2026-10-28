import type { Metadata } from "next";
import KnowledgeWorkspace from "@/components/knowledge/KnowledgeWorkspace";

export const metadata: Metadata = {
  title: "คลังความรู้ | NeuronKnowledge",
};

export default function KnowledgePage() {
  return <KnowledgeWorkspace />;
}
