import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearBackendUrlCache } from '../../services/backendUrl';
import { clearCoreRpcTokenCache, clearCoreRpcUrlCache } from '../../services/coreRpcClient';
import { useDeepLinkAuthState } from '../../store/deepLinkAuthState';
import { renderWithProviders } from '../../test/test-utils';
import {
  clearStoredCoreMode,
  clearStoredCoreToken,
  storeRpcUrl,
} from '../../utils/configPersistence';
import Welcome from '../Welcome';

const mockStoreSessionToken = vi.fn().mockResolvedValue(undefined);

vi.mock('../../providers/CoreStateProvider', () => ({
  useCoreState: () => ({ storeSessionToken: mockStoreSessionToken }),
}));

vi.mock('../../store/deepLinkAuthState', () => ({ useDeepLinkAuthState: vi.fn() }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const { mockClearAllAppData } = vi.hoisted(() => ({
  mockClearAllAppData: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../utils/clearAllAppData', () => ({
  clearAllAppData: (...args: unknown[]) => mockClearAllAppData(...args),
}));

vi.mock('../../services/coreRpcClient', () => ({
  clearCoreRpcUrlCache: vi.fn(),
  clearCoreRpcTokenCache: vi.fn(),
  testCoreRpcConnection: vi.fn(),
}));

vi.mock('../../services/backendUrl', () => ({
  clearBackendUrlCache: vi.fn(),
  getBackendUrl: vi.fn().mockResolvedValue('http://localhost:5005'),
}));

vi.mock('../../utils/configPersistence', () => ({
  getStoredRpcUrl: vi.fn(() => 'http://127.0.0.1:7788/rpc'),
  peekStoredRpcUrl: vi.fn(() => null),
  storeRpcUrl: vi.fn(),
  clearStoredRpcUrl: vi.fn(),
  getStoredCoreToken: vi.fn(() => null),
  storeCoreToken: vi.fn(),
  clearStoredCoreToken: vi.fn(),
  getStoredCoreMode: vi.fn(() => null),
  storeCoreMode: vi.fn(),
  clearStoredCoreMode: vi.fn(),
  getDefaultRpcUrl: vi.fn(() => 'http://127.0.0.1:7788/rpc'),
  isValidRpcUrl: vi.fn((url: string) => {
    if (!url || url.trim().length === 0) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }),
  normalizeRpcUrl: vi.fn((url: string) => url.trim().replace(/\/+$/, '')),
}));

describe('Welcome auth entrypoint', () => {
  beforeEach(() => {
    vi.mocked(useDeepLinkAuthState).mockReturnValue({
      isProcessing: false,
      errorMessage: null,
      requiresAppDataReset: false,
    });
  });

  it('renders only the local auth entrypoint when auth is idle', () => {
    renderWithProviders(<Welcome />);

    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue with email' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue locally/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'google' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'github' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'twitter' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'discord' })).not.toBeInTheDocument();
  });

  it('does not render hosted auth legal links', () => {
    renderWithProviders(<Welcome />);

    expect(screen.queryByRole('link', { name: 'Terms' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Privacy Policy' })).not.toBeInTheDocument();
  });

  it('shows the deep-link processing state when auth is already in progress', () => {
    vi.mocked(useDeepLinkAuthState).mockReturnValue({
      isProcessing: true,
      errorMessage: null,
      requiresAppDataReset: false,
    });

    renderWithProviders(<Welcome />);

    expect(screen.getByRole('status')).toHaveTextContent('Signing you in...');
  });

  it('renders deep-link auth errors', () => {
    vi.mocked(useDeepLinkAuthState).mockReturnValue({
      isProcessing: false,
      errorMessage: 'OAuth failed',
      requiresAppDataReset: false,
    });

    renderWithProviders(<Welcome />);

    expect(screen.getByRole('alert')).toHaveTextContent('OAuth failed');
    expect(
      screen.queryByRole('button', { name: /Clear app data & restart/ })
    ).not.toBeInTheDocument();
  });
});

describe('Welcome — decryption-failure recovery action', () => {
  beforeEach(() => {
    mockClearAllAppData.mockReset().mockResolvedValue(undefined);
    vi.mocked(useDeepLinkAuthState).mockReturnValue({
      isProcessing: false,
      errorMessage: "Sign-in failed because OpenHuman couldn't decrypt locally stored data.",
      requiresAppDataReset: true,
    });
  });

  it('renders the "Clear app data & restart" button when reset is required', () => {
    renderWithProviders(<Welcome />);

    expect(screen.getByRole('button', { name: /Clear app data & restart/ })).toBeInTheDocument();
    expect(screen.getByText(/cloud account is unaffected/i)).toBeInTheDocument();
  });

  it('invokes clearAllAppData on click', async () => {
    renderWithProviders(<Welcome />);

    fireEvent.click(screen.getByRole('button', { name: /Clear app data & restart/ }));

    await waitFor(() => expect(mockClearAllAppData).toHaveBeenCalledTimes(1));
    // Pre-login path: no clearSession callback is passed.
    expect(mockClearAllAppData).toHaveBeenCalledWith();
  });

  it('surfaces an inline error if clearAllAppData rejects', async () => {
    mockClearAllAppData.mockRejectedValueOnce(new Error('reset blew up'));

    renderWithProviders(<Welcome />);
    fireEvent.click(screen.getByRole('button', { name: /Clear app data & restart/ }));

    await waitFor(() => {
      expect(screen.getByText(/reset blew up/)).toBeInTheDocument();
    });
    // Button re-enabled so the user can retry.
    expect(screen.getByRole('button', { name: /Clear app data & restart/ })).not.toBeDisabled();
  });

  it('falls back to the generic message when the error has no message', async () => {
    mockClearAllAppData.mockRejectedValueOnce(new Error(''));

    renderWithProviders(<Welcome />);
    fireEvent.click(screen.getByRole('button', { name: /Clear app data & restart/ }));

    await waitFor(() => {
      expect(screen.getByText(/Could not clear app data/)).toBeInTheDocument();
    });
  });
});

describe('Welcome — Select runtime button', () => {
  beforeEach(() => {
    vi.mocked(useDeepLinkAuthState).mockReturnValue({
      isProcessing: false,
      errorMessage: null,
      requiresAppDataReset: false,
    });
    vi.mocked(clearCoreRpcUrlCache).mockReset();
    vi.mocked(clearCoreRpcTokenCache).mockReset();
    vi.mocked(clearBackendUrlCache).mockReset();
    vi.mocked(storeRpcUrl).mockReset();
    vi.mocked(clearStoredCoreToken).mockReset();
    vi.mocked(clearStoredCoreMode).mockReset();
  });

  it('renders the "Select a Runtime" button below the card', () => {
    renderWithProviders(<Welcome />);

    expect(screen.getByRole('button', { name: 'Select a Runtime' })).toBeInTheDocument();
  });

  it('does not render the legacy "Configure RPC URL (Advanced)" toggle', () => {
    renderWithProviders(<Welcome />);

    expect(
      screen.queryByRole('button', { name: 'Configure RPC URL (Advanced)' })
    ).not.toBeInTheDocument();
  });

  it('clicking "Select a Runtime" clears persisted core-mode state and resets caches', () => {
    const { store } = renderWithProviders(<Welcome />, {
      preloadedState: { coreMode: { mode: { kind: 'cloud', url: 'http://x', token: 't' } } },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Select a Runtime' }));

    expect(storeRpcUrl).toHaveBeenCalledWith('');
    expect(clearStoredCoreToken).toHaveBeenCalledTimes(1);
    expect(clearStoredCoreMode).toHaveBeenCalledTimes(1);
    expect(clearCoreRpcUrlCache).toHaveBeenCalledTimes(1);
    expect(clearCoreRpcTokenCache).toHaveBeenCalledTimes(1);
    expect(clearBackendUrlCache).toHaveBeenCalledTimes(1);
    // Redux coreMode slice is reset to `unset` so BootCheckGate returns to picker.
    expect((store.getState() as { coreMode: { mode: { kind: string } } }).coreMode.mode.kind).toBe(
      'unset'
    );
  });
});

describe('Welcome — hosted auth removal', () => {
  beforeEach(() => {
    vi.mocked(useDeepLinkAuthState).mockReturnValue({
      isProcessing: false,
      errorMessage: null,
      requiresAppDataReset: false,
    });
  });

  it('does not render OAuth provider buttons', () => {
    renderWithProviders(<Welcome />);

    expect(screen.queryByRole('button', { name: 'google' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'github' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'twitter' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'discord' })).not.toBeInTheDocument();
  });

  it('hides the local login button while auth is processing', () => {
    vi.mocked(useDeepLinkAuthState).mockReturnValue({
      isProcessing: true,
      errorMessage: null,
      requiresAppDataReset: false,
    });
    renderWithProviders(<Welcome />);

    expect(screen.queryByRole('button', { name: /Continue locally/i })).not.toBeInTheDocument();
  });
});

describe('Welcome — local login', () => {
  beforeEach(() => {
    mockStoreSessionToken.mockReset().mockResolvedValue(undefined);
    mockNavigate.mockReset();
    vi.mocked(useDeepLinkAuthState).mockReturnValue({
      isProcessing: false,
      errorMessage: null,
      requiresAppDataReset: false,
    });
  });

  it('renders the "Continue locally" button regardless of runtime mode', () => {
    renderWithProviders(<Welcome />);

    expect(screen.getByRole('button', { name: /Continue locally/i })).toBeInTheDocument();
  });

  it('renders the "Continue locally" button in cloud mode too', () => {
    renderWithProviders(<Welcome />, {
      preloadedState: { coreMode: { mode: { kind: 'cloud', url: 'http://x', token: 't' } } },
    });

    expect(screen.getByRole('button', { name: /Continue locally/i })).toBeInTheDocument();
  });

  it('calls storeSessionToken with a local session token and navigates to /home', async () => {
    renderWithProviders(<Welcome />);

    const localBtn = screen.getByRole('button', { name: /Continue locally/i });
    fireEvent.click(localBtn);

    await waitFor(() => {
      expect(mockStoreSessionToken).toHaveBeenCalledTimes(1);
    });
    const [tokenArg, userArg] = mockStoreSessionToken.mock.calls[0];
    expect(tokenArg).toContain('local');
    expect(userArg).toEqual(expect.objectContaining({ id: 'local' }));
    expect(mockNavigate).toHaveBeenCalledWith('/onboarding/custom/inference', { replace: true });
  });

  it('shows error when storeSessionToken rejects', async () => {
    mockStoreSessionToken.mockRejectedValueOnce(new Error('token save failed'));

    renderWithProviders(<Welcome />);

    const localBtn = screen.getByRole('button', { name: /Continue locally/i });
    fireEvent.click(localBtn);

    await waitFor(() => {
      expect(screen.getByText(/token save failed/)).toBeInTheDocument();
    });
  });
});
