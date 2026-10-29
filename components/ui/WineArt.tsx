import type { WineColor } from "@/lib/constants";
import { cx } from "./cx";

/** Цвет вина в бокале и фон шаблона. null — цвет неизвестен. */
const PALETTE: Record<WineColor | "unknown", { wine: string; bg: string }> = {
  red: { wine: "#7b1e3a", bg: "#f6e6eb" },
  white: { wine: "#e6cf72", bg: "#f9f3dc" },
  rose: { wine: "#ee9fa3", bg: "#fbe9ea" },
  sparkling: { wine: "#efdc95", bg: "#f8f4e3" },
  orange: { wine: "#dc8a35", bg: "#fbeedd" },
  fortified: { wine: "#8a3b12", bg: "#f5e7dc" },
  unknown: { wine: "#b9a2aa", bg: "#f4eee9" },
};

const SIZE = {
  sm: "h-16 w-12",
  lg: "h-36 w-28",
} as const;

/**
 * Картинка вина: фото, если организатор его загрузил, иначе шаблон — бутылка и бокал в цвет вина.
 * `hidden` — бутылка не раскрыта (слепой режим): шаблон «бутылка в бумажном пакете» без цвета и фото.
 */
export function WineArt({
  src,
  color,
  hidden = false,
  alt,
  size = "sm",
  className,
}: {
  src: string | null;
  color: WineColor | null;
  hidden?: boolean;
  alt: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const box = cx("shrink-0 overflow-hidden rounded-md border border-line", SIZE[size], className);
  if (src && !hidden) {
    // Фото с телефона: показываем целиком, без обрезки этикетки.
    return <img src={src} alt={alt} loading="lazy" decoding="async" className={cx(box, "bg-surface-muted object-contain")} />;
  }
  return (
    <div className={box} role="img" aria-label={alt}>
      {hidden ? <BaggedBottle /> : <BottleAndGlass color={color} />}
    </div>
  );
}

function BottleAndGlass({ color }: { color: WineColor | null }) {
  const key = color ?? "unknown";
  const { wine, bg } = PALETTE[key];
  // id градиента по цвету: одинаковые id на странице описывают одинаковые градиенты — конфликта нет.
  const id = `wine-art-${key}`;
  return (
    <svg viewBox="0 0 60 80" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor={bg} />
        </linearGradient>
      </defs>
      <rect width="60" height="80" fill={`url(#${id}-bg)`} />
      {/* бутылка */}
      <path d="M20 8h6v14c0 3 6 6 6 13v37a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V35c0-7 6-10 6-13z" fill="#2f4a3a" />
      <rect x="20" y="6" width="6" height="5" rx="1" fill={color === "sparkling" ? "#c9a64a" : "#5a2a33"} />
      <rect x="15.5" y="44" width="15" height="14" rx="1.5" fill="#fbf6ee" />
      <rect x="18" y="48" width="10" height="1.6" rx="0.8" fill={wine} />
      <rect x="19.5" y="52" width="7" height="1.2" rx="0.6" fill="#b9a2aa" />
      {/* бокал */}
      <path d="M38 40h16c0 9-3 15-8 15s-8-6-8-15z" fill="#fff" fillOpacity="0.7" stroke="#c9bcc1" strokeWidth="0.8" />
      <path d="M38.6 45h14.8c-0.8 6-3.4 10-7.4 10s-6.6-4-7.4-10z" fill={wine} />
      {color === "sparkling" && (
        <g fill="#fff" fillOpacity="0.9">
          <circle cx="44" cy="50" r="0.8" />
          <circle cx="47.5" cy="48" r="0.6" />
          <circle cx="46" cy="52.5" r="0.7" />
        </g>
      )}
      <rect x="45.4" y="55" width="1.2" height="12" fill="#c9bcc1" />
      <ellipse cx="46" cy="68" rx="5" ry="1.4" fill="#c9bcc1" />
    </svg>
  );
}

/** Слепой режим: бутылка в крафтовом пакете — ни цвета, ни формы бутылки не видно. */
function BaggedBottle() {
  return (
    <svg viewBox="0 0 60 80" className="h-full w-full" aria-hidden>
      <rect width="60" height="80" fill="#f4eee9" />
      <rect x="25" y="5" width="10" height="9" rx="1.5" fill="#5a4a4f" />
      <path d="M16 16l4-4h20l4 4v58a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2z" fill="#c9a27a" />
      <path d="M20 12l3 6h14l3-6" fill="none" stroke="#a9825c" strokeWidth="1" />
      <path d="M22 30h16M22 66h16" stroke="#a9825c" strokeWidth="0.8" />
      <text x="30" y="54" textAnchor="middle" fontSize="18" fontFamily="Georgia, serif" fill="#6b4f36">
        ?
      </text>
    </svg>
  );
}
