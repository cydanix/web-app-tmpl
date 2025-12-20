"use client";

import { Dropdown } from "react-bootstrap";
import { useI18n } from "@/contexts/i18n-context";
import { locales, Locale } from "@/lib/i18n";

const languageNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  pt: "Português",
  de: "Deutsch",
};

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <Dropdown>
      <Dropdown.Toggle
        variant="outline-secondary"
        size="sm"
        id="language-dropdown"
        className="d-flex align-items-center gap-2"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        {languageNames[locale]}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {locales.map((loc) => (
          <Dropdown.Item
            key={loc}
            active={locale === loc}
            onClick={() => setLocale(loc)}
          >
            {languageNames[loc]}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
