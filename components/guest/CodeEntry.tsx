"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { INVITE_CODE_LENGTH } from "@/lib/constants";
import { Button } from "../ui/Button";
import { cx } from "../ui/cx";
import { Input } from "../ui/Field";

/** Вход гостя по коду, если QR не сканируется: код продиктовали или написали на доске. */
export function CodeEntry({ className }: { className?: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const clean = code.trim().toUpperCase();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (clean) router.push(`/t/${encodeURIComponent(clean)}`);
  }

  return (
    <form onSubmit={onSubmit} className={cx("flex gap-2", className)}>
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Код, например DEGUST"
        aria-label="Код дегустации"
        maxLength={INVITE_CODE_LENGTH + 4}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        // Подсказка — обычным шрифтом: моноширинная в верхнем регистре не влезает в поле на 375px.
        className="font-mono uppercase tracking-widest placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
      />
      <Button type="submit" variant="secondary" disabled={!clean} className="shrink-0">
        Войти
      </Button>
    </form>
  );
}
