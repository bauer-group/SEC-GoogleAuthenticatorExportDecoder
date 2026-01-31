/**
 * AccountList component for displaying scanned TOTP accounts
 * Obsidian Security Design - sophisticated dark theme with glassmorphism
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Users,
  Trash2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import type { Account, BatchInfo } from '../types';
import { digitCountToNumber, algorithmToString } from '../types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Props for the AccountList component
 */
export interface AccountListProps {
  accounts: Account[];
  batchInfo?: BatchInfo | null;
  onClear?: () => void;
  className?: string;
}

type VisibleSecrets = Set<number>;

/**
 * AccountList component with Obsidian Security Design
 */
export function AccountList({
  accounts,
  batchInfo,
  onClear,
  className = '',
}: AccountListProps): JSX.Element {
  const { t } = useTranslation();
  const [visibleSecrets, setVisibleSecrets] = useState<VisibleSecrets>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const toggleSecretVisibility = useCallback((index: number) => {
    setVisibleSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const copySecret = useCallback(async (secret: string, index: number) => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedIndex(index);
      setTimeout(() => {
        setCopiedIndex((current) => (current === index ? null : current));
      }, 2000);
    } catch {
      // Clipboard API failed
    }
  }, []);

  const handleClearClick = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const handleClearConfirm = useCallback(() => {
    setShowClearConfirm(false);
    setVisibleSecrets(new Set());
    setCopiedIndex(null);
    onClear?.();
  }, [onClear]);

  const handleClearCancel = useCallback(() => {
    setShowClearConfirm(false);
  }, []);

  const formatOtpType = (type: string): string => {
    switch (type) {
      case 'TOTP':
        return t('accounts.totp');
      case 'HOTP':
        return t('accounts.hotp');
      default:
        return type;
    }
  };

  const isBatchComplete = batchInfo
    ? batchInfo.batchIndex + 1 >= batchInfo.batchSize
    : true;

  // Empty state
  if (accounts.length === 0) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
            {t('accounts.title')}
          </h2>
        </div>

        <div className="empty-state flex flex-col items-center justify-center py-12 px-6 rounded-xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
          </div>
          <p className="text-base font-medium text-[hsl(var(--foreground))] mb-1">
            {t('accounts.empty')}
          </p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {t('accounts.emptyHint')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
            {t('accounts.title')}
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            {t('accounts.count', { count: accounts.length })}
          </p>
        </div>
        {onClear && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearClick}
            className="text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
            aria-label={t('accounts.clear')}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            {t('accounts.clear')}
          </Button>
        )}
      </div>

      {/* Batch information */}
      {batchInfo && batchInfo.batchSize > 1 && (
        <div
          className={cn(
            'rounded-xl p-4 mb-5 border',
            isBatchComplete
              ? 'bg-[hsl(var(--success-bg))] border-[hsl(var(--success)/0.3)]'
              : 'bg-[hsl(var(--warning-bg))] border-[hsl(var(--warning)/0.3)]'
          )}
        >
          <div className="flex items-start gap-3">
            {isBatchComplete ? (
              <ShieldCheck className="w-5 h-5 text-[hsl(var(--success))] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[hsl(var(--warning))] shrink-0 mt-0.5" />
            )}
            <div>
              <h3
                className={cn(
                  'font-medium text-sm',
                  isBatchComplete
                    ? 'text-[hsl(var(--success))]'
                    : 'text-[hsl(var(--warning))]'
                )}
              >
                {t('batch.title')}
              </h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
                {t('batch.batchIndex', {
                  index: batchInfo.batchIndex + 1,
                  total: batchInfo.batchSize,
                })}
                {' - '}
                {isBatchComplete ? t('batch.complete') : t('batch.incomplete')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Clear confirmation dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="glass-card border-[hsl(var(--border))]">
          <DialogHeader>
            <DialogTitle>{t('accounts.clear')}</DialogTitle>
            <DialogDescription>{t('accounts.clearConfirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleClearCancel}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearConfirm}
              className="bg-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.9)]"
            >
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accounts table (desktop) */}
      <div
        className="hidden md:block overflow-hidden rounded-xl border border-[hsl(var(--border))]"
        role="region"
        aria-label={t('accessibility.accountsTable')}
      >
        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="text-left px-4 py-3 border-b border-[hsl(var(--border))]">
                {t('accounts.name')}
              </th>
              <th className="text-left px-4 py-3 border-b border-[hsl(var(--border))]">
                {t('accounts.issuer')}
              </th>
              <th className="text-left px-4 py-3 border-b border-[hsl(var(--border))]">
                {t('accounts.secret')}
              </th>
              <th className="text-left px-4 py-3 border-b border-[hsl(var(--border))]">
                {t('accounts.type')}
              </th>
              <th className="text-left px-4 py-3 border-b border-[hsl(var(--border))]">
                {t('accounts.algorithm')}
              </th>
              <th className="text-left px-4 py-3 border-b border-[hsl(var(--border))]">
                {t('accounts.digits')}
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account, index) => {
              const isSecretVisible = visibleSecrets.has(index);
              const isCopied = copiedIndex === index;

              return (
                <tr key={`${account.name}-${account.issuer}-${index}`}>
                  <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
                    {account.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                    {account.issuer || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] px-2 py-1 rounded-md max-w-[180px] truncate">
                        {isSecretVisible
                          ? account.totpSecret
                          : t('accounts.secretHidden')}
                      </code>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          className="icon-btn w-7 h-7"
                          onClick={() => toggleSecretVisibility(index)}
                          aria-label={
                            isSecretVisible
                              ? t('accounts.hideSecret')
                              : t('accounts.showSecret')
                          }
                          title={
                            isSecretVisible
                              ? t('accounts.hideSecret')
                              : t('accounts.showSecret')
                          }
                        >
                          {isSecretVisible ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          className={cn(
                            'icon-btn w-7 h-7',
                            isCopied && 'text-[hsl(var(--success))]'
                          )}
                          onClick={() => void copySecret(account.totpSecret, index)}
                          aria-label={t('accounts.copySecret')}
                          title={
                            isCopied ? t('common.copied') : t('accounts.copySecret')
                          }
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'badge',
                        account.type === 'TOTP' ? 'badge-primary' : ''
                      )}
                    >
                      {formatOtpType(account.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] font-mono text-sm">
                    {algorithmToString(account.algorithm)}
                  </td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] font-mono text-sm">
                    {digitCountToNumber(account.digits)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {accounts.map((account, index) => {
          const isSecretVisible = visibleSecrets.has(index);
          const isCopied = copiedIndex === index;

          return (
            <div
              key={`card-${account.name}-${account.issuer}-${index}`}
              className="account-card rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[hsl(var(--foreground))] truncate">
                    {account.name || '-'}
                  </p>
                  {account.issuer && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] truncate">
                      {account.issuer}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    'badge shrink-0',
                    account.type === 'TOTP' ? 'badge-primary' : ''
                  )}
                >
                  {formatOtpType(account.type)}
                </span>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  {t('accounts.secret')}
                </span>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] px-2 py-1.5 rounded-md flex-1 truncate">
                    {isSecretVisible
                      ? account.totpSecret
                      : t('accounts.secretHidden')}
                  </code>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => toggleSecretVisibility(index)}
                      aria-label={
                        isSecretVisible
                          ? t('accounts.hideSecret')
                          : t('accounts.showSecret')
                      }
                    >
                      {isSecretVisible ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'icon-btn',
                        isCopied && 'text-[hsl(var(--success))]'
                      )}
                      onClick={() => void copySecret(account.totpSecret, index)}
                      aria-label={t('accounts.copySecret')}
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[hsl(var(--border-subtle))]">
                <div>
                  <span className="text-xs text-[hsl(var(--muted-foreground))] block mb-0.5">
                    {t('accounts.algorithm')}
                  </span>
                  <span className="text-sm font-mono">
                    {algorithmToString(account.algorithm)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[hsl(var(--muted-foreground))] block mb-0.5">
                    {t('accounts.digits')}
                  </span>
                  <span className="text-sm font-mono">
                    {digitCountToNumber(account.digits)}
                  </span>
                </div>
                {account.type === 'HOTP' && (
                  <div>
                    <span className="text-xs text-[hsl(var(--muted-foreground))] block mb-0.5">
                      {t('accounts.counter')}
                    </span>
                    <span className="text-sm font-mono">{account.counter}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AccountList;
