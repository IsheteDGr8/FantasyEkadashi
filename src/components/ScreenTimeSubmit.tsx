"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Sparkles } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { submitScreenTime } from "@/server/actions/matches";
import { CATEGORIES, computeTotal } from "@/lib/categories";
import { formatMinutes, parseTimeToMinutes } from "@/lib/utils";

interface ExistingSubmission {
  social_min: number;
  games_min: number;
  entertainment_min: number;
  creativity_min: number;
  whatsapp_min: number;
  screenshot_path: string | null;
}

type Fields = {
  social_min: string;
  games_min: string;
  entertainment_min: string;
  creativity_min: string;
  whatsapp_min: string;
};

function minutesToField(n: number): string {
  return n > 0 ? formatMinutes(n) : "";
}

/**
 * From OCR text, find the minutes next to a given category label.
 * Handles "Social Networking 1h 23m", "Entertainment  45m", etc.
 */
function extractCategory(text: string, aliases: string[]): number | null {
  const lines = text.split(/\n+/);
  for (const alias of aliases) {
    for (const line of lines) {
      const low = line.toLowerCase();
      const idx = low.indexOf(alias);
      if (idx === -1) continue;
      const after = line.slice(idx + alias.length);
      const m =
        after.match(/(\d{1,2})\s*h(?:ours?)?\s*(\d{1,2})?\s*m?/i) ||
        after.match(/(\d{1,3})\s*m(?:in)?/i) ||
        after.match(/(\d{1,2}):(\d{2})/);
      if (m) {
        if (/h/i.test(m[0]) || m[0].includes(":")) {
          const h = parseInt(m[1], 10);
          const mins = m[2] ? parseInt(m[2], 10) : 0;
          if (mins < 60) return h * 60 + mins;
        } else {
          const v = parseInt(m[1], 10);
          if (v < 1440) return v;
        }
      }
    }
  }
  return null;
}

type WorkState = "" | "ocr" | "upload" | "submit";

