import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";
import Hero from "@/components/landing/Hero";
import McpHubSection from "@/components/landing/McpHubSection";
import HarnessSimulator from "@/components/landing/HarnessSimulator";
import PillarsSection from "@/components/landing/PillarsSection";
import KnowledgeFlow from "@/components/landing/KnowledgeFlow";
import KnowledgeLibrary from "@/components/landing/KnowledgeLibrary";
import ComparisonSection from "@/components/landing/ComparisonSection";
import ContactSection from "@/components/landing/ContactSection";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#060911] text-slate-900 dark:text-slate-100 transition-colors duration-200 overflow-x-clip">
      <Navbar />
      <main className="flex-1 overflow-x-clip">
        <Hero />
        <McpHubSection />
        <HarnessSimulator />
        <PillarsSection />
        <KnowledgeFlow />
        <KnowledgeLibrary />
        <ComparisonSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
