import Link from "next/link";
import { NEURONHUB_PATH, NEURONKNOWLEDGE_PATH, SERVICE_DOC_URL } from "@/lib/sales/links";

const LINK = "hover:text-[#0055fa] dark:hover:text-[#60a5fa] transition-colors";

export default function SalesFooter() {
  return (
    <footer className="border-t border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-[#05080f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
        <p>© {new Date().getFullYear()} IMC Institute · Knowledge People, A Better Tomorrow</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="ลิงก์ท้ายหน้า">
          <Link href="/#services" className={LINK}>แพ็กเกจ</Link>
          <Link href="/#transformation" className={LINK}>AI Transformation</Link>
          <Link href={NEURONHUB_PATH} className={LINK}>NeuronHub</Link>
          <Link href={NEURONKNOWLEDGE_PATH} className={LINK}>NeuronKnowledge</Link>
          <a href={SERVICE_DOC_URL} target="_blank" rel="noopener noreferrer" className={LINK}>เอกสารบริการ</a>
          <Link href="/#contact" className={LINK}>ติดต่อ</Link>
        </nav>
      </div>
    </footer>
  );
}
