import { cx } from "../ui/cx";

/** Крупный лист с прожилками; основание в (0,0), кончик вправо. */
const LEAF = "M0 0C9-12 30-14 44-2C32 11 12 12 0 0Z";
const VEINS = "M0 0L40-2M14-1l6-7M14-1l7 6M26-1l6-7M26-1l6 6";

function Leaf({ transform }: { transform: string }) {
  return (
    <g transform={transform} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
      <path d={LEAF} className="fill-leaf-soft stroke-leaf" />
      <path d={VEINS} className="fill-none stroke-leaf" />
    </g>
  );
}

/** Ягоды грозди: [x, y]. */
const GRAPES: [number, number][] = [
  [244, 56], [262, 56], [280, 56],
  [235, 72], [253, 72], [271, 72], [289, 72],
  [244, 88], [262, 88], [280, 88],
  [253, 104], [271, 104],
  [262, 120],
];

/** Иллюстрация главной: бокал, виноградная лоза с гроздью и листья. Цвета — токены. */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 260" aria-hidden className={cx("h-auto w-full", className)}>
      <circle cx="190" cy="140" r="108" className="fill-primary-soft" />
      <ellipse cx="180" cy="238" rx="150" ry="8" className="fill-ink/5" />

      {/* Лоза и усики */}
      <g className="fill-none stroke-leaf" strokeLinecap="round">
        <path d="M8 58C60 22 112 76 176 46S292 14 352 44" strokeWidth="3" />
        <path d="M116 60c6 10-2 19-9 14-5-4 0-10 4-6" strokeWidth="1.5" />
        <path d="M318 28c4-9 13-8 13-1s-7 7-8 2" strokeWidth="1.5" />
        <path d="M265 24c0 10-2 18-3 26" strokeWidth="2.5" />
      </g>
      <Leaf transform="translate(64 40) rotate(-140)" />
      <Leaf transform="translate(140 58) rotate(55)" />
      <Leaf transform="translate(206 38) rotate(-55)" />
      <Leaf transform="translate(330 38) rotate(70) scale(.8)" />

      {/* Гроздь */}
      {GRAPES.map(([x, y], i) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="9" className={i % 3 === 1 ? "fill-primary-hover" : "fill-primary"} />
          <circle cx={x - 3} cy={y - 3} r="2.2" className="fill-surface/40" />
        </g>
      ))}

      {/* Бокал */}
      <path d="M118 112h64c0 38-12 64-32 64s-32-26-32-64Z" className="fill-surface stroke-primary" strokeWidth="3" strokeLinejoin="round" />
      <path d="M119.6 136h60.8c-2.6 25-13.8 38.5-30.4 38.5S122.2 161 119.6 136Z" className="fill-primary" />
      <ellipse cx="150" cy="136" rx="30.4" ry="3" className="fill-primary-hover" />
      <path d="M128 120c0 16 3 30 9 40" className="fill-none stroke-surface/70" strokeWidth="3" strokeLinecap="round" />
      <path d="M150 177v49" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="150" cy="228" rx="24" ry="4" className="fill-surface stroke-primary" strokeWidth="3" />

      {/* У подножия: упавший лист и пара ягод */}
      <Leaf transform="translate(194 232) rotate(-12) scale(.8)" />
      <circle cx="96" cy="229" r="7" className="fill-primary" />
      <circle cx="110" cy="232" r="5.5" className="fill-primary-hover" />
    </svg>
  );
}
