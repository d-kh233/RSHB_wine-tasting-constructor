import { RATING_REJECT_REASON_LABEL } from "@/lib/constants";
import type { SummaryDTO } from "@/lib/dto";
import { plural } from "@/lib/plural";
import { formatScaleValue, isValidValue } from "@/lib/scales";
import { Card } from "../ui/Card";
import { LocalDate } from "../ui/LocalDate";
import { Stat } from "../ui/Stat";

const RATINGS: [string, string, string] = ["оценка", "оценки", "оценок"];

/** Валидность оценок: сколько уйдёт в рейтинг и таблица отброшенных попыток с причиной. */
export function ValidityPanel({ summary }: { summary: SummaryDTO }) {
  const belowMin = summary.wines.filter((w) => w.belowMinGuests && w.count > 0);
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-xl">Валидность оценок</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Отброшенные оценки не сохраняются и не влияют на итоги — здесь видно, что и почему не прошло.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <Stat label="Валидных" value={String(summary.validRatings)} strong />
        <Stat label="Отброшено" value={String(summary.rejectedTotal)} />
        <Stat label="Минимум гостей" value={summary.minGuests > 0 ? String(summary.minGuests) : "не задан"} />
      </dl>

      {belowMin.length > 0 && (
        <p className="text-sm text-warning">
          Не уйдут в рейтинг — у вина меньше {summary.minGuests} гостей:{" "}
          {belowMin.map((w) => `${w.label} (${plural(w.count, RATINGS)})`).join(", ")}.
        </p>
      )}

      {summary.rejected.length === 0 ? (
        <p className="text-sm text-ink-muted">Отброшенных оценок нет.</p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="text-xs text-ink-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-medium">Время</th>
                <th className="py-2 pr-3 font-medium">Гость</th>
                <th className="py-2 pr-3 font-medium">Вино</th>
                <th className="py-2 pr-3 font-medium">Значение</th>
                <th className="py-2 font-medium">Причина</th>
              </tr>
            </thead>
            <tbody>
              {summary.rejected.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="whitespace-nowrap py-2 pr-3 text-ink-muted">
                    <LocalDate iso={r.createdAt} />
                  </td>
                  <td className="max-w-[10rem] truncate py-2 pr-3">{r.guestName ?? "—"}</td>
                  <td className="whitespace-nowrap py-2 pr-3">{r.position !== null ? `№${r.position}` : "—"}</td>
                  <td className="whitespace-nowrap py-2 pr-3">
                    {r.value === null
                      ? "—"
                      : isValidValue(summary.scale, r.value)
                        ? formatScaleValue(summary.scale, r.value)
                        : String(r.value)}
                  </td>
                  <td className="py-2">{RATING_REJECT_REASON_LABEL[r.reason] ?? r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {summary.rejectedTotal > summary.rejected.length && (
            <p className="mt-2 text-xs text-ink-muted">Показаны последние {summary.rejected.length} из {summary.rejectedTotal}.</p>
          )}
        </div>
      )}
    </Card>
  );
}

/** Как защищены голоса — коротко для организатора. */
export function VoteProtection() {
  return (
    <Card className="space-y-2">
      <h2 className="text-xl">Как защищены голоса</h2>
      <ul className="list-inside list-disc space-y-1 text-sm text-ink">
        <li>Один гость — одна оценка на вино: проверка в сервисе и UNIQUE в базе данных.</li>
        <li>Гость узнаётся по cookie с секретным токеном; в базе хранится только его хэш.</li>
        <li>Вход и отправка оценок ограничены по частоте с одного адреса для каждой дегустации.</li>
        <li>В рейтинг уходят только валидные оценки, анонимно, а повтор передачи не создаёт дублей.</li>
      </ul>
    </Card>
  );
}
