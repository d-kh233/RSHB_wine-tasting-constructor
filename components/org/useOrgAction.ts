"use client";

import { useRef, useState } from "react";
import { api, ApiError, errorMessage } from "@/lib/apiClient";
import type { OrgTastingDTO } from "@/lib/dto";

/**
 * Действие организатора, возвращающее свежий OrgTastingDTO: одно за раз (двойной клик не уходит
 * на сервер), `busy` — id выполняемого действия для индикатора на нужной кнопке.
 */
export function useOrgAction(adminKey: string, onChange: (t: OrgTastingDTO) => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const lock = useRef(false);
  const [error, setError] = useState<string | null>(null);

  async function run(id: string, request: () => Promise<OrgTastingDTO>): Promise<boolean> {
    if (lock.current) return false;
    lock.current = true;
    setBusy(id);
    setError(null);
    try {
      onChange(await request());
      return true;
    } catch (err) {
      setError(errorMessage(err));
      // Конфликт состояния (действие из другой вкладки и т.п.) — подтягиваем актуальное.
      if (err instanceof ApiError && err.status === 409) {
        api<OrgTastingDTO>(`/api/org/${adminKey}`).then(onChange, () => {});
      }
      return false;
    } finally {
      lock.current = false;
      setBusy(null);
    }
  }

  return { busy, error, run };
}
