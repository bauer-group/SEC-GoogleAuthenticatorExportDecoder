/**
 * i18n Configuration
 *
 * Configures internationalization with:
 * - HTTP backend for loading translation files
 * - Browser language detection (localStorage + navigator)
 * - React integration via react-i18next
 *
 * Supported languages: English (en), German (de)
 * Fallback: English
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

/**
 * Supported language codes
 */
export const SUPPORTED_LANGUAGES = ['en', 'de'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Language display names for UI
 */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  de: 'Deutsch',
};

/**
 * Default/fallback language
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

/**
 * Initialize i18next with all plugins
 */
i18n
  // Load translations via HTTP
  .use(Backend)
  // Detect user language from browser/localStorage
  .use(LanguageDetector)
  // Pass i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize configuration
  .init({
    // Fallback language when translation not found
    fallbackLng: DEFAULT_LANGUAGE,

    // List of supported languages
    supportedLngs: SUPPORTED_LANGUAGES,

    // Enable debug mode in development only
    debug: import.meta.env.DEV,

    // Interpolation settings
    interpolation: {
      // React already escapes values, no need to escape again
      escapeValue: false,
    },

    // HTTP backend configuration
    backend: {
      // Path to load translation files
      // {{lng}} = language code, {{ns}} = namespace
      // Use BASE_URL to support GitHub Pages deployment with subpath
      loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}/{{ns}}.json`,
    },

    // Language detection configuration
    detection: {
      // Order of detection methods (most preferred first)
      order: ['localStorage', 'navigator', 'htmlTag'],

      // Keys to use for storage
      lookupLocalStorage: 'i18nextLng',

      // Cache user language in localStorage
      caches: ['localStorage'],
    },

    // React-specific settings
    react: {
      // Suspense mode for async loading
      useSuspense: true,
    },

    // Default namespace
    defaultNS: 'translation',

    // Namespaces to load
    ns: ['translation'],
  });

/**
 * Get the current resolved language
 *
 * IMPORTANT: Use i18n.resolvedLanguage instead of i18n.language
 * to get the actual language being used (after fallback resolution)
 */
export function getCurrentLanguage(): SupportedLanguage {
  return (i18n.resolvedLanguage as SupportedLanguage) || DEFAULT_LANGUAGE;
}

/**
 * Change the current language
 *
 * @param lang - Language code to switch to
 */
export async function changeLanguage(lang: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
}

/**
 * Check if a language is supported
 *
 * @param lang - Language code to check
 */
export function isLanguageSupported(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

export default i18n;
