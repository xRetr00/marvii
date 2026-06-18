import { useT } from '../../lib/i18n/I18nContext';
import { BILLING_DASHBOARD_URL } from '../../utils/links';
import { openUrl } from '../../utils/openUrl';

function formatUsd(amount: number): string {
  return `$${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}

export function UsageLimitBanner({
  tone,
  icon,
  title,
  message,
  ctaLabel,
  secondaryCtaLabel,
  onSecondaryCtaClick,
}: {
  tone: 'warning' | 'danger';
  icon: string;
  title: string;
  message: string;
  ctaLabel: string;
  secondaryCtaLabel?: string;
  onSecondaryCtaClick?: () => void;
}) {
  const styles =
    tone === 'danger'
      ? {
          card: 'border-coral-200 bg-gradient-to-r from-coral-50 via-rose-50 to-orange-50 dark:border-coral-500/30 dark:from-coral-900/30 dark:via-coral-900/20 dark:to-coral-900/10',
          title: 'text-coral-700 dark:text-coral-300',
          body: 'text-coral-500 dark:text-coral-300/80',
          button:
            'border-coral-700 text-coral-700 hover:text-coral-800 dark:border-coral-300 dark:text-coral-300 dark:hover:text-coral-200',
        }
      : {
          card: 'border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 dark:border-amber-500/30 dark:from-amber-900/30 dark:via-amber-900/20 dark:to-amber-900/10',
          title: 'text-amber-700 dark:text-amber-300',
          body: 'text-amber-600 dark:text-amber-300/80',
          button:
            'border-amber-700 text-amber-700 hover:text-amber-800 dark:border-amber-300 dark:text-amber-300 dark:hover:text-amber-200',
        };

  return (
    <div className={`mb-3 rounded-2xl border px-4 py-4 text-left shadow-soft ${styles.card}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${styles.title}`}>{title}</p>
          <p className={`mt-1 text-sm leading-relaxed ${styles.body}`}>
            {message}&nbsp;
            <button
              type="button"
              onClick={() => {
                void openUrl(BILLING_DASHBOARD_URL);
              }}
              className={`cursor-pointer border-b border-dashed font-bold ${styles.button}`}>
              {ctaLabel}
            </button>
            {secondaryCtaLabel && onSecondaryCtaClick && (
              <>
                {' '}
                <button
                  type="button"
                  onClick={onSecondaryCtaClick}
                  className={`cursor-pointer border-b border-dashed font-bold ${styles.button}`}>
                  {secondaryCtaLabel}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export function PromotionalCreditsBanner({ promoCredits }: { promoCredits: number }) {
  const { t } = useT();
  return (
    <div className="mb-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 px-4 py-2.5 text-left shadow-soft dark:border-amber-500/30 dark:from-amber-900/30 dark:via-amber-900/20 dark:to-amber-900/10">
      <div className="flex items-start gap-2.5">
        <div className="mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-base dark:bg-amber-500/20">
          🎉
        </div>
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-amber-600 dark:text-amber-300/80">
          {(() => {
            // Single {amount} template; split so the amount renders bold inline.
            const [before, after] = t('home.banners.promoCreditsBody').split('{amount}');
            return (
              <>
                {before}
                <span className="font-semibold text-amber-700 dark:text-amber-300">
                  {formatUsd(promoCredits)}
                </span>
                {after}
              </>
            );
          })()}{' '}
          <button
            type="button"
            onClick={() => {
              void openUrl(BILLING_DASHBOARD_URL);
            }}
            className="cursor-pointer border-b border-dashed border-amber-700 font-bold text-amber-700 hover:text-amber-800 dark:border-amber-300 dark:text-amber-300 dark:hover:text-amber-200">
            {t('home.banners.getSubscription')}
          </button>{' '}
          {t('home.banners.promoCreditsUsage')}
        </p>
      </div>
    </div>
  );
}

export function EarlyBirdyBanner({ onDismiss }: { onDismiss?: () => void }) {
  const { t } = useT();
  return (
    <div className="relative mb-3 mt-3 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 px-4 py-4 text-left shadow-soft dark:border-orange-500/30 dark:from-orange-900/30 dark:via-amber-900/20 dark:to-orange-900/10">
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('home.banners.earlyBirdDismiss')}
          className="absolute right-3 top-3 rounded-md p-1 text-orange-500 hover:bg-orange-100 hover:text-orange-700 dark:text-orange-300 dark:hover:bg-orange-500/10 dark:hover:text-orange-200">
          ✕
        </button>
      )}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-500/20 text-lg">
          🐦
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">
            {t('home.banners.earlyBirdTitle')}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-orange-600 dark:text-orange-300/80">
            {t('home.banners.earlyBirdUseCode')}{' '}
            <span className="rounded-md border border-orange-300 bg-white px-1.5 py-0.5 font-mono text-[12px] font-bold text-orange-700 dark:border-orange-500/40 dark:bg-neutral-900 dark:text-orange-300">
              EARLYBIRDY
            </span>{' '}
            {t('home.banners.earlyBirdOn')}{' '}
            <button
              type="button"
              onClick={() => {
                void openUrl(BILLING_DASHBOARD_URL);
              }}
              className="cursor-pointer border-b border-amber-700 border-dashed font-bold text-amber-700 hover:text-amber-800 dark:border-amber-300 dark:text-amber-300 dark:hover:text-amber-200">
              {t('home.banners.earlyBirdFirstSub')}
            </button>{' '}
          </p>
        </div>
      </div>
    </div>
  );
}

export function DiscordBanner() {
  return null;
}
