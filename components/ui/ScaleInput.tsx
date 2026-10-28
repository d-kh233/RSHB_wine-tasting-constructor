import { formatScaleValue, getScale, scaleValues, type ScaleId } from "@/lib/scales";
import { cx } from "./cx";

/** Словесная подсказка к 100-балльной шкале — чтобы гостю было понятно, что значит «87». */
const SCORE_BANDS: [min: number, label: string][] = [
  [96, "Выдающееся"],
  [90, "Отличное"],
  [85, "Очень хорошее"],
  [80, "Хорошее"],
  [70, "Среднее"],
  [60, "Ниже среднего"],
  [50, "Плохое"],
  [0, "Очень плохое"],
];

const STAR_LABELS = ["Плохо", "Так себе", "Нормально", "Хорошо", "Отлично"];

interface ScaleInputProps {
  scaleId: ScaleId;
  /** null — оценка ещё не выбрана. */
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/** Ввод оценки по шкале дегустации; вид контрола задаёт lib/scales.ts (slider / stars / buttons). */
export function ScaleInput({ scaleId, value, onChange, disabled }: ScaleInputProps) {
  const scale = getScale(scaleId);

  if (scale.input === "slider") {
    const mid = Math.round((scale.min + scale.max) / 2);
    const nudge = (delta: number) =>
      onChange(value === null ? mid : Math.min(scale.max, Math.max(scale.min, value + delta * scale.step)));
    const band = value === null ? null : SCORE_BANDS.find(([min]) => value >= min)?.[1];
    return (
      <div>
        <div className="text-center" aria-live="polite">
          <span className={cx("font-serif text-6xl leading-none", value === null ? "text-line" : "text-primary")}>
            {value ?? "—"}
          </span>
          <span className="ml-1 text-ink-muted">/ {scale.max}</span>
          <p className="mt-1 h-5 text-sm text-ink-muted">{band ?? "Передвиньте ползунок или нажмите ±"}</p>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <StepButton label="Меньше" disabled={disabled || value === scale.min} onClick={() => nudge(-1)}>
            −
          </StepButton>
          <input
            type="range"
            min={scale.min}
            max={scale.max}
            step={scale.step}
            value={value ?? mid}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label={`Оценка от ${scale.min} до ${scale.max}`}
            className={cx("h-11 min-w-0 flex-1 accent-primary", value === null && "opacity-50")}
          />
          <StepButton label="Больше" disabled={disabled || value === scale.max} onClick={() => nudge(1)}>
            +
          </StepButton>
        </div>
        <div className="mt-1 flex justify-between px-14 text-xs text-ink-muted">
          <span>{scale.min}</span>
          <span>{scale.max}</span>
        </div>
      </div>
    );
  }

  if (scale.input === "stars") {
    return (
      <div>
        <div role="radiogroup" aria-label="Оценка в звёздах" className="flex justify-center gap-1">
          {scaleValues(scaleId).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} из ${scale.max}`}
              disabled={disabled}
              onClick={() => onChange(n)}
              className={cx(
                "flex h-14 w-14 items-center justify-center rounded-md text-5xl leading-none transition-transform active:scale-90",
                value !== null && n <= value ? "text-accent" : "text-line",
              )}
            >
              ★
            </button>
          ))}
        </div>
        <p className="mt-2 h-5 text-center text-sm text-ink-muted" aria-live="polite">
          {value === null ? "Нажмите на звезду" : STAR_LABELS[value - 1]}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div role="radiogroup" aria-label={`Оценка от ${scale.min} до ${scale.max}`} className="grid grid-cols-5 gap-2">
        {scaleValues(scaleId).map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(n)}
              className={cx(
                "h-12 rounded-md border text-base font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-ink-inverse"
                  : Number.isInteger(n)
                    ? "border-line bg-surface text-ink hover:border-primary"
                    : "border-line bg-surface-muted text-ink-muted hover:border-primary",
              )}
            >
              {String(n).replace(".", ",")}
            </button>
          );
        })}
      </div>
      <p className="mt-2 h-5 text-center text-sm text-ink-muted" aria-live="polite">
        {value === null ? "Выберите оценку" : `Ваша оценка: ${formatScaleValue(scaleId, value)}`}
      </p>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-2xl text-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}
