import { cx } from "./cx";

export interface Choice<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/** Радио-кнопки карточками: крупная зона нажатия, подсказка под каждым вариантом. */
export function ChoiceGroup<T extends string>({
  name,
  label,
  choices,
  value,
  onChange,
  disabled,
  columns = 2,
}: {
  name: string;
  label: string;
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  columns?: 2 | 3;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-1.5 text-sm font-medium text-ink">{label}</legend>
      <div className={cx("grid gap-2", columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {choices.map((c) => {
          const active = c.value === value;
          return (
            <label
              key={c.value}
              className={cx(
                "flex cursor-pointer gap-2.5 rounded-md border p-3 transition-colors",
                active ? "border-primary bg-primary-soft" : "border-line bg-surface hover:border-primary/50",
                disabled && "cursor-not-allowed opacity-70",
              )}
            >
              <input
                type="radio"
                name={name}
                value={c.value}
                checked={active}
                onChange={() => onChange(c.value)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{c.label}</span>
                {c.hint && <span className="mt-0.5 block text-xs text-ink-muted">{c.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
