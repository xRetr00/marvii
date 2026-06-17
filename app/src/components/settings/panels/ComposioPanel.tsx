// Direct-only Composio settings for Marvi.
//
// Marvi does not route Composio through the hosted OpenHuman/TinyHumans backend.
// Users can keep Composio working locally by storing their own API key.
import { useEffect, useRef, useState } from 'react';

import { useT } from '../../../lib/i18n/I18nContext';
import {
  type ComposioModeStatus,
  openhumanComposioGetMode,
  openhumanComposioSetApiKey,
} from '../../../utils/tauriCommands';
import PanelPage from '../../layout/PanelPage';
import Button from '../../ui/Button';
import SettingsBackButton from '../components/SettingsBackButton';
import { SettingsRow, SettingsSection, SettingsStatusLine, SettingsTextField } from '../controls';
import { useSettingsNavigation } from '../hooks/useSettingsNavigation';

interface ComposioPanelProps {
  /** When true, render without the SettingsHeader chrome (used when embedded
   *  inside the onboarding custom wizard). */
  embedded?: boolean;
  /** Hosted backend auth is disabled in this build. Kept for caller
   * compatibility, but intentionally ignored. */
  managedAuthEnabled?: boolean;
}

const ComposioPanel = ({ embedded = false, managedAuthEnabled }: ComposioPanelProps = {}) => {
  const { t } = useT();
  const { navigateBack } = useSettingsNavigation();
  void managedAuthEnabled;

  const [apiKey, setApiKey] = useState('');
  const [apiKeyStored, setApiKeyStored] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const saveStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;
    openhumanComposioGetMode()
      .then(res => {
        if (!isMounted) return;
        const status: ComposioModeStatus | undefined = res.result;
        setApiKeyStored(Boolean(status?.api_key_set));
      })
      .catch(err => {
        if (!isMounted) return;
        console.warn('[ComposioPanel] failed to load mode:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (saveStatusTimer.current !== null) {
        clearTimeout(saveStatusTimer.current);
      }
    };
  }, []);

  const flashSaved = () => {
    setSaveStatus('saved');
    if (saveStatusTimer.current !== null) {
      clearTimeout(saveStatusTimer.current);
    }
    saveStatusTimer.current = setTimeout(() => setSaveStatus('idle'), 3000);
    try {
      window.dispatchEvent(new CustomEvent('composio:config-changed'));
    } catch (err) {
      console.warn('[composio-cache] dispatch composio:config-changed failed:', err);
    }
  };

  const handleSave = async () => {
    const trimmed = apiKey.trim();
    if (trimmed.length === 0 && !apiKeyStored) {
      setSaveStatus('error');
      return;
    }

    setSaving(true);
    try {
      if (trimmed.length > 0) {
        await openhumanComposioSetApiKey(trimmed, true);
        setApiKey('');
        setApiKeyStored(true);
      }
      flashSaved();
    } catch (err) {
      console.warn('[ComposioPanel] failed to save:', err);
      if (saveStatusTimer.current !== null) {
        clearTimeout(saveStatusTimer.current);
        saveStatusTimer.current = null;
      }
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const composioDescription = embedded
    ? undefined
    : t('settings.developerMenu.composioRouting.desc');
  const composioLeading = embedded ? undefined : <SettingsBackButton onBack={navigateBack} />;

  if (loading) {
    return (
      <PanelPage contentClassName="" description={composioDescription} leading={composioLeading}>
        <div className={embedded ? '' : 'p-4'}>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t('settings.composio.loading')}
          </p>
        </div>
      </PanelPage>
    );
  }

  return (
    <PanelPage
      className="z-10"
      contentClassName=""
      description={composioDescription}
      leading={composioLeading}>
      <div className={embedded ? 'space-y-5' : 'p-4 pt-2 space-y-5'}>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t('settings.composio.intro')}
        </p>

        <SettingsSection>
          <div className="px-4 py-3 space-y-2">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
              {t('settings.composio.modeDirect')}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t(
                'settings.composio.directOnlyDesc',
                'Managed Composio auth is unavailable here. Enter your own Composio API key or skip this for now.'
              )}
            </p>
          </div>
        </SettingsSection>

        <SettingsSection
          title={t('settings.composio.apiKeyLabel')}
          description={t('settings.composio.apiKeyDesc')}>
          <SettingsRow
            stacked
            control={
              <div className="space-y-1">
                <SettingsTextField
                  id="composio-api-key"
                  type="password"
                  autoComplete="off"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={
                    apiKeyStored
                      ? t('settings.composio.apiKeyStoredPlaceholder')
                      : t('settings.composio.apiKeyExamplePlaceholder')
                  }
                  aria-label={t('settings.composio.apiKeyLabel')}
                  mono
                />
                {apiKeyStored && (
                  <p className="text-xs text-sage-700 dark:text-sage-300">
                    {t('settings.composio.apiKeyStored')}
                  </p>
                )}
              </div>
            }
          />
        </SettingsSection>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving}>
            {saving ? t('settings.composio.saving') : t('common.save')}
          </Button>
          <SettingsStatusLine
            saving={false}
            savedNote={saveStatus === 'saved' ? t('composio.settingsSaved') : null}
            error={saveStatus === 'error' ? t('settings.composio.saveErrorNoKey') : null}
            savingLabel=""
          />
        </div>
      </div>
    </PanelPage>
  );
};

export default ComposioPanel;
