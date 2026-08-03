"use client";

import { ReactNode, useState } from 'react';

export function HelpHint({ title = 'Dúvidas', children }: { title?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-left text-sm font-medium text-white"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/12 text-sky-200 ring-1 ring-sky-500/20">i</span>
        <span>{title}</span>
      </button>
      {open ? <div className="mt-3 text-sm leading-6 text-zinc-300">{children}</div> : null}
    </div>
  );
}
