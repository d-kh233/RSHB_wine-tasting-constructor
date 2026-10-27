import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import * as tastingService from "@/services/tastingService";

type Props = { children: ReactNode; params: Promise<{ adminKey: string }> };

/**
 * Проверка ключа — в layout, а не только в page: page обёрнута в Suspense из loading.tsx,
 * и notFound() оттуда срабатывает после начала стриминга — браузер получает HTTP 200.
 * Layout рендерится до границы Suspense, поэтому неверная ссылка отдаёт честный 404
 * (страница — app/org/not-found.tsx).
 */
export default async function OrgLayout({ children, params }: Props) {
  const { adminKey } = await params;
  if (!(await tastingService.exists(adminKey))) notFound();
  return children;
}
