"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Sparkles } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { submitScreenTime } from "@/server/actions/matches";
import { formatMinutes, parseScreenTimeToMinutes } from "@/lib/utils";

interface ExistingSubmission {
  screen_time_minutes: number;
  screenshot_path: string | null;
}

interface Props {
  matchId: string;
  existing?: ExistingSubmission | null;
}

/**
 * Scan OCR text for a screen-time value. Returns the most plausible
 * minutes total it can find (capped at 24h). Robust against junk text.
 */
function extractScreenTimeMinutes(text: string): number | null {
  if (!text) return null;
  const norm = text.replace(/\s+/g, " ");
  const candidates: number[] = [];

  // Pattern A: "4h 23m" / "4 hr 23 min" / "4hours23minutes" etc.
  const hmRe =
    /\b(\d{1,2})\s*(?:h|hr|hrs|hour|hours)\s*(\d{1,2})?\s*(?:m|min|mins|minute|minutes)?\b/gi;
  for (const m of norm.matchAll(hmRe)) {
    const h = parseInt(m[1], 10);
    const mins = m[2] ? parseInt(m[2], 10) : 0;
    if (mins < 60 && h <= 24) candidates.push(h * 60 + mins);
  }

  // Pattern B: "23m" alone or "127 min"
  const onlyMinRe = /\b(\d{1,3})\s*(?:m|min|mins|minute|minutes)\b/gi;
  for (const m of norm.matchAll(onlyMinRe)) {
    const v = parseInt(m[1], 10);
    if (v >= 0 && v < 24 * 60) candidates.push(v);
  }

  // Pattern C: "4:23" / "12:07"
  const colonRe = /\b(\d{1,2}):(\d{2})\b/g;
  for (const m of norm.matchAll(colonRe)) {
    const h = parseInt(m[1], 10);
    const mins = parseInt(m[2], 10);
    if (mins < 60 && h <= 24) candidates.push(h * 60 + mins);
  }

  if (candidates.length === 0) return null;
  // Heuristic: phone screen times are usually 1-12h. Pick the largest value
  // <= 24h that's also > 5m (a screen time of 0-5m is suspicious as the
  // headline number; more likely a per-app figure).
  candidates.sort((a, b) => b - a);
  for (const c of candidates) {
    if (c <= 24 * 60 && c >= 5) return c;
  }
  return candidates[0];
}

type WorkState = "" | "ocr" | "upload" | "submit";

export function ScreenTimeSubmit({ matchId, existing }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrGuessMinutes, setOcrGuessMinutes] = useState<number | null>(null);
  const [manualInput, setManualInput] = useState(
    existing ? formatMinutes(existing.screen_time_minutes) : "",
  );
  const [work, setWork] = useState<WorkState>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

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
      const guess = extractScreenTimeMinutes(data.text);
      setOcrGuessMinutes(guess);
      if (guess !== null) {
        setManualInput(formatMinutes(guess));
      }
    } catch (e) {
      console.error(e);
      setError(
        "Couldn't read the screenshot — please type the number in below.",
      );
    } finally {
      setWork("");
    }
  }

  function submit() {
    setError(null);
    const minutes = parseScreenTimeToMinutes(manualInput);
    if (minutes === null) {
      setError(
        'Enter something like "4h 23m", "4:23", or "143" (minutes).',
      );
      return;
    }
    startTransition(async () => {
      try {
        let screenshotPath: string | null = existing?.screenshot_path ?? null;
        if (file) {
          setWork("upload");
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
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
        const source =
          file && ocrGuessMinutes !== null && minutes === ocrGuessMinutes
            ? "ocr"
            : file
              ? "mixed"
              : "manual";
        const fd = new FormData();
        fd.set("matchId", matchId);
        fd.set("screenTimeMinutes", String(minutes));
        if (screenshotPath) fd.set("screenshotPath", screenshotPath);
        fd.set("source", source);
        await submitScreenTime(fd);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Submission failed.");
      } finally {
        setWork("");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* File picker */}
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          // capture hint helps mobile browsers offer camera
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
            <>
              <Loader2 size={16} className="animate-spin" /> Reading screenshot…
            </>
          ) : file ? (
            <>
              <Upload size={16} /> Replace screenshot
            </>
          ) : (
            <>
              <Upload size={16} /> Upload Screen Time screenshot
            </>
          )}
        </Button>
      </div>

      {previewUrl && (
        <div className="rounded-xl border border-border p-2 bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-64 mx-auto rounded-lg"
          />
        </div>
      )}

      {ocrGuessMinutes !== null && (
        <div className="flex items-center gap-2 text-sm text-success rounded-lg bg-success/10 border border-success/30 px-3 py-2">
          <Sparkles size={14} />
          OCR read:{" "}
          <span className="font-mono font-semibold">
            {formatMinutes(ocrGuessMinutes)}
          </span>{" "}
          — edit below if wrong.
        </div>
      )}

      {/* Manual / confirmed input */}
      <div className="space-y-1.5">
        <Label htmlFor="manual">Today&apos;s total screen time</Label>
        <Input
          id="manual"
          name="manual"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder="e.g. 4h 23m"
          className="font-mono"
        />
        <p className="text-xs text-muted">
          Accepts &ldquo;4h 23m&rdquo;, &ldquo;4:23&rdquo;, or just minutes like &ldquo;263&rdquo;.
        </p>
      </div>

      {error && (
        <p className="text-sm text-danger rounded-lg bg-danger/10 border border-danger/30 p-3">
          {error}
        </p>
      )}

      <Button
        onClick={submit}
        size="lg"
        className="w-full"
        disabled={pending || work !== "" || !manualInput}
      >
        {pending || work !== "" ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {work === "upload"
              ? "Uploading…"
              : work === "submit"
                ? "Submitting…"
                : "Working…"}
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
