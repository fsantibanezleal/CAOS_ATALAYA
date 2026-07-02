import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { persistLanguage, type Language } from "@/i18n/config";

/** Language toggle. Shows the current language code; pressing it swaps and persists. */
export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const current = ((i18n.resolvedLanguage ?? i18n.language ?? "en").slice(0, 2)) as Language;
  const next: Language = current === "en" ? "es" : "en";

  const swap = async (): Promise<void> => {
    await i18n.changeLanguage(next);
    persistLanguage(next);
  };

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={() => void swap()}
      aria-label={t("header.toggleLanguage")}
      title={t("header.toggleLanguage")}
    >
      <Languages size={18} aria-hidden="true" />
      <span className="lang-code">{current}</span>
    </button>
  );
}
