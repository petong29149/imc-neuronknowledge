import Link from "next/link";
import { CHAT_URL, HUB_PATH } from "@/lib/sales/links";

export default function SalesFooter() {
  return (
    <footer className="border-t border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-[#05080f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
        <p>© {new Date().getFullYear()} IMC Institute · Knowledge People, A Better Tomorrow</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="ลิงก์ท้ายหน้า">
          <a href="#transformation" className="hover:text-[#0055fa] dark:hover:text-[#60a5fa] transition-colors">AI Transformation</a>
          <a href={CHAT_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[#0055fa] dark:hover:text-[#60a5fa] transition-colors">IMC Chat</a>
          <Link href={HUB_PATH} className="hover:text-[#0055fa] dark:hover:text-[#60a5fa] transition-colors">NeuronHub</Link>
          <a href="#contact" className="hover:text-[#0055fa] dark:hover:text-[#60a5fa] transition-colors">ติดต่อ</a>
        </nav>
      </div>
    </footer>
  );
}
