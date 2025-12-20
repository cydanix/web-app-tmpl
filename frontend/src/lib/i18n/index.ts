import enMessages from './messages/en.json';
import esMessages from './messages/es.json';
import frMessages from './messages/fr.json';
import ptMessages from './messages/pt.json';
import deMessages from './messages/de.json';

export type Locale = 'en' | 'es' | 'fr' | 'pt' | 'de';

export const locales: Locale[] = ['en', 'es', 'fr', 'pt', 'de'];
export const defaultLocale: Locale = 'en';

export const messages = {
  en: enMessages,
  es: esMessages,
  fr: frMessages,
  pt: ptMessages,
  de: deMessages,
} as const;

export type Messages = typeof enMessages;

/**
 * Get nested translation value by dot-notation path
 * Example: getNestedValue(messages.en, 'common.home') => 'Home'
 */
function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((current, key) => current?.[key], obj) || path;
}

/**
 * Translate a key using dot notation
 * Example: t('common.home') => 'Home'
 * Supports pluralization: {plural} will be replaced with 's' if count > 1
 */
export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  let message = getNestedValue(messages[locale], key);
  
  if (!params) {
    return message;
  }
  
  // Handle pluralization: replace {plural} with 's' if count > 1, otherwise empty
  if (params.count !== undefined) {
    const count = typeof params.count === 'number' ? params.count : parseInt(String(params.count));
    const plural = count !== 1 ? 's' : '';
    message = message.replace(/\{plural\}/g, plural);
  }
  
  // Replace placeholders like {username} or {count} with values from params
  return Object.entries(params).reduce(
    (text, [paramKey, paramValue]) => {
      // Skip plural key as it's already handled
      if (paramKey === 'plural') return text;
      return text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
    },
    message
  );
}
