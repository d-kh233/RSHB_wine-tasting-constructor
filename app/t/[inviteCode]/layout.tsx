import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import * as guestService from "@/services/guestService";

type Props = { children: ReactNode; params: Promise<{ inviteCode: string }> };

/** Неверный код → HTTP 404 до начала стриминга (см. app/org/[adminKey]/layout.tsx). */
export default async function GuestLayout({ children, params }: Props) {
  const { inviteCode } = await params;
  if (!(await guestService.exists(inviteCode))) notFound();
  return children;
}
