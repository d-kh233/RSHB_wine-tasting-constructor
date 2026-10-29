"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { api, errorMessage } from "@/lib/apiClient";
import type { WineDTO } from "@/lib/dto";
import { resizeImage } from "@/lib/imageResize";
import { Button } from "../ui/Button";

/**
 * Фото вина в каталоге: загрузить, заменить, убрать. Фото одно на вино — оно видно во всех дегустациях
 * с этим вином. Без фото показывается шаблон. Работает и после запуска: на голоса фото не влияет.
 */
export function WinePhotoControl({
  adminKey,
  wine,
  onSaved,
  hint,
}: {
  adminKey: string;
  wine: WineDTO;
  onSaved: (wine: WineDTO) => void;
  hint?: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const url = `/api/org/${adminKey}/catalog/${wine.id}/image`;

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // тот же файл можно выбрать повторно
    if (!file || busy) return;
    setBusy("upload");
    setError(null);
    try {
      const blob = await resizeImage(file);
      onSaved(await api<WineDTO>(url, { method: "PUT", blob }));
    } catch (err) {
      // Ошибки сжатия (resizeImage) и ApiError уже с понятным текстом.
      setError(err instanceof Error ? err.message : errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (busy) return;
    setBusy("remove");
    setError(null);
    try {
      onSaved(await api<WineDTO>(url, { method: "DELETE" }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="hidden" onChange={onFile} />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => input.current?.click()}
          loading={busy === "upload"}
          disabled={busy !== null}
        >
          {wine.imageUrl ? "Заменить фото" : "Добавить фото"}
        </Button>
        {wine.imageUrl && (
          <Button size="sm" variant="ghost" onClick={remove} loading={busy === "remove"} disabled={busy !== null}>
            Убрать фото
          </Button>
        )}
        {!wine.imageUrl && <span className="text-xs text-ink-muted">Без фото гости увидят шаблон</span>}
      </div>
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
