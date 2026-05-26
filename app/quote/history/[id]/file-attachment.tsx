"use client";

import { useState } from "react";
import { getSignedUploadUrl, type FileMeta } from "@/app/actions/quote";

export default function FileAttachment({ file }: { file: FileMeta }) {
  const [loading, setLoading] = useState(false);

  async function open(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const url = await getSignedUploadUrl(file.path);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else alert("This file is no longer available.");
    } catch {
      alert("Couldn't fetch the file. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <li className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
      <span className="flex min-w-0 items-center gap-1.5">
        <span aria-hidden="true">📄</span>
        <span className="truncate">{file.name}</span>
        <span className="text-slate-400">· {formatBytes(file.size)}</span>
      </span>
      <a
        href="#"
        onClick={open}
        className="ml-3 shrink-0 font-medium text-indigo-600 hover:text-indigo-500"
      >
        {loading ? "Opening…" : "View"}
      </a>
    </li>
  );
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
