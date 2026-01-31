/**
 * LanguageSwitcher component for toggling between English and German languages
 * Provides a simple toggle switch for EN/DE language selection
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  changeLanguage,
  getCurrentLanguage,
  type SupportedLanguage,
} from '../i18n';

/**
 * Props for the LanguageSwitcher component
 */
export interface LanguageSwitcherProps {
  /** Custom CSS class name */
  className?: string;
  /** Display mode - 'toggle' for a switch, 'dropdown' for a select */
  mode?: 'toggle' | 'dropdown';
  /** Callback when language is changed */
  onLanguageChange?: (language: SupportedLanguage) => void;
}

/**
 * LanguageSwitcher component
 * Allows users to switch between English and German languages
 */
export function LanguageSwitcher({
  className,
  mode = 'toggle',
  onLanguageChange,
}: LanguageSwitcherProps): JSX.Element {
  const { t, i18n } = useTranslation();

  // Get current language (use resolvedLanguage for actual displayed language)
  const currentLanguage = (i18n.resolvedLanguage as SupportedLanguage) || getCurrentLanguage();

  /**
   * Handle language change
   */
  const handleLanguageChange = useCallback(
    async (newLanguage: SupportedLanguage) => {
      if (newLanguage !== currentLanguage) {
        await changeLanguage(newLanguage);
        onLanguageChange?.(newLanguage);
      }
    },
    [currentLanguage, onLanguageChange]
  );

  /**
   * Handle toggle button click
   */
  const handleToggle = useCallback(
    (language: SupportedLanguage) => {
      void handleLanguageChange(language);
    },
    [handleLanguageChange]
  );

  /**
   * Handle dropdown selection change
   */
  const handleSelectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newLanguage = event.target.value as SupportedLanguage;
      void handleLanguageChange(newLanguage);
    },
    [handleLanguageChange]
  );

  /**
   * Render toggle mode (button group)
   */
  const renderToggle = () => (
    <div
      className="inline-flex rounded-md border border-input shadow-sm"
      role="group"
      aria-label={t('language.select')}
    >
      {SUPPORTED_LANGUAGES.map((lang, index) => (
        <Button
          key={lang}
          type="button"
          variant={currentLanguage === lang ? 'default' : 'ghost'}
          size="sm"
          className={cn(
            'rounded-none',
            index === 0 && 'rounded-l-md',
            index === SUPPORTED_LANGUAGES.length - 1 && 'rounded-r-md',
            currentLanguage !== lang && 'border-0'
          )}
          onClick={() => handleToggle(lang)}
          aria-pressed={currentLanguage === lang}
          aria-label={t(`language.${lang}`)}
          title={LANGUAGE_NAMES[lang]}
        >
          {lang.toUpperCase()}
        </Button>
      ))}
    </div>
  );

  /**
   * Render dropdown mode (select element)
   */
  const renderDropdown = () => (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="language-select"
        className="text-sm font-medium text-foreground"
      >
        {t('language.title')}
      </label>
      <select
        id="language-select"
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1',
          'text-sm text-foreground shadow-sm transition-colors',
          'focus:outline-none focus:ring-1 focus:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
        value={currentLanguage}
        onChange={handleSelectChange}
        aria-label={t('language.select')}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {LANGUAGE_NAMES[lang]}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div
      className={cn('inline-flex', className)}
      role="region"
      aria-label={t('accessibility.languageSelector')}
    >
      {mode === 'toggle' ? renderToggle() : renderDropdown()}
    </div>
  );
}

export default LanguageSwitcher;
