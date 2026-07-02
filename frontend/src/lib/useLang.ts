import { useTranslation } from "react-i18next";
import type { Language } from "@/i18n/config";

/** Current 2-letter language, for components that render language-branched long-form content. */
export function useLang(): Language {
  const { i18n } = useTranslation();
  const code = (i18n.resolvedLanguage ?? i18n.language ?? "en").slice(0, 2);
  return code === "es" ? "es" : "en";
}
