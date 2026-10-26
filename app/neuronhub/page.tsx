import type { Metadata } from "next";
import SalesHeader from "@/components/sales/SalesHeader";
import SalesFooter from "@/components/sales/SalesFooter";
import NeuronHubShowcase from "@/components/sales/NeuronHubShowcase";

export const metadata: Metadata = {
  title: "NeuronHub | หน้าแชท AI ขององค์กร โดย IMC Institute",
  description:
    "NeuronHub หน้าแชทผู้ช่วย AI ขององค์กร คุยภาษาไทยได้ ตอบพร้อมแหล่งอ้างอิง ควบคุมสิทธิ์ได้ — ดูตัวอย่างและ Showcase ที่ IMC ทำให้ลูกค้า",
};

// Brochure page for the NeuronHub chat product (not the working app).
export default function NeuronHubPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#060911] text-slate-900 dark:text-slate-100 transition-colors duration-200 overflow-x-clip">
      <SalesHeader
        nav={[
          { label: "ภาพรวม", href: "#top" },
          { label: "ฟีเจอร์", href: "#features" },
          { label: "Showcase", href: "#showcase" },
          { label: "← หน้าขาย", href: "/" },
        ]}
      />
      <main className="flex-1 overflow-x-clip">
        <NeuronHubShowcase />
      </main>
      <SalesFooter />
    </div>
  );
}
