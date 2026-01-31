/**
 * Main App component for Google Authenticator QR Code Export Tool
 *
 * Obsidian Security Design - A sophisticated dark theme with
 * glassmorphism effects and refined typography.
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  Camera,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { QRScanner } from './components/QRScanner';
import { FileUpload } from './components/FileUpload';
import { AccountList } from './components/AccountList';
import { ExportPanel } from './components/ExportPanel';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { ThemeToggle } from './components/ThemeToggle';
import { decodeExportUri, mergeBatchResults, checkBatchComplete } from './utils/decoder';
import { getPWAEnvironment } from './utils/pwa';
import { cn } from '@/lib/utils';
import { version } from '../package.json';
import type { Account, BatchInfo, DecodeResult, DecoderError, ExportFormat } from './types';

/**
 * Scanner input mode - camera (webcam) or file upload
 */
type ScannerMode = 'camera' | 'file';

/**
 * Notification state for displaying messages to the user
 */
interface Notification {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  id: number;
}

/**
 * Get notification icon based on type
 */
const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-5 h-5 shrink-0" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 shrink-0" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 shrink-0" />;
    case 'info':
      return <Info className="w-5 h-5 shrink-0" />;
  }
};

/**
 * Get notification styles based on type
 */
const getNotificationStyles = (type: Notification['type']): string => {
  const baseStyles =
    'flex items-center gap-3 p-4 rounded-xl shadow-lg animate-slide-up';

  switch (type) {
    case 'success':
      return cn(baseStyles, 'notification-success');
    case 'error':
      return cn(baseStyles, 'notification-error');
    case 'warning':
      return cn(baseStyles, 'notification-warning');
    case 'info':
      return cn(baseStyles, 'notification-info');
    default:
      return baseStyles;
  }
};

/**
 * Main App component
 */
