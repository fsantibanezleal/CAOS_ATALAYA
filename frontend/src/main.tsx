import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Side-effecting i18n init (configures the i18next singleton) — before any useTranslation call.
import "@/i18n/config";
import { applyTheme, readTheme } from "@/lib/theme";
import "@/styles/globals.css";
import "@/styles/atalaya.css";
import AppRouter from "@/router";

applyTheme(readTheme());

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error('Root element "#root" not found');

createRoot(rootEl).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
