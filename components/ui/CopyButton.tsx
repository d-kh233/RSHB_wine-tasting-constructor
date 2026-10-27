"use client";

import { useState } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "./Button";

/** navigator.clipboard есть только в secure context; по http в локальной сети — запасной путь через execCommand. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* пробуем запасной путь */
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

export function CopyButton({
  text,
  label = "Копировать",
  variant = "secondary",
  size = "md",
  className,
}: {
  /** Строка или функция (например, чтобы взять window.location на клиенте). */
  text: string | (() => string);
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function onClick() {
    const ok = await copyText(typeof text === "function" ? text() : text);
    setState(ok ? "copied" : "failed");
    window.setTimeout(() => setState("idle"), 2000);
  }

  return (
    <Button variant={variant} size={size} onClick={onClick} className={className} aria-live="polite">
      {state === "copied" ? "✓ Скопировано" : state === "failed" ? "Не удалось" : label}
    </Button>
  );
}