function App(): JSX.Element {
  const { t } = useTranslation();

  // PWA environment detection
  const pwaEnvironment = useMemo(() => getPWAEnvironment(), []);

  // Determine initial scanner mode based on camera availability
  const initialScannerMode: ScannerMode = pwaEnvironment.isCameraLikelySupported
    ? 'camera'
    : 'file';

  // Scanner state
  const [scannerMode, setScannerMode] = useState<ScannerMode>(initialScannerMode);
  const [isScannerActive, setIsScannerActive] = useState(
    pwaEnvironment.isCameraLikelySupported
  );

  // Account state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
  const [decodeResults, setDecodeResults] = useState<DecodeResult[]>([]);

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationId, setNotificationId] = useState(0);

  /**
   * Show a notification to the user
   */
  const showNotification = useCallback(
    (type: Notification['type'], message: string) => {
      const id = notificationId;
      setNotificationId((prev) => prev + 1);

      setNotifications((prev) => [...prev, { type, message, id }]);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 5000);
    },
    [notificationId]
  );

  /**
   * Dismiss a notification
   */
  const dismissNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  /**
   * Handle successful QR code scan/upload
   */
  const handleScan = useCallback(
    (decodedText: string) => {
      try {
        const result = decodeExportUri(decodedText);

        const firstResult = decodeResults[0];
        const isSameBatch =
          decodeResults.length > 0 &&
          firstResult !== undefined &&
          firstResult.batch.batchId === result.batch.batchId;

        const alreadyScanned = decodeResults.some(
          (r) =>
            r.batch.batchId === result.batch.batchId &&
            r.batch.batchIndex === result.batch.batchIndex
        );

        if (alreadyScanned) {
          showNotification('info', t('scanner.duplicateScan'));
          return;
        }

        const newResults = isSameBatch ? [...decodeResults, result] : [result];
        setDecodeResults(newResults);

        const mergedAccounts = mergeBatchResults(newResults);
        setAccounts(mergedAccounts);

        setBatchInfo(result.batch);

        const batchStatus = checkBatchComplete(newResults);

        if (result.batch.batchSize > 1) {
          if (batchStatus.isComplete) {
            showNotification(
              'success',
              t('scanner.batchComplete', { count: mergedAccounts.length })
            );
          } else {
            showNotification(
              'info',
              t('scanner.batchProgress', {
                scanned: batchStatus.scannedCount,
                total: batchStatus.totalCount,
              })
            );
          }
        } else {
          showNotification(
            'success',
            t('scanner.scanSuccess', { count: result.accounts.length })
          );
        }
      } catch (error) {
        const decoderError = error as DecoderError;
        const errorMessage = decoderError.message || t('errors.decodeFailed');
        showNotification('error', errorMessage);
      }
    },
    [decodeResults, showNotification, t]
  );

  /**
   * Handle scan/upload errors
   */
  const handleScanError = useCallback(
    (error: string) => {
      showNotification('error', error);
    },
    [showNotification]
  );

  /**
   * Clear all scanned accounts
   */
  const handleClearAccounts = useCallback(() => {
    setAccounts([]);
    setBatchInfo(null);
    setDecodeResults([]);
    showNotification('info', t('accounts.cleared'));
  }, [showNotification, t]);

  /**
   * Handle export success
   */
  const handleExportSuccess = useCallback(
    (format: ExportFormat) => {
      showNotification(
        'success',
        t('export.success', { format: format.toUpperCase() })
      );
    },
    [showNotification, t]
  );

  /**
   * Handle export error
   */
  const handleExportError = useCallback(
    (format: ExportFormat, _error: Error) => {
      showNotification('error', t('export.error', { format: format.toUpperCase() }));
    },
    [showNotification, t]
  );

  /**
   * Toggle between camera and file upload modes
   */
  const handleModeChange = useCallback((mode: ScannerMode) => {
    setScannerMode(mode);
    setIsScannerActive(mode === 'camera');
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Animated background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-[hsl(160_84%_39%/0.05)] rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-[hsl(175_70%_40%/0.05)] rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-[var(--glass-border)]">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[hsl(var(--primary)/0.15)] border border-[hsl(var(--primary)/0.3)]">
                <Shield className="w-5 h-5 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[hsl(var(--foreground))] sm:text-xl">
                  {t('app.title')}
                </h1>
                <p className="text-xs text-[hsl(var(--muted-foreground))] hidden sm:block">
                  {t('app.subtitle')}
                </p>
              </div>
            </div>

            {/* Settings: Theme Toggle & Language Switcher */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher
                className="shrink-0"
                mode="toggle"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Privacy Notice */}
      <div className="max-w-6xl mx-auto px-4 pt-6 sm:px-6 lg:px-8 w-full">
        <div className="privacy-badge flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm animate-fade-in">
          <Lock className="w-4 h-4" />
          <span>{t('app.privacyNotice')}</span>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div
          className="fixed top-20 right-4 left-4 z-[1000] flex flex-col gap-2 sm:left-auto sm:max-w-sm sm:w-full"
          role="region"
          aria-label={t('accessibility.notifications')}
        >
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={getNotificationStyles(notification.type)}
              role="alert"
            >
              {getNotificationIcon(notification.type)}
              <span className="flex-1 text-sm font-medium">
                {notification.message}
              </span>
              <button
                type="button"
                className="shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
                onClick={() => dismissNotification(notification.id)}
                aria-label={t('common.dismiss')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Desktop: Two Column Layout */}
          <div className="grid gap-6 lg:grid-cols-[1fr,400px] lg:gap-8">
            {/* Left Column - Scanner & Accounts */}
            <div className="space-y-6">
              {/* Scanner Section */}
              <section className="glass-card rounded-2xl p-5 sm:p-6 animate-fade-in">
                {/* Mode Toggle */}
                <div
                  className="flex gap-2 mb-6 p-1.5 bg-[hsl(var(--background-secondary))] rounded-xl"
                  role="group"
                  aria-label={t('accessibility.scanMode')}
                >
                  <button
                    type="button"
                    className={cn(
                      'mode-toggle-btn flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border-2',
                      scannerMode === 'camera'
                        ? 'active'
                        : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]'
                    )}
                    onClick={() => handleModeChange('camera')}
                    aria-pressed={scannerMode === 'camera'}
                  >
                    <Camera className="w-4 h-4" />
                    <span>{t('scanner.cameraMode')}</span>
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'mode-toggle-btn flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border-2',
                      scannerMode === 'file'
                        ? 'active'
                        : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]'
                    )}
                    onClick={() => handleModeChange('file')}
                    aria-pressed={scannerMode === 'file'}
                  >
                    <Upload className="w-4 h-4" />
                    <span>{t('fileUpload.fileMode')}</span>
                  </button>
                </div>

                {/* Scanner/Upload Components */}
                <div className="min-h-[320px]">
                  {scannerMode === 'camera' ? (
                    <QRScanner
                      onScan={handleScan}
                      onError={handleScanError}
                      active={isScannerActive}
                    />
                  ) : (
                    <FileUpload onScan={handleScan} onError={handleScanError} />
                  )}
                </div>
              </section>

              {/* Accounts Section - Desktop shows inline */}
              <section className="glass-card rounded-2xl p-5 sm:p-6 animate-fade-in delay-100 hidden lg:block">
                <AccountList
                  accounts={accounts}
                  batchInfo={batchInfo}
                  onClear={handleClearAccounts}
                />
              </section>
            </div>

            {/* Right Column - Export Panel */}
            <div className="space-y-6">
              {/* Export Section */}
              <section className="glass-card rounded-2xl p-5 sm:p-6 animate-fade-in delay-200 lg:sticky lg:top-24">
                <ExportPanel
                  accounts={accounts}
                  onExportSuccess={handleExportSuccess}
                  onExportError={handleExportError}
                />
              </section>

              {/* Account Summary - Desktop */}
              {accounts.length > 0 && (
                <div className="glass-card rounded-2xl p-5 sm:p-6 animate-fade-in delay-300 hidden lg:block">
                  <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">
                    {t('accounts.summary', { defaultValue: 'Quick Overview' })}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[hsl(var(--muted-foreground))]">
                        {t('accounts.total', { defaultValue: 'Total Accounts' })}
                      </span>
                      <span className="font-mono font-medium text-[hsl(var(--primary))]">
                        {accounts.length}
                      </span>
                    </div>
                    {batchInfo && batchInfo.batchSize > 1 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[hsl(var(--muted-foreground))]">
                          {t('accounts.batchProgress', { defaultValue: 'Batch Progress' })}
                        </span>
                        <span className="font-mono font-medium">
                          {decodeResults.length} / {batchInfo.batchSize}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[hsl(var(--muted-foreground))]">
                        {t('accounts.providers', { defaultValue: 'Unique Issuers' })}
                      </span>
                      <span className="font-mono font-medium">
                        {new Set(accounts.map((a) => a.issuer || 'Unknown')).size}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: Accounts Section */}
          <section className="glass-card rounded-2xl p-5 sm:p-6 mt-6 animate-fade-in lg:hidden">
            <AccountList
              accounts={accounts}
              batchInfo={batchInfo}
              onClear={handleClearAccounts}
            />
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[hsl(var(--border-subtle))]">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {t('app.footer')}
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground)/0.6)] font-mono">
              v{version}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
