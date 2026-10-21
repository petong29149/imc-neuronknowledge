import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | NeuronKnowledge",
    default: "AI Agents | NeuronKnowledge",
  },
};

// P01-agent-catalog owns the real header and navigation for this area.
export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14]">
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">{children}</main>
    </div>
  );
}
