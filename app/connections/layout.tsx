import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | NeuronKnowledge",
    default: "ฐานข้อมูล | NeuronKnowledge",
  },
};

export default function ConnectionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14]">
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">{children}</main>
    </div>
  );
}
