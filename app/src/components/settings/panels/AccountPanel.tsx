import { useT } from '../../../lib/i18n/I18nContext';
import { useCoreState } from '../../../providers/CoreStateProvider';
import { useAppSelector } from '../../../store/hooks';
import { selectPersonaDescription, selectPersonaDisplayName } from '../../../store/personaSlice';
import PanelPage from '../../layout/PanelPage';
import SettingsBackButton from '../components/SettingsBackButton';
import { useSettingsNavigation } from '../hooks/useSettingsNavigation';
import LogoutAndClearActions from '../LogoutAndClearActions';

/**
 * Account landing page for the two-pane settings layout. The old Account hub
 * list (Team / Privacy / Security / Migration) is replaced by the sub-nav
 * pills above the panel; this page keeps the signed-in summary and the
 * destructive logout/clear actions.
 */
const AccountPanel = () => {
  const { t } = useT();
  const { navigateBack, navigateToSettings } = useSettingsNavigation();
  const { snapshot } = useCoreState();
  const personaDisplayName = useAppSelector(selectPersonaDisplayName);
  const personaDescription = useAppSelector(selectPersonaDescription);

  const user = snapshot.currentUser;
  const hostedName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || null
    : null;
  const localUserName = user && 'name' in user && typeof user.name === 'string' ? user.name : null;
  const name = personaDisplayName || hostedName || localUserName || 'Marvi Local';
  const localHandle = name
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const username = user?.username
    ? `@${user.username}`
    : localHandle
      ? `@${localHandle}`
      : '@marvi_local';
  const description =
    personaDescription || 'Local Windows desktop profile. Your settings stay on this device.';

  return (
    <PanelPage
      className="z-10"
      testId="account-panel"
      description={t('pages.settings.accountSection.description')}
      leading={<SettingsBackButton onBack={navigateBack} />}>
      <div className="flex items-center gap-3 rounded-2xl border border-stone-200 dark:border-neutral-800 px-4 py-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-500/15 text-base font-semibold text-primary-700 dark:text-primary-300">
          {name.replace('@', '').slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-stone-900 dark:text-neutral-100">
            {name}
          </div>
          <div className="truncate text-xs text-stone-500 dark:text-neutral-400">{username}</div>
          <div className="mt-1 line-clamp-2 text-xs text-stone-500 dark:text-neutral-400">
            {description}
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigateToSettings('personality')}
          className="shrink-0 rounded-lg border border-stone-200 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-neutral-200 hover:bg-stone-50 dark:hover:bg-neutral-800">
          Edit profile
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden border border-stone-200 dark:border-neutral-800">
        <LogoutAndClearActions />
      </div>
    </PanelPage>
  );
};

export default AccountPanel;
