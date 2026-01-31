/**
 * QRScanner component with html5-qrcode integration
 * Obsidian Security Design - modern scanner UI with elegant visual feedback
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  CameraOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Upload,
  Smartphone,
} from 'lucide-react';
import {
  isCameraLikelySupported,
  isIOSDevice,
  isPWAStandalone,
  isSecureContext,
} from '../utils/pwa';
import { cn } from '../lib/utils';

// =============================================================================
// Type Definitions
// =============================================================================

export interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
  active?: boolean;
  className?: string;
}

type ScannerStatus =
  | 'idle'
  | 'initializing'
  | 'scanning'
  | 'success'
  | 'error'
  | 'permission_denied'
  | 'no_camera'
  | 'camera_busy'
  | 'https_required'
  | 'ios_pwa_unsupported';

type ErrorType =
  | 'permission_denied'
  | 'no_camera'
  | 'camera_busy'
  | 'https_required'
  | 'invalid_qr'
  | 'ios_pwa_unsupported'
  | 'generic';

const SCANNER_ELEMENT_ID = 'qr-scanner-region';

// =============================================================================
// QRScanner Component
// =============================================================================

export function QRScanner({
  onScan,
  onError,
  active = true,
  className = '',
}: QRScannerProps): JSX.Element {
  const { t } = useTranslation();

  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorType, setErrorType] = useState<ErrorType | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);
  const isMountedRef = useRef(true);
  const isInitializingRef = useRef(false);

  const [cameraSupported, setCameraSupported] = useState<boolean>(true);

  const shouldSuggestFileUpload = (type: ErrorType | null): boolean => {
    return (
      type === 'permission_denied' ||
      type === 'no_camera' ||
      type === 'camera_busy' ||
      type === 'https_required' ||
      type === 'ios_pwa_unsupported'
    );
  };

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (
          state === Html5QrcodeScannerState.SCANNING ||
          state === Html5QrcodeScannerState.PAUSED
        ) {
          await scannerRef.current.stop();
        }
      } catch {
        // Ignore errors when stopping
      }
    }
  }, []);

  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      if (hasScannedRef.current || !isMountedRef.current) {
        return;
      }

      if (!decodedText.startsWith('otpauth-migration://')) {
        const errorMsg = t('scanner.invalidQRHint');
        setErrorMessage(errorMsg);
        setErrorType('invalid_qr');
        setStatus('error');
        onError?.(errorMsg);
        return;
      }

      hasScannedRef.current = true;
      setStatus('success');
      onScan(decodedText);

      setTimeout(() => {
        if (isMountedRef.current) {
          hasScannedRef.current = false;
          setStatus('scanning');
        }
      }, 1500);
    },
    [onScan, onError, t]
  );

  const handleError = useCallback(
    (errorMsg: string) => {
      if (!isMountedRef.current) {
        return;
      }

      if (
        errorMsg.includes('NotAllowedError') ||
        errorMsg.includes('Permission denied') ||
        errorMsg.includes('not allowed') ||
        errorMsg.includes('permission')
      ) {
        setStatus('permission_denied');
        setErrorType('permission_denied');
        setErrorMessage(t('scanner.permissionDenied'));
        onError?.(t('scanner.permissionDenied'));
        return;
      }

      if (
        errorMsg.includes('NotSupportedError') ||
        errorMsg.includes('secure context') ||
        errorMsg.includes('getUserMedia is not implemented')
      ) {
        setStatus('https_required');
        setErrorType('https_required');
        setErrorMessage(t('scanner.httpsRequiredHint'));
        onError?.(t('scanner.httpsRequiredHint'));
        return;
      }

      if (
        errorMsg.includes('NotReadableError') ||
        errorMsg.includes('Could not start') ||
        errorMsg.includes('track already ended') ||
        errorMsg.includes('in use')
      ) {
        setStatus('camera_busy');
        setErrorType('camera_busy');
        setErrorMessage(t('scanner.cameraBusy'));
        onError?.(t('scanner.cameraBusy'));
        return;
      }

      if (
        errorMsg.includes('NotFoundError') ||
        errorMsg.includes('no camera') ||
        errorMsg.includes('not found') ||
        errorMsg.includes('Requested device not found')
      ) {
        setStatus('no_camera');
        setErrorType('no_camera');
        setErrorMessage(t('scanner.noCameraHint'));
        onError?.(t('scanner.noCameraHint'));
        return;
      }

      if (
        errorMsg.includes('OverconstrainedError') ||
        errorMsg.includes('overconstrained')
      ) {
        setStatus('no_camera');
        setErrorType('no_camera');
        setErrorMessage(t('scanner.noCameraHint'));
        onError?.(t('scanner.noCameraHint'));
        return;
      }

      if (errorMsg.includes('AbortError') || errorMsg.includes('cancelled')) {
        return;
      }

      setStatus('error');
      setErrorType('generic');
      setErrorMessage(t('scanner.error'));
      onError?.(t('scanner.error'));
    },
    [onError, t]
  );

  const startScanner = useCallback(async () => {
    if (!isMountedRef.current || isInitializingRef.current) {
      return;
    }

    isInitializingRef.current = true;
    setStatus('initializing');

    try {
      await stopScanner();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const element = document.getElementById(SCANNER_ELEMENT_ID);
      if (!element) {
        throw new Error('Scanner element not found');
      }

      scannerRef.current = new Html5Qrcode(SCANNER_ELEMENT_ID, {
        verbose: false,
      });

      const cameras = await Html5Qrcode.getCameras();
      if (cameras.length === 0) {
        throw new Error('NotFoundError: no camera found');
      }

      const backCamera = cameras.find(
        (camera) =>
          camera.label.toLowerCase().includes('back') ||
          camera.label.toLowerCase().includes('rear') ||
          camera.label.toLowerCase().includes('environment')
      );
      const firstCamera = cameras[0];
      if (!firstCamera) {
        throw new Error('NotFoundError: no camera found');
      }
      const cameraId = backCamera?.id || firstCamera.id;

      await scannerRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        handleScanSuccess,
        () => {}
      );

      if (isMountedRef.current) {
        setStatus('scanning');
        hasScannedRef.current = false;
      }
    } catch (error) {
      if (isMountedRef.current) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        handleError(errorMsg);
      }
    } finally {
      isInitializingRef.current = false;
    }
  }, [stopScanner, handleScanSuccess, handleError]);

  const resetScanner = useCallback(async () => {
    hasScannedRef.current = false;
    setErrorMessage('');
    setErrorType(null);
    await startScanner();
  }, [startScanner]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!active) {
      stopScanner();
      return;
    }

    const isIOSPWA = isIOSDevice() && isPWAStandalone();

    if (isIOSPWA) {
      setStatus('ios_pwa_unsupported');
      setErrorType('ios_pwa_unsupported');
      setErrorMessage(t('scanner.iosPwaUnsupported'));
      setCameraSupported(false);
      return;
    }

    if (!isSecureContext()) {
      setStatus('https_required');
      setErrorType('https_required');
      setErrorMessage(t('scanner.httpsRequiredHint'));
      setCameraSupported(false);
      return;
    }

    if (!isCameraLikelySupported()) {
      setStatus('no_camera');
      setErrorType('no_camera');
      setErrorMessage(t('scanner.noCameraHint'));
      setCameraSupported(false);
      return;
    }

    setCameraSupported(true);
    startScanner();

    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, [active, startScanner, stopScanner, t]);

  /**
   * Render file upload suggestion
   */
  const renderFileUploadSuggestion = (): JSX.Element => (
    <div className="mt-4 p-3 bg-[hsl(var(--info-bg))] rounded-lg border border-[hsl(var(--info)/0.3)]">
      <p className="text-sm text-[hsl(var(--info))] flex items-start gap-2">
        <Upload className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{t('scanner.fileUploadSuggestion')}</span>
      </p>
    </div>
  );

  /**
   * Render status message
   */
  const renderStatusMessage = (): JSX.Element | null => {
    switch (status) {
      case 'initializing':
        return (
          <div className="flex items-center justify-center gap-2 mt-4 text-[hsl(var(--muted-foreground))]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">
              {t('scanner.initializing') || 'Initializing camera...'}
            </span>
          </div>
        );

      case 'scanning':
        return (
          <div className="flex items-center justify-center gap-2 mt-4 text-[hsl(var(--muted-foreground))]">
            <Camera className="w-4 h-4" />
            <span className="text-sm">{t('scanner.instructions')}</span>
          </div>
        );

      case 'success':
        return (
          <div className="flex items-center justify-center gap-2 mt-4 text-[hsl(var(--success))]">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{t('scanner.success')}</span>
          </div>
        );

      case 'error':
        return (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-center gap-2 text-[hsl(var(--destructive))]">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                {errorMessage || t('scanner.error')}
              </span>
            </div>
            {shouldSuggestFileUpload(errorType) && renderFileUploadSuggestion()}
            <div className="flex justify-center">
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.8)] transition-colors"
                onClick={resetScanner}
              >
                <RefreshCw className="w-4 h-4" />
                {t('scanner.tryAgain')}
              </button>
            </div>
          </div>
        );

      case 'permission_denied':
        return (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-center gap-2 text-[hsl(var(--destructive))]">
              <CameraOff className="w-4 h-4" />
              <span className="text-sm">{t('scanner.permissionDenied')}</span>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
              {t('scanner.permissionDeniedHint')}
            </p>
            {renderFileUploadSuggestion()}
          </div>
        );

      case 'no_camera':
        return (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-center gap-2 text-[hsl(var(--destructive))]">
              <CameraOff className="w-4 h-4" />
              <span className="text-sm">
                {errorMessage || t('scanner.noCameraHint')}
              </span>
            </div>
            {renderFileUploadSuggestion()}
          </div>
        );

      case 'camera_busy':
        return (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-center gap-2 text-[hsl(var(--destructive))]">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                {errorMessage || t('scanner.cameraBusy')}
              </span>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
              {t('scanner.cameraBusyHint')}
            </p>
            {renderFileUploadSuggestion()}
          </div>
        );

      case 'https_required':
        return (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-center gap-2 text-[hsl(var(--destructive))]">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                {errorMessage || t('scanner.httpsRequiredHint')}
              </span>
            </div>
            {renderFileUploadSuggestion()}
          </div>
        );

      case 'ios_pwa_unsupported':
        return (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-center gap-2 text-[hsl(var(--destructive))]">
              <Smartphone className="w-4 h-4" />
              <span className="text-sm">{t('scanner.iosPwaUnsupported')}</span>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
              {t('scanner.iosPwaUnsupportedHint')}
            </p>
            {renderFileUploadSuggestion()}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-1">
        {t('scanner.title')}
      </h2>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
        {t('scanner.instructions')}
      </p>

      {/* Scanner container */}
      {active && cameraSupported && status !== 'ios_pwa_unsupported' && (
        <div
          className="qr-scanner-container relative w-full max-w-md mx-auto aspect-square"
          aria-label={t('accessibility.scannerRegion')}
        >
          {/* Scanner element */}
          <div id={SCANNER_ELEMENT_ID} className="w-full h-full min-h-[300px]" />

          {/* Scanning frame overlay */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <div
              className={cn(
                'absolute inset-[12%] scanner-frame rounded-xl transition-all duration-300',
                status === 'scanning' && 'scanner-pulse',
                status === 'success' &&
                  'border-[hsl(var(--success))] shadow-[0_0_20px_hsl(var(--success)/0.3)]'
              )}
            />

            {/* Corner accents */}
            <div className="absolute top-[10%] left-[10%] w-6 h-6 border-t-2 border-l-2 border-[hsl(var(--primary))] rounded-tl-lg" />
            <div className="absolute top-[10%] right-[10%] w-6 h-6 border-t-2 border-r-2 border-[hsl(var(--primary))] rounded-tr-lg" />
            <div className="absolute bottom-[10%] left-[10%] w-6 h-6 border-b-2 border-l-2 border-[hsl(var(--primary))] rounded-bl-lg" />
            <div className="absolute bottom-[10%] right-[10%] w-6 h-6 border-b-2 border-r-2 border-[hsl(var(--primary))] rounded-br-lg" />
          </div>

          {/* Success overlay */}
          {status === 'success' && (
            <div className="absolute inset-0 bg-[hsl(var(--success)/0.1)] flex items-center justify-center z-20 animate-scale-fade">
              <div className="w-16 h-16 rounded-full bg-[hsl(var(--success-bg))] flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-[hsl(var(--success))]" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Placeholder for unsupported states */}
      {active && !cameraSupported && (
        <div className="w-full max-w-md mx-auto aspect-square rounded-xl bg-[hsl(var(--background-secondary))] border border-[hsl(var(--border))] flex items-center justify-center">
          <div className="text-center p-6">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mx-auto mb-4">
              <CameraOff className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {t('scanner.noCamera')}
            </p>
          </div>
        </div>
      )}

      {/* Status messages */}
      {renderStatusMessage()}

      {/* Inactive state */}
      {!active && (
        <div className="w-full max-w-md mx-auto aspect-square rounded-xl bg-[hsl(var(--background-secondary))] border border-[hsl(var(--border))] flex items-center justify-center">
          <div className="text-center p-6">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {t('scanner.cameraInactive')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default QRScanner;
