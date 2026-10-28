import React from "react";
import { FileText, GitBranch, UserCheck } from "lucide-react";

/**
 * Temporary body for a page that is scaffolded but not built yet.
 * The page owner replaces it with the real UI described in the page's spec.
 */
export default function PagePlaceholder({
  pageId,
  title,
  description,
  role,
  specPath,
  branch,
  detail,
}: {
  pageId: string;
  title: string;
  description: string;
  role: string;
  specPath: string;
  branch: string;
  detail?: string;
}) {
  const rows = [
    { icon: UserCheck, label: "ผู้ใช้หน้า", value: role },
    { icon: FileText, label: "Spec", value: specPath },
    { icon: GitBranch, label: "Branch", value: branch },
  ];

  return (
    <section>
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/15 bg-white/60 dark:bg-white/[0.03] p-6 sm:p-8">
        <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20">
          {pageId} · โครงหน้า ยังไม่ได้พัฒนา
        </span>
        <dl className="mt-5 grid gap-3 text-sm">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon className="w-4 h-4 shrink-0 text-slate-400" />
              <dt className="w-20 shrink-0 text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className="font-mono text-slate-800 dark:text-slate-200 break-all">{value}</dd>
            </div>
          ))}
        </dl>
        {detail && <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">{detail}</p>}
      </div>
    </section>
  );
}
