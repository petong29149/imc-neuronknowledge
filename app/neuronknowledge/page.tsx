import type { Metadata } from "next";
import SalesHeader from "@/components/sales/SalesHeader";
import SalesFooter from "@/components/sales/SalesFooter";
import Hero from "@/components/landing/Hero";
import McpHubSection from "@/components/landing/McpHubSection";
import HarnessSimulator from "@/components/landing/HarnessSimulator";
import PillarsSection from "@/components/landing/PillarsSection";
import KnowledgeFlow from "@/components/landing/KnowledgeFlow";
import KnowledgeLibrary from "@/components/landing/KnowledgeLibrary";
import ComparisonSection from "@/components/landing/ComparisonSection";
import ContactSection from "@/components/landing/ContactSection";

export const metadata: Metadata = {
  title: "NeuronKnowledge | ศูนย์รวม MCP Server และคลังความรู้ โดย IMC Institute",
  description:
    "NeuronKnowledge ศูนย์รวม MCP Server และคลังความรู้สำหรับ AI Agent ขององค์กร รวม MCP Tools และ Ready Knowledge ของ IMC Institute พร้อมแหล่งอ้างอิงที่ตรวจสอบย้อนกลับได้",
};

// Brochure page for NeuronKnowledge: the original home page of this app (MCP Server &
// Knowledge Hub). It is shown inside the sales header/footer and does not link into the
// working app (no login, register or admin links).
export default function NeuronKnowledgePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#060911] text-slate-900 dark:text-slate-100 transition-colors duration-200 overflow-x-clip">
      <SalesHeader
        nav={[
          { label: "MCP Server", href: "#mcp" },
          { label: "สถาปัตยกรรม", href: "#architecture" },
          { label: "คลังความรู้", href: "#library" },
          { label: "← หน้าขาย", href: "/" },
        ]}
      />
      <main className="flex-1 overflow-x-clip">
        <Hero />
        <McpHubSection showAdminLink={false} />
        <HarnessSimulator />
        <PillarsSection />
        <KnowledgeFlow />
        <KnowledgeLibrary />
        <ComparisonSection />
        <ContactSection />
      </main>
      <SalesFooter />
    </div>
  );
}
