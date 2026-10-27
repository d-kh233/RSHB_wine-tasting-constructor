import type { Config } from "tailwindcss";

/** Цвет из CSS-переменной app/globals.css с поддержкой прозрачности (bg-primary/10). */
const token = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    // Палитра ЗАМЕНЕНА целиком (не extend): стандартные bg-red-500 и т.п. недоступны —
    // в компонентах можно использовать только семантические токены.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      inherit: "inherit",
      bg: token("bg"),
      surface: {
        DEFAULT: token("surface"),
        muted: token("surface-muted"),
      },
      line: token("line"),
      ink: {
        DEFAULT: token("ink"),
        muted: token("ink-muted"),
        inverse: token("ink-inverse"),
      },
      primary: {
        DEFAULT: token("primary"),
        hover: token("primary-hover"),
        soft: token("primary-soft"),
      },
      accent: {
        DEFAULT: token("accent"),
        soft: token("accent-soft"),
      },
      success: { DEFAULT: token("success"), soft: token("success-soft") },
      warning: { DEFAULT: token("warning"), soft: token("warning-soft") },
      danger: { DEFAULT: token("danger"), soft: token("danger-soft") },
      info: { DEFAULT: token("info"), soft: token("info-soft") },
    },
    fontFamily: {
      sans: "var(--font-sans)",
      serif: "var(--font-serif)",
    },
    borderRadius: {
      none: "0",
      sm: "var(--radius-sm)",
      md: "var(--radius-md)",
      lg: "var(--radius-lg)",
      pill: "var(--radius-pill)",
      full: "9999px",
    },
    boxShadow: {
      none: "none",
      card: "var(--shadow-card)",
      raised: "var(--shadow-raised)",
      modal: "var(--shadow-modal)",
      focus: "var(--shadow-focus)",
    },
    extend: {
      maxWidth: {
        page: "64rem",
        form: "32rem",
      },
    },
  },
  plugins: [],
};

export default config;
