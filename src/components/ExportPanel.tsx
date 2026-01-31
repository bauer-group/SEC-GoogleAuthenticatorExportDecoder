/**
 * ExportPanel component for downloading scanned accounts in various formats
 * Obsidian Security Design - sophisticated dark theme with elegant export buttons
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Check,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  FileJson,
  Shield,
  PackageOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Account, ExportFormat } from '../types';
import {
  downloadCSV,
  downloadJSON,
  downloadBitwarden,
  generateFilename,
} from '../utils/exporters';

/**
 * Props for the ExportPanel component
 */
export interface ExportPanelProps {
  accounts: Account[];
  className?: string;
  onExportSuccess?: (format: ExportFormat) => void;
  onExportError?: (format: ExportFormat, error: Error) => void;
}

interface ExportButtonState {
  csv: 'idle' | 'downloading' | 'success' | 'error';
  json: 'idle' | 'downloading' | 'success' | 'error';
  bitwarden: 'idle' | 'downloading' | 'success' | 'error';
}

/**
 * ExportPanel component with Obsidian Security Design
 */
export function ExportPanel({
  accounts,
  className,
  onExportSuccess,
  onExportError,
}: ExportPanelProps): JSX.Element {
  const { t } = useTranslation();
  const [buttonState, setButtonState] = useState<ExportButtonState>({
    csv: 'idle',
    json: 'idle',
    bitwarden: 'idle',
  });

  const canExport = accounts.length > 0;

  const resetButtonState = useCallback((format: ExportFormat) => {
    setTimeout(() => {
      setButtonState((prev) => ({
        ...prev,
        [format]: 'idle',
      }));
    }, 2000);
  }, []);

  const handleExportCSV = useCallback(() => {
    if (!canExport) return;

    try {
      setButtonState((prev) => ({ ...prev, csv: 'downloading' }));
      const filename = generateFilename('totp-accounts', 'csv');
      downloadCSV(accounts, filename);
      setButtonState((prev) => ({ ...prev, csv: 'success' }));
      onExportSuccess?.('csv');
      resetButtonState('csv');
    } catch (error) {
      setButtonState((prev) => ({ ...prev, csv: 'error' }));
      onExportError?.(
        'csv',
        error instanceof Error ? error : new Error('Export failed')
      );
      resetButtonState('csv');
    }
  }, [accounts, canExport, onExportSuccess, onExportError, resetButtonState]);

  const handleExportJSON = useCallback(() => {
    if (!canExport) return;

    try {
      setButtonState((prev) => ({ ...prev, json: 'downloading' }));
      const filename = generateFilename('totp-accounts', 'json');
      downloadJSON(accounts, filename);
      setButtonState((prev) => ({ ...prev, json: 'success' }));
      onExportSuccess?.('json');
      resetButtonState('json');
    } catch (error) {
      setButtonState((prev) => ({ ...prev, json: 'error' }));
      onExportError?.(
        'json',
        error instanceof Error ? error : new Error('Export failed')
      );
      resetButtonState('json');
    }
  }, [accounts, canExport, onExportSuccess, onExportError, resetButtonState]);

  const handleExportBitwarden = useCallback(() => {
    if (!canExport) return;

    try {
      setButtonState((prev) => ({ ...prev, bitwarden: 'downloading' }));
      const filename = generateFilename('bitwarden-export', 'bitwarden');
      downloadBitwarden(accounts, filename);
      setButtonState((prev) => ({ ...prev, bitwarden: 'success' }));
      onExportSuccess?.('bitwarden');
      resetButtonState('bitwarden');
    } catch (error) {
      setButtonState((prev) => ({ ...prev, bitwarden: 'error' }));
      onExportError?.(
        'bitwarden',
        error instanceof Error ? error : new Error('Export failed')
      );
      resetButtonState('bitwarden');
    }
  }, [accounts, canExport, onExportSuccess, onExportError, resetButtonState]);

  const getButtonIcon = (format: ExportFormat, defaultIcon: JSX.Element) => {
    const state = buttonState[format];
    switch (state) {
      case 'downloading':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'success':
        return <Check className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return defaultIcon;
    }
  };

  const getButtonStyles = (format: ExportFormat): string => {
    const state = buttonState[format];
    const baseStyles =
      'export-btn flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all';

    switch (state) {
      case 'success':
        return cn(
          baseStyles,
          'bg-[hsl(var(--success))] text-[hsl(var(--primary-foreground))]'
        );
      case 'error':
        return cn(
          baseStyles,
          'bg-[hsl(var(--destructive))] text-[hsl(var(--foreground))]'
        );
      case 'downloading':
        return cn(
          baseStyles,
          'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-wait'
        );
      default:
        return cn(
          baseStyles,
          'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[hsl(var(--primary))]'
        );
    }
  };

  return (
    <div
      className={cn(className)}
      role="region"
      aria-label={t('accessibility.exportOptions')}
    >
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
          {t('export.title')}
        </h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
          {t('export.description')}
        </p>
      </div>

      {/* Empty state */}
      {!canExport && (
        <div className="empty-state flex flex-col items-center justify-center py-10 px-6 rounded-xl text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mb-4">
            <PackageOpen className="w-7 h-7 text-[hsl(var(--muted-foreground))]" />
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {t('export.noAccounts')}
          </p>
        </div>
      )}

      {/* Export options */}
      <div className="space-y-3">
        {/* CSV Export */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-[hsl(var(--accent))]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">
                {t('export.csv.label')}
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                {t('export.csv.description')}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={getButtonStyles('csv')}
            onClick={handleExportCSV}
            disabled={!canExport || buttonState.csv === 'downloading'}
            aria-label={t('export.csv.download')}
          >
            {getButtonIcon('csv', <Download className="w-4 h-4" />)}
            <span className="hidden sm:inline">
              {buttonState.csv === 'success'
                ? t('export.downloadSuccess')
                : buttonState.csv === 'error'
                  ? t('export.downloadError')
                  : t('export.csv.download')}
            </span>
          </button>
        </div>

        {/* JSON Export */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center shrink-0">
              <FileJson className="w-5 h-5 text-[hsl(var(--info))]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">
                {t('export.json.label')}
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                {t('export.json.description')}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={getButtonStyles('json')}
            onClick={handleExportJSON}
            disabled={!canExport || buttonState.json === 'downloading'}
            aria-label={t('export.json.download')}
          >
            {getButtonIcon('json', <Download className="w-4 h-4" />)}
            <span className="hidden sm:inline">
              {buttonState.json === 'success'
                ? t('export.downloadSuccess')
                : buttonState.json === 'error'
                  ? t('export.downloadError')
                  : t('export.json.download')}
            </span>
          </button>
        </div>

        {/* Bitwarden Export */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--primary)/0.15)] flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">
                {t('export.bitwarden.label')}
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                {t('export.bitwarden.description')}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={getButtonStyles('bitwarden')}
            onClick={handleExportBitwarden}
            disabled={!canExport || buttonState.bitwarden === 'downloading'}
            aria-label={t('export.bitwarden.download')}
          >
            {getButtonIcon('bitwarden', <Download className="w-4 h-4" />)}
            <span className="hidden sm:inline">
              {buttonState.bitwarden === 'success'
                ? t('export.downloadSuccess')
                : buttonState.bitwarden === 'error'
                  ? t('export.downloadError')
                  : t('export.bitwarden.download')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportPanel;
