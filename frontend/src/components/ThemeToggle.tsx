import { useTranslation } from "react-i18next";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/state/useThemeStore";

/** Light/dark icon toggle. Shows the icon of the theme you would switch TO. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggleTheme}
      aria-label={t("header.toggleTheme")}
      title={t("header.toggleTheme")}
    >
      {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
      <span className="sr-only">
        {theme === "dark" ? t("header.lightThemeShort") : t("header.darkThemeShort")}
      </span>
    </button>
  );
}
