"use client";

import { useState } from "react";

interface CopyFieldProps {
  label: string;
  value: string;
  description?: string;
}

export default function CopyField({ label, value, description }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs font-semibold uppercase tracking-wide text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="rounded-2xl bg-zinc-100 p-3 font-mono text-sm text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100 break-all">
        {value || "No value generated yet."}
      </div>
      {description ? <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{description}</p> : null}
    </div>
  );
}
