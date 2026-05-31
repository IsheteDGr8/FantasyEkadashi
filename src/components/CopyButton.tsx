"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

interface Props {
  text: string;
  children: React.ReactNode;
}

export function CopyButton({ text, children }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={copy}>
      {copied ? "Copied!" : children}
    </Button>
  );
}
