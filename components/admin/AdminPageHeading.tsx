import React from "react";

export default function AdminPageHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        {title}
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
    </div>
  );
}
