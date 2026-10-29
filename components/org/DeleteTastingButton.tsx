"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/apiClient";
import { Alert } from "../ui/Alert";
import { Button, type ButtonVariant } from "../ui/Button";
import { ConfirmModal } from "../ui/ConfirmModal";

/** «Удалить дегустацию» с подтверждением. Демо-дегустацию сервер удалить не даст (409). */
export function DeleteTastingButton({
  adminKey,
  title,
  onDeleted,
  size,
  variant = "danger",
  label = "Удалить дегустацию",
}: {
  adminKey: string;
  title: string;
  onDeleted: () => void;
  size?: "sm";
  variant?: ButtonVariant;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api<null>(`/api/org/${adminKey}`, { method: "DELETE" });
      setOpen(false);
      onDeleted();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size={size} variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <ConfirmModal
        open={open}
        title="Удалить дегустацию?"
        confirmLabel="Удалить навсегда"
        variant="danger"
        loading={busy}
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
        onConfirm={confirm}
      >
        <p>
          «{title}» будет удалена вместе с программой, гостями и оценками. Ссылки на кабинет, анкету и итоги перестанут
          работать.
        </p>
        <p className="text-ink-muted">
          Вина остаются в каталоге. Оценки, уже переданные в «Народный рейтинг», тоже остаются. Отменить удаление нельзя.
        </p>
        {error && <Alert tone="danger">{error}</Alert>}
      </ConfirmModal>
    </>
  );
}
