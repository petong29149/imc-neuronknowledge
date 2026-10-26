import type { Metadata } from "next";
import SalesHeader from "@/components/sales/SalesHeader";
import SalesHero from "@/components/sales/SalesHero";
import SalesPackages from "@/components/sales/SalesPackages";
import SalesSystems from "@/components/sales/SalesSystems";
import SalesTransformation from "@/components/sales/SalesTransformation";
import SalesBots from "@/components/sales/SalesBots";
import SalesContact from "@/components/sales/SalesContact";
import SalesFooter from "@/components/sales/SalesFooter";

export const metadata: Metadata = {
  title: "IMC AI Transformation | บริการและแพลตฟอร์ม AI สำหรับองค์กร",
  description:
    "5 แพ็กเกจจาก IMC Institute: Quick-win Dashboard, AI Transformation, Bot ทำงานแทนคน, IMC Chat และ Knowledge & MCP Hub — เข้าใช้ IMC Chat หรือ NeuronHub ได้จากหน้านี้",
};

// Sales front page. The original NeuronHub home now lives at /hub (app/hub/page.tsx).
export default function SalesHome() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#060911] text-slate-900 dark:text-slate-100 transition-colors duration-200 overflow-x-clip">
      <SalesHeader />
      <main className="flex-1 overflow-x-clip">
        <SalesHero />
        <SalesPackages />
        <SalesTransformation />
        <SalesBots />
        <SalesSystems />
        <SalesContact />
      </main>
      <SalesFooter />
    </div>
  );
}
