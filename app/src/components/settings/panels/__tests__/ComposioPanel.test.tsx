import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../../../../test/test-utils';

const hoisted = vi.hoisted(() => ({ getMode: vi.fn(), setApiKey: vi.fn() }));

vi.mock('../../../../utils/tauriCommands', () => ({
  openhumanComposioGetMode: hoisted.getMode,
  openhumanComposioSetApiKey: hoisted.setApiKey,
}));

vi.mock('../../../../providers/CoreStateProvider', () => ({
  useCoreState: () => ({ snapshot: { sessionToken: 'header.payload.local' } }),
}));

vi.mock('../../hooks/useSettingsNavigation', () => ({
  useSettingsNavigation: () => ({
    navigateBack: vi.fn(),
    navigateToSettings: vi.fn(),
    breadcrumbs: [],
  }),
}));

vi.mock('../../components/SettingsHeader', () => ({
  default: ({ title }: { title: string }) => <div data-testid="settings-header">{title}</div>,
}));

async function importPanel() {
  vi.resetModules();
  const mod = await import('../ComposioPanel');
  return mod.default;
}

const backendMode = { result: { mode: 'backend' as const, api_key_set: false }, logs: [] };
const directModeWithKey = { result: { mode: 'direct' as const, api_key_set: true }, logs: [] };

describe('ComposioPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getMode.mockResolvedValue(backendMode);
    hoisted.setApiKey.mockResolvedValue({ result: { stored: true, mode: 'direct' }, logs: [] });
  });

  test('loads into direct-only API-key mode even when persisted mode is backend', async () => {
    const Panel = await importPanel();
    renderWithProviders(<Panel />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
    expect(screen.getByText(/Bring your own Composio API key/)).toBeInTheDocument();
    expect(screen.getByText(/Managed Composio auth is unavailable here/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Composio API key')).toBeInTheDocument();
    expect(screen.queryByLabelText('Managed (Marvi handles it for you)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Direct (bring your own API key)')).not.toBeInTheDocument();
  });

  test('shows stored-key status from the core payload', async () => {
    hoisted.getMode.mockResolvedValue(directModeWithKey);
    const Panel = await importPanel();
    renderWithProviders(<Panel />);

    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());

    expect(screen.getByLabelText('Composio API key')).toBeInTheDocument();
    expect(
      screen.getByText('A Composio API key is currently stored on this device.')
    ).toBeInTheDocument();
  });

  test('saving with a key stores the local Composio API key and masks the field', async () => {
    const Panel = await importPanel();
    renderWithProviders(<Panel />);
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());

    const input = screen.getByLabelText('Composio API key') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'ck_secret_redacted' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText('Settings saved')).toBeInTheDocument());
    expect(hoisted.setApiKey).toHaveBeenCalledWith('ck_secret_redacted', true);
    expect(input.value).toBe('');
  });

  test('saving with an already stored key and no replacement is a local no-op success', async () => {
    hoisted.getMode.mockResolvedValue(directModeWithKey);
    const Panel = await importPanel();
    renderWithProviders(<Panel />);
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText('Settings saved')).toBeInTheDocument());
    expect(hoisted.setApiKey).not.toHaveBeenCalled();
  });

  test('requires a local API key when none is stored', async () => {
    const Panel = await importPanel();
    renderWithProviders(<Panel />);
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      screen.getByText('Failed to save. Direct mode requires a non-empty API key.')
    ).toBeInTheDocument();
    expect(hoisted.setApiKey).not.toHaveBeenCalled();
  });

  test('the API key input is password-masked', async () => {
    const Panel = await importPanel();
    renderWithProviders(<Panel />);
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());

    const input = screen.getByLabelText('Composio API key') as HTMLInputElement;
    expect(input.type).toBe('password');
  });

  test('still renders if getMode rejects', async () => {
    hoisted.getMode.mockRejectedValue(new Error('network down'));
    const Panel = await importPanel();
    renderWithProviders(<Panel />);

    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());

    expect(screen.getByLabelText('Composio API key')).toBeInTheDocument();
    expect(screen.queryByLabelText('Managed (Marvi handles it for you)')).not.toBeInTheDocument();
  });
});
