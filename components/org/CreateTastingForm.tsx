"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError, errorMessage } from "@/lib/apiClient";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { EMPTY_TASTING_FORM, formToPayload, TastingFields } from "./TastingFields";

export function CreateTastingForm() {
  const router = useRouter();
  const [values, setValues] = useState(EMPTY_TASTING_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { adminKey } = await api<{ adminKey: string }>("/api/tastings", { body: formToPayload(values) });
      router.push(`/org/${adminKey}?created=1`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login?next=/cabinet/new"); // сессия истекла
        return;
      }
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <TastingFields values={values} onChange={setValues} disabled={submitting} />
      {error && <Alert tone="danger">{error}</Alert>}
      <Button type="submit" size="lg" block loading={submitting}>
        Создать дегустацию
      </Button>
    </form>
  );
}
