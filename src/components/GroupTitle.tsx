"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";
import { Input } from "@/components/ui";
import { renameGroup } from "@/server/actions/groups";

export function GroupTitle({
  groupId,
  name,
  canEdit,
}: {
  groupId: string;
  name: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    const trimmed = value.trim();
    if (trimmed === name) {
      setEditing(false);
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("name", trimmed);
    startTransition(async () => {
      const result = await renameGroup(groupId, fd);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function cancel() {
    setValue(name);
    setError(null);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-semibold mt-1">{name}</h1>
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setValue(name);
              setEditing(true);
            }}
            aria-label="Rename league"
            className="mt-1 rounded-full p-1.5 text-muted hover:text-foreground hover:bg-surface transition"
          >
            <Pencil size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-1 space-y-1">
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          maxLength={60}
          disabled={pending}
          className="h-10 max-w-xs text-xl font-semibold"
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          aria-label="Save name"
          className="rounded-full p-2 text-success hover:bg-success/10 transition disabled:opacity-50"
        >
          <Check size={18} />
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          aria-label="Cancel"
          className="rounded-full p-2 text-muted hover:text-foreground hover:bg-surface transition disabled:opacity-50"
        >
          <X size={18} />
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
