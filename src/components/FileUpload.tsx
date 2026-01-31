/**
 * FileUpload component for image-based QR scanning
 * Obsidian Security Design - elegant drag-and-drop upload zone
 */

import {
  useState,
  useRef,
  useCallback,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  ImagePlus,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Props for the FileUpload component
 */
export interface FileUploadProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

type UploadStatus = 'idle' | 'dragging' | 'processing' | 'success' | 'error';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const ACCEPTED_EXTENSIONS = '.png,.jpg,.jpeg,.gif,.webp';

/**
 * FileUpload component with Obsidian Security Design
 */
export function FileUpload({
  onScan,
  onError,
  className,
  disabled = false,
}: FileUploadProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return t('fileUpload.invalidFormat');
      }
      if (file.size > MAX_FILE_SIZE) {
        return t('fileUpload.fileTooLarge');
      }
      return null;
    },
    [t]
  );

  const processFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setStatus('error');
        setErrorMessage(validationError);
        onError?.(validationError);
        return;
      }

      setStatus('processing');
      setSelectedFileName(file.name);
      setErrorMessage('');

      try {
        const html5Qrcode = new Html5Qrcode('file-upload-reader', false);
        const decodedText = await html5Qrcode.scanFile(file, false);

        if (!decodedText.startsWith('otpauth-migration://')) {
          setStatus('error');
          const errorMsg = t('scanner.invalidQR');
          setErrorMessage(errorMsg);
          onError?.(errorMsg);
          return;
        }

        setStatus('success');
        onScan(decodedText);
      } catch (error) {
        setStatus('error');
        let errorMsg: string;
        if (error instanceof Error) {
          if (
            error.message.includes('No QR code') ||
            error.message.includes('NotFoundException')
          ) {
            errorMsg = t('fileUpload.noQRFound');
          } else {
            errorMsg = t('fileUpload.error');
          }
        } else {
          errorMsg = t('fileUpload.error');
        }
        setErrorMessage(errorMsg);
        onError?.(errorMsg);
      }
    },
    [validateFile, onScan, onError, t]
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file) {
          void processFile(file);
        }
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled && status !== 'processing') {
      fileInputRef.current?.click();
    }
  }, [disabled, status]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (
        (event.key === 'Enter' || event.key === ' ') &&
        !disabled &&
        status !== 'processing'
      ) {
        event.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [disabled, status]
  );

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (!disabled && status !== 'processing') {
        setStatus('dragging');
      }
    },
    [disabled, status]
  );

  const handleDragLeave = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (status === 'dragging') {
        setStatus('idle');
      }
    },
    [status]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (disabled || status === 'processing') {
        setStatus('idle');
        return;
      }

      const files = event.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file) {
          void processFile(file);
        }
      } else {
        setStatus('idle');
      }
    },
    [disabled, status, processFile]
  );

  const handleReset = useCallback(() => {
    setStatus('idle');
    setErrorMessage('');
    setSelectedFileName('');
  }, []);

  const renderDropzoneContent = () => {
    switch (status) {
      case 'dragging':
        return (
          <div className="flex flex-col items-center text-center animate-scale-fade">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--primary)/0.2)] flex items-center justify-center mb-4 scanner-pulse">
              <Upload className="w-8 h-8 text-[hsl(var(--primary))]" />
            </div>
            <p className="text-base font-medium text-[hsl(var(--primary))]">
              {t('fileUpload.dropzoneActive')}
            </p>
          </div>
        );

      case 'processing':
        return (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-[hsl(var(--primary))] animate-spin" />
            </div>
            <p className="text-base font-medium text-[hsl(var(--foreground))] mb-1">
              {t('fileUpload.processing')}
            </p>
            {selectedFileName && (
              <p className="text-sm text-[hsl(var(--muted-foreground))] break-all max-w-[250px]">
                {selectedFileName}
              </p>
            )}
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center text-center animate-scale-fade">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--success-bg))] flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-[hsl(var(--success))]" />
            </div>
            <p className="text-base font-medium text-[hsl(var(--success))] mb-1">
              {t('fileUpload.success')}
            </p>
            {selectedFileName && (
              <p className="text-sm text-[hsl(var(--muted-foreground))] break-all max-w-[250px] mb-4">
                {selectedFileName}
              </p>
            )}
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.8)] transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
            >
              <RefreshCw className="w-4 h-4" />
              {t('fileUpload.uploadAnother')}
            </button>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center text-center animate-scale-fade">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(0_72%_12%)] flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-[hsl(var(--destructive))]" />
            </div>
            <p className="text-base font-medium text-[hsl(var(--destructive))] mb-1">
              {errorMessage || t('fileUpload.error')}
            </p>
            {selectedFileName && (
              <p className="text-sm text-[hsl(var(--muted-foreground))] break-all max-w-[250px] mb-4">
                {selectedFileName}
              </p>
            )}
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.8)] transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
            >
              <RefreshCw className="w-4 h-4" />
              {t('common.retry')}
            </button>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mb-4 group-hover:bg-[hsl(var(--primary)/0.15)] transition-colors">
              <ImagePlus className="w-8 h-8 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors" />
            </div>
            <p className="text-base font-medium text-[hsl(var(--foreground))] mb-1">
              {t('fileUpload.dropzone')}
            </p>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              {t('fileUpload.acceptedFormats')}
            </p>
            <button
              type="button"
              className="btn-glow flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))] transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={disabled}
            >
              <Upload className="w-4 h-4" />
              {t('fileUpload.selectFile')}
            </button>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-4">
              {t('fileUpload.maxSize')}
            </p>
          </div>
        );
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-1">
        {t('fileUpload.title')}
      </h2>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
        {t('fileUpload.description')}
      </p>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleFileChange}
        className="hidden"
        aria-label={t('fileUpload.selectFile')}
        disabled={disabled || status === 'processing'}
      />

      {/* Hidden element for html5-qrcode */}
      <div id="file-upload-reader" className="hidden" />

      {/* Dropzone */}
      <div
        className={cn(
          'group upload-zone flex flex-col items-center justify-center min-h-[280px] p-8 rounded-xl cursor-pointer transition-all duration-300',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]',
          status === 'idle' && 'hover:border-[hsl(var(--primary)/0.5)]',
          status === 'dragging' && 'drag-active',
          status === 'processing' && 'cursor-wait opacity-80',
          status === 'success' &&
            'border-[hsl(var(--success)/0.5)] bg-[hsl(var(--success)/0.05)]',
          status === 'error' &&
            'border-[hsl(var(--destructive)/0.5)] bg-[hsl(var(--destructive)/0.05)]',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={t('fileUpload.dropzone')}
        aria-disabled={disabled}
      >
        {renderDropzoneContent()}
      </div>
    </div>
  );
}

export default FileUpload;