export function ScreenTimeSubmit({
  matchId,
  existing,
}: {
  matchId: string;
  existing?: ExistingSubmission | null;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrFound, setOcrFound] = useState(false);
  const [fields, setFields] = useState<Fields>({
    social_min: existing ? minutesToField(existing.social_min) : "",
    games_min: existing ? minutesToField(existing.games_min) : "",
    entertainment_min: existing ? minutesToField(existing.entertainment_min) : "",
    creativity_min: existing ? minutesToField(existing.creativity_min) : "",
    whatsapp_min: existing ? minutesToField(existing.whatsapp_min) : "",
  });
  const [work, setWork] = useState<WorkState>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function parsed(): {
    social_min: number;
    games_min: number;
    entertainment_min: number;
    creativity_min: number;
    whatsapp_min: number;
  } {
    return {
      social_min: parseTimeToMinutes(fields.social_min) ?? 0,
      games_min: parseTimeToMinutes(fields.games_min) ?? 0,
      entertainment_min: parseTimeToMinutes(fields.entertainment_min) ?? 0,
      creativity_min: parseTimeToMinutes(fields.creativity_min) ?? 0,
      whatsapp_min: parseTimeToMinutes(fields.whatsapp_min) ?? 0,
    };
  }

  async function onPick(f: File | null) {
    setError(null);
    if (!f) return;
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
    setWork("ocr");
    try {
      const Tesseract = await import("tesseract.js");
      const { data } = await Tesseract.recognize(f, "eng");
      const next = { ...fields };
      let found = false;
      for (const cat of CATEGORIES) {
        const v = extractCategory(data.text, cat.ocrAliases);
        if (v !== null) {
          next[cat.field] = formatMinutes(v);
          found = true;
        }
      }
      setFields(next);
      setOcrFound(found);
      if (!found) {
        setError("Couldn't read categories automatically — please type them in.");
      }
    } catch (e) {
      console.error(e);
      setError("Couldn't read the screenshot — please type the numbers below.");
    } finally {
      setWork("");
    }
  }

  function submit() {
    setError(null);
    const p = parsed();
    if (
      p.social_min + p.games_min + p.entertainment_min + p.creativity_min === 0
    ) {
      setError("Enter at least one category time (e.g. '1h 20m', '45m', or '80').");
      return;
    }
    startTransition(async () => {
      try {
        let screenshotPath: string | null = existing?.screenshot_path ?? null;
        if (file) {
          setWork("upload");
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Not signed in.");
          const ext = (file.name.split(".").pop() || "png").toLowerCase();
          const path = `${user.id}/${matchId}-${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("screenshots")
            .upload(path, file, { upsert: false, contentType: file.type });
          if (upErr) throw new Error(upErr.message);
          screenshotPath = path;
        }
        setWork("submit");
        const source = file ? (ocrFound ? "ocr" : "mixed") : "manual";
        const fd = new FormData();
        fd.set("matchId", matchId);
        fd.set("social_min", String(p.social_min));
        fd.set("games_min", String(p.games_min));
        fd.set("entertainment_min", String(p.entertainment_min));
        fd.set("creativity_min", String(p.creativity_min));
        fd.set("whatsapp_min", String(p.whatsapp_min));
        if (screenshotPath) fd.set("screenshotPath", screenshotPath);
        fd.set("source", source);
        const result = await submitScreenTime(fd);
        if (result && "error" in result) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Submission failed.");
      } finally {
        setWork("");
      }
    });
  }

  const liveTotal = computeTotal(parsed());

  function categoryInput(field: keyof Fields, label: string, hint?: string) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={field}>{label}</Label>
        <Input
          id={field}
          value={fields[field]}
          onChange={(e) => setFields((f) => ({ ...f, [field]: e.target.value }))}
          placeholder="e.g. 1h 20m"
          className="font-mono"
          inputMode="text"
        />
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <Button
        type="button"
        variant="secondary"
        onClick={() => inputRef.current?.click()}
        disabled={work === "ocr" || pending}
        className="w-full"
      >
        {work === "ocr" ? (
          <><Loader2 size={16} className="animate-spin" /> Reading screenshot…</>
        ) : file ? (
          <><Upload size={16} /> Replace screenshot</>
        ) : (
          <><Upload size={16} /> Upload &ldquo;Show Categories&rdquo; screenshot</>
        )}
      </Button>

      {previewUrl && (
        <div className="rounded-xl border border-border p-2 bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
        </div>
      )}

      {ocrFound && (
        <div className="flex items-center gap-2 text-sm text-success rounded-lg bg-success/10 border border-success/30 px-3 py-2">
          <Sparkles size={14} /> Read some categories from your screenshot — check &amp; fix below.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {categoryInput("social_min", "Social")}
        {categoryInput("games_min", "Games")}
        {categoryInput("entertainment_min", "Entertainment")}
        {categoryInput("creativity_min", "Creativity")}
      </div>
      {categoryInput(
        "whatsapp_min",
        "WhatsApp (subtracted from Social)",
        "Optional. iOS counts WhatsApp under Social; enter its time to exclude it.",
      )}

      <div className="flex items-center justify-between rounded-xl bg-surface-2 border border-border px-4 py-3">
        <span className="text-sm text-muted">Your competed total</span>
        <span className="font-mono text-lg font-semibold">{formatMinutes(liveTotal)}</span>
      </div>

      {error && (
        <p className="text-sm text-danger rounded-lg bg-danger/10 border border-danger/30 p-3">{error}</p>
      )}

      <Button onClick={submit} size="lg" className="w-full" disabled={pending || work !== ""}>
        {pending || work !== "" ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {work === "upload" ? "Uploading…" : work === "submit" ? "Submitting…" : "Working…"}
          </>
        ) : existing ? (
          "Update submission"
        ) : (
          "Submit"
        )}
      </Button>
    </div>
  );
}
