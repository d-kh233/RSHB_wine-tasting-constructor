"use client";

/** Дата в часовом поясе зрителя. На сервере пояс другой — расхождение при гидратации ожидаемо. */
export function LocalDate({ iso, className }: { iso: string; className?: string }) {
  const text = new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}
