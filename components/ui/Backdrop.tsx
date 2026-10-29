/** Лист с прожилкой; основание в (0,0), кончик вправо. */
const LEAF = "M0 0C5-6 15-7 22-1C16 5 6 6 0 0ZM0 0L19-1";

function Leaf({ x, y, angle }: { x: number; y: number; angle: number }) {
  return <path d={LEAF} transform={`translate(${x} ${y}) rotate(${angle})`} />;
}

/**
 * Фон всех страниц: кремовый градиент и тонкий повторяющийся узор из виноградной лозы.
 * Цвет и прозрачность узора — токены --pattern-color и --pattern-opacity. Статичный, без анимаций.
 */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-bg to-bg-deep print:hidden">
      <svg
        className="absolute inset-0 h-full w-full"
        style={{ color: "rgb(var(--pattern-color))", opacity: "var(--pattern-opacity)" }}
      >
        <defs>
          <pattern id="backdrop-vine" width="160" height="160" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              {/* Две лозы встречными волнами; концы совпадают по краям плитки — узор без швов. */}
              <path d="M0 40C20 25 60 25 80 40S140 55 160 40" />
              <path d="M0 120C20 135 60 135 80 120S140 105 160 120" />
              <Leaf x={40} y={28.75} angle={-70} />
              <Leaf x={120} y={51.25} angle={110} />
              <Leaf x={40} y={131.25} angle={70} />
              <Leaf x={120} y={108.75} angle={-110} />
              <path d="M80 40c3-6 10-6 10-1s-5 5-6 2" />
              <path d="M80 120v5" />
              <circle cx="74" cy="128" r="3" />
              <circle cx="80" cy="128" r="3" />
              <circle cx="86" cy="128" r="3" />
              <circle cx="77" cy="134" r="3" />
              <circle cx="83" cy="134" r="3" />
              <circle cx="80" cy="140" r="3" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#backdrop-vine)" />
      </svg>
    </div>
  );
}
