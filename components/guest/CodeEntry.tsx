"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { INVITE_CODE_LENGTH } from "@/lib/constants";
import { Button } from "../ui/Button";
import { Input } from "../ui/Field";

/** Вход гостя по коду, если QR не сканируется: код продиктовали или написали на доске. */
export function CodeEntry() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const clean = code.trim().toUpperCase();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (clean) router.push(`/t/${encodeURIComponent(clean)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Код, например DEGUST"
        aria-label="Код дегустации"
        maxLength={INVITE_CODE_LENGTH + 4}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        className="font-mono uppercase tracking-widest"
      />
      <Button type="submit" variant="secondary" disabled={!clean} className="shrink-0">
        Войти
      </Button>
    </form>
  );
}
