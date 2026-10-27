import { cx } from "./cx";

export interface Step<T extends string> {
  id: T;
  label: string;
}

/** Шаги кабинета организатора; работают как вкладки (переход на любой шаг). */
export function Stepper<T extends string>({
  steps,
  current,
  onSelect,
}: {
  steps: Step<T>[];
  current: T;
  onSelect: (id: T) => void;
}) {
  return (
    <nav aria-label="Шаги" className="border-b border-line">
      <ol className="-mb-px flex">
        {steps.map((step, i) => {
          const active = step.id === current;
          return (
            <li key={step.id} className="min-w-0 flex-1 sm:flex-none">
              <button
                type="button"
                onClick={() => onSelect(step.id)}
                aria-current={active ? "step" : undefined}
                className={cx(
                  "flex w-full items-center justify-center gap-2 border-b-2 px-2 py-3 text-sm font-medium transition-colors sm:px-5",
                  active ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                <span
                  className={cx(
                    // На узком экране номер скрываем, чтобы подпись шага помещалась целиком.
                    "hidden h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs sm:flex",
                    active ? "bg-primary text-ink-inverse" : "bg-surface-muted text-ink-muted",
                  )}
                >
                  {i + 1}
                </span>
                <span className="truncate">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
