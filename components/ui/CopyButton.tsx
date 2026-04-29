'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="text-xs text-indigo-600 hover:text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg flex-shrink-0 hover:bg-indigo-50 transition-colors flex items-center gap-1"
    >
      {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
    </button>
  );
}
