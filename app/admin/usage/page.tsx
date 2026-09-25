import type { Metadata } from "next";
import UsageDashboard from "@/components/admin/usage/UsageDashboard";

export const metadata: Metadata = {
  title: "Usage Dashboard | NeuronKnowledge Admin",
};

export default function UsageDashboardPage() {
  return <UsageDashboard />;
}
