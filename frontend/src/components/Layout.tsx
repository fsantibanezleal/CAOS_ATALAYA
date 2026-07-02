import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { Briefcase, Database, Github, Globe, Info, Network } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ArchitectureModal } from "@/components/ArchitectureModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EXTERNAL_LINKS } from "@/lib/links";
import { ROUTES } from "@/lib/routes";
import { APP_VERSION } from "@/lib/version";

/** App shell: sticky header (brand + nav + external icon-links + architecture/language/theme toggles) and footer. */
export default function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [archOpen, setArchOpen] = useState(false);
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <NavLink to="/" className="brand" aria-label={t("product.name")}>
            <Network size={18} aria-hidden="true" className="brand-mark" />
            <span>{t("product.name")}</span>
          </NavLink>

          <nav className="main-nav" aria-label={t("product.name")}>
            {ROUTES.map((r) => (
              <NavLink
                key={r.id}
                to={r.path}
                end={r.path === "/"}
                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              >
                {t(r.labelKey)}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            <a className="icon-btn" href={EXTERNAL_LINKS.github} target="_blank" rel="noreferrer noopener"
               aria-label={t("header.github")} title={t("header.github")}>
              <Github size={18} aria-hidden="true" />
            </a>
            <a className="icon-btn" href={EXTERNAL_LINKS.personal} target="_blank" rel="noreferrer noopener"
               aria-label={t("header.personal")} title={t("header.personal")}>
              <Globe size={18} aria-hidden="true" />
            </a>
            <a className="icon-btn" href={EXTERNAL_LINKS.portfolio} target="_blank" rel="noreferrer noopener"
               aria-label={t("header.portfolio")} title={t("header.portfolio")}>
              <Briefcase size={18} aria-hidden="true" />
            </a>
            <a className="icon-btn" href={EXTERNAL_LINKS.source} target="_blank" rel="noreferrer noopener"
               aria-label={t("header.source")} title={t("header.source")}>
              <Database size={18} aria-hidden="true" />
            </a>
            <span className="header-sep" aria-hidden="true" />
            <button type="button" className="icon-btn" onClick={() => setArchOpen(true)}
                    aria-label={t("arch.open")} title={t("arch.open")} aria-haspopup="dialog">
              <Info size={18} aria-hidden="true" />
            </button>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="page"><ErrorBoundary label="page">{children}</ErrorBoundary></main>

      {archOpen && <ArchitectureModal onClose={() => setArchOpen(false)} />}

      <footer className="site-footer">
        <div className="footer-inner">
          {/* Compact, to-the-point footer (Lidar-3D style): product + lab + version + author + data provenance +
              ONE source link + license + honest one-liner. The personal/portfolio/data links already live in the
              header, so they are NOT repeated here (that duplication was a focus error). */}
          <span className="footer-brand">{t("product.name")}</span>
          <span aria-hidden="true">·</span>
          <span>{t("footer.lab")}</span>
          <span aria-hidden="true">·</span>
          <span className="footer-ver">{t("footer.version")}{APP_VERSION}</span>
          <span aria-hidden="true">·</span>
          <span>{t("footer.devBy")}</span>
          <span aria-hidden="true">·</span>
          <span className="faint">
            {t("footer.dataLabel")}: <a href={EXTERNAL_LINKS.source} target="_blank" rel="noreferrer noopener">{t("footer.dataName")}</a> ({t("footer.dataLicense")})
          </span>
          <span aria-hidden="true">·</span>
          <a href={EXTERNAL_LINKS.github} target="_blank" rel="noreferrer noopener">{t("footer.github")}</a>
          <span aria-hidden="true">·</span>
          <span className="faint">{t("footer.license")}</span>
          <span aria-hidden="true">·</span>
          <span className="faint">{t("footer.note")}</span>
        </div>
      </footer>
    </div>
  );
}
