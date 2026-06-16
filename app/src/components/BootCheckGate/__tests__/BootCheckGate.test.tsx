/**
 * Component tests for BootCheckGate.
 *
 * Strategy:
 *   - Mock runBootCheck so we control the result without real RPC/invoke.
 *   - Use a minimal Redux store that starts with coreMode.mode = 'unset'
 *     (picker) or set (check flow).
 *   - Assert rendered text and dispatched actions for each meaningful state.
 */
import { configureStore } from '@reduxjs/toolkit';
import { isTauri } from '@tauri-apps/api/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import coreModeReducer, { type CoreModeState } from '../../../store/coreModeSlice';
import localeReducer from '../../../store/localeSlice';
import BootCheckGate from '../BootCheckGate';

// The global test setup mocks isTauri()=>false (web). The existing picker
// behavior under test was written for desktop (local option visible,
// pre-selected). Force desktop runtime for those describes; the new web
// describe at the bottom flips it back to false.
const mockedIsTauri = vi.mocked(isTauri);

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRunBootCheck = vi.fn();
vi.mock('../../../lib/bootCheck', () => ({
  runBootCheck: (...args: unknown[]) => mockRunBootCheck(...args),
}));

const mockRecoverPortConflict = vi.fn();
vi.mock('../../../services/bootCheckService', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../services/bootCheckService')>();
  return {
    ...actual,
    recoverPortConflict: (...args: unknown[]) => mockRecoverPortConflict(...args),
  };
});

const mockTestCoreRpcConnection = vi.fn();
vi.mock('../../../services/coreRpcClient', () => ({
  callCoreRpc: vi.fn(),
  clearCoreRpcUrlCache: vi.fn(),
  clearCoreRpcTokenCache: vi.fn(),
  testCoreRpcConnection: (...args: unknown[]) => mockTestCoreRpcConnection(...args),
}));

vi.mock('../../../utils/configPersistence', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../utils/configPersistence')>();
  return {
    ...actual,
    storeRpcUrl: vi.fn(),
    storeCoreToken: vi.fn(),
    clearStoredCoreToken: vi.fn(),
    storeCoreMode: vi.fn(),
    clearStoredCoreMode: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

function makeStore(initialMode?: CoreModeState['mode']) {
  return configureStore({
    reducer: { coreMode: coreModeReducer, locale: localeReducer },
    preloadedState: {
      coreMode: { mode: initialMode ?? { kind: 'unset' } } satisfies CoreModeState,
    },
  });
}

function renderGate(store = makeStore()) {
  return render(
    <Provider store={store}>
      <BootCheckGate>
        <div data-testid="app-content">App Content</div>
      </BootCheckGate>
    </Provider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// All describes below assume desktop unless they explicitly opt out.
beforeEach(() => {
  mockedIsTauri.mockReturnValue(true);
});

describe('BootCheckGate — picker (unset mode)', () => {
  it('shows the mode picker when coreMode is unset', () => {
    renderGate();
    expect(screen.getByText('Select a Runtime')).toBeInTheDocument();
    expect(screen.getByText('Run Locally (Recommended)')).toBeInTheDocument();
    expect(screen.queryByText('Run on the Cloud (Complex)')).not.toBeInTheDocument();
  });

  it('does NOT render children while in picker', () => {
    renderGate();
    expect(screen.queryByTestId('app-content')).not.toBeInTheDocument();
  });

  it('continues with local mode when user clicks Continue', async () => {
    mockRunBootCheck.mockResolvedValue({ kind: 'match' });

    renderGate();

    // Local is pre-selected — just click Continue
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
    });
  });
});

describe('BootCheckGate — picker test connection', () => {
  beforeEach(() => {
    mockedIsTauri.mockReturnValue(false);
    mockTestCoreRpcConnection.mockReset();
  });

  function fillCloudInputs(url = 'https://core.example.com/rpc', token = 'tok-abc') {
    fireEvent.click(screen.getByText('Run on the Cloud (Complex)'));
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/core\.example\.com/), {
      target: { value: url },
    });
    fireEvent.change(screen.getByPlaceholderText(/Bearer token/i), { target: { value: token } });
  }

  it('shows Connected on a 200 response', async () => {
    mockTestCoreRpcConnection.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: { ok: true } }),
    } as unknown as Response);

    renderGate();
    fillCloudInputs();
    fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));

    await waitFor(() => {
      expect(screen.getByTestId('test-status-ok')).toBeInTheDocument();
    });
    expect(mockTestCoreRpcConnection).toHaveBeenCalledWith(
      'https://core.example.com/rpc',
      'tok-abc'
    );
  });

  it('tests /rpc when the user enters a cloud core base URL', async () => {
    mockTestCoreRpcConnection.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: { ok: true } }),
    } as unknown as Response);

    renderGate();
    fillCloudInputs('https://example.trycloudflare.com/');
    fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));

    await waitFor(() => {
      expect(screen.getByTestId('test-status-ok')).toBeInTheDocument();
    });
    expect(mockTestCoreRpcConnection).toHaveBeenCalledWith(
      'https://example.trycloudflare.com/rpc',
      'tok-abc'
    );
  });

  it('shows Auth failed on a 401 response', async () => {
    mockTestCoreRpcConnection.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'unauthorized' }),
    } as unknown as Response);

    renderGate();
    fillCloudInputs();
    fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));

    await waitFor(() => {
      expect(screen.getByTestId('test-status-auth')).toBeInTheDocument();
    });
  });

  it('shows Auth failed on a 403 response', async () => {
    mockTestCoreRpcConnection.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({}),
    } as unknown as Response);

    renderGate();
    fillCloudInputs();
    fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));

    await waitFor(() => {
      expect(screen.getByTestId('test-status-auth')).toBeInTheDocument();
    });
  });

  it('shows Unreachable when fetch rejects', async () => {
    mockTestCoreRpcConnection.mockRejectedValue(new Error('network down'));

    renderGate();
    fillCloudInputs();
    fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));

    await waitFor(() => {
      expect(screen.getByTestId('test-status-unreachable')).toBeInTheDocument();
    });
    expect(screen.getByTestId('test-status-unreachable').textContent).toMatch(/network down/);
  });

  it('shows Unreachable on non-2xx non-auth response', async () => {
    mockTestCoreRpcConnection.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as unknown as Response);

    renderGate();
    fillCloudInputs();
    fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));

    await waitFor(() => {
      expect(screen.getByTestId('test-status-unreachable')).toBeInTheDocument();
    });
    expect(screen.getByTestId('test-status-unreachable').textContent).toMatch(/HTTP 500/);
  });

  it('does not call the test endpoint when URL is missing', () => {
    renderGate();
    fireEvent.click(screen.getByText('Run on the Cloud (Complex)'));
    fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));

    expect(mockTestCoreRpcConnection).not.toHaveBeenCalled();
    expect(screen.getByText('Please enter a runtime URL.')).toBeInTheDocument();
  });

  it('does not call the test endpoint when token is missing', () => {
    renderGate();
    fireEvent.click(screen.getByText('Run on the Cloud (Complex)'));
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/core\.example\.com/), {
      target: { value: 'https://core.example.com/rpc' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));

    expect(mockTestCoreRpcConnection).not.toHaveBeenCalled();
    expect(screen.getByText(/We'll need an auth token to connect/i)).toBeInTheDocument();
  });

  it('clears a stale ok status when the user edits inputs again', async () => {
    mockTestCoreRpcConnection.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as unknown as Response);

    renderGate();
    fillCloudInputs();
    fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));
    await waitFor(() => {
      expect(screen.getByTestId('test-status-ok')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Bearer token/i), {
      target: { value: 'tok-def' },
    });

    expect(screen.queryByTestId('test-status-ok')).not.toBeInTheDocument();
  });
});

describe('BootCheckGate — checking state', () => {
  it('shows checking spinner while boot check is in flight', async () => {
    // Never resolves during this test
    mockRunBootCheck.mockImplementation(() => new Promise(() => {}));

    renderGate();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByText('Waking up your runtime…')).toBeInTheDocument();
    });
  });
});

describe('BootCheckGate — match result', () => {
  it('renders children once boot check returns match', async () => {
    mockRunBootCheck.mockResolvedValue({ kind: 'match' });

    renderGate();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
    });
  });
});

describe('BootCheckGate — daemonDetected', () => {
  it('shows daemon detection screen', async () => {
    mockRunBootCheck.mockResolvedValue({ kind: 'daemonDetected' });

    renderGate();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByText('Legacy Background Runtime Detected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove and Continue' })).toBeInTheDocument();
    });
  });
});

describe('BootCheckGate — outdatedLocal', () => {
  it('shows outdated local screen', async () => {
    mockRunBootCheck.mockResolvedValue({ kind: 'outdatedLocal' });

    renderGate();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByText('Local Runtime Needs a Restart')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Restart Runtime' })).toBeInTheDocument();
    });
  });
});

describe('BootCheckGate — outdatedCloud', () => {
  it('shows outdated cloud screen', async () => {
    mockRunBootCheck.mockResolvedValue({ kind: 'outdatedCloud' });

    const store = makeStore({ kind: 'cloud', url: 'https://core.example.com/rpc' });
    // Trigger the check by rendering with an already-set mode
    mockRunBootCheck.mockResolvedValue({ kind: 'outdatedCloud' });
    render(
      <Provider store={store}>
        <BootCheckGate>
          <div data-testid="app-content">App Content</div>
        </BootCheckGate>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Cloud Runtime Needs an Update')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Update Cloud Runtime' })).toBeInTheDocument();
    });
  });
});

describe('BootCheckGate — noVersionMethod', () => {
  it('shows no version method screen', async () => {
    mockRunBootCheck.mockResolvedValue({ kind: 'noVersionMethod' });

    renderGate();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByText('Runtime Version Check Failed')).toBeInTheDocument();
    });
  });
});

describe('BootCheckGate — unreachable', () => {
  it('shows unreachable screen with quit and switch mode buttons', async () => {
    mockRunBootCheck.mockResolvedValue({ kind: 'unreachable', reason: 'Connection refused' });

    renderGate();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByText("Can't Reach the Runtime")).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Quit' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Pick a Different Runtime' })).toBeInTheDocument();
    });
  });

  it("returns to picker when 'Pick a Different Runtime' is clicked", async () => {
    mockRunBootCheck.mockResolvedValue({ kind: 'unreachable', reason: 'Connection refused' });

    renderGate();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pick a Different Runtime' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Pick a Different Runtime' }));

    await waitFor(() => {
      expect(screen.getByText('Select a Runtime')).toBeInTheDocument();
    });
  });
});

describe('BootCheckGate — pre-set mode (subsequent launches)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips picker and goes directly to checking when mode is already set', async () => {
    mockRunBootCheck.mockImplementation(() => new Promise(() => {}));

    const store = makeStore({ kind: 'local' });
    render(
      <Provider store={store}>
        <BootCheckGate>
          <div data-testid="app-content">App Content</div>
        </BootCheckGate>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Waking up your runtime…')).toBeInTheDocument();
    });

    expect(screen.queryByText('Select a Runtime')).not.toBeInTheDocument();
  });
});

describe('BootCheckGate — port conflict recovery', () => {
  beforeEach(() => {
    mockRecoverPortConflict.mockReset();
    mockRunBootCheck.mockReset();
  });

  it('shows "Fix Automatically" button when portConflict=true', async () => {
    mockRunBootCheck.mockResolvedValue({
      kind: 'unreachable',
      reason: 'port conflict',
      portConflict: true,
    });

    renderGate();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByTestId('fix-automatically-btn')).toBeInTheDocument();
    });
    expect(screen.getByTestId('fix-automatically-btn').textContent).toBe('Fix Automatically');
  });

  it('does not show "Fix Automatically" button when portConflict is not set', async () => {
    mockRunBootCheck.mockResolvedValue({ kind: 'unreachable', reason: 'some other error' });

    renderGate();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByText("Can't Reach the Runtime")).toBeInTheDocument();
    });
    expect(screen.queryByTestId('fix-automatically-btn')).not.toBeInTheDocument();
  });

  it('calls recoverPortConflict when "Fix Automatically" is clicked', async () => {
    mockRunBootCheck
      .mockResolvedValueOnce({ kind: 'unreachable', reason: 'port conflict', portConflict: true })
      .mockResolvedValue({ kind: 'match' });
    mockRecoverPortConflict.mockResolvedValue({ success: true, message: 'ok', new_port: 7789 });

    renderGate();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByTestId('fix-automatically-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('fix-automatically-btn'));

    await waitFor(() => {
      expect(mockRecoverPortConflict).toHaveBeenCalled();
    });
  });

  it('re-runs boot check after successful recovery', async () => {
    mockRunBootCheck
      .mockResolvedValueOnce({ kind: 'unreachable', reason: 'port conflict', portConflict: true })
      .mockResolvedValue({ kind: 'match' });
    mockRecoverPortConflict.mockResolvedValue({ success: true, message: 'ok', new_port: 7789 });

    renderGate();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByTestId('fix-automatically-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('fix-automatically-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
    });
    expect(mockRunBootCheck).toHaveBeenCalledTimes(2);
  });

  it('shows portConflictFixFailed message when recovery fails', async () => {
    mockRunBootCheck.mockResolvedValue({
      kind: 'unreachable',
      reason: 'port conflict',
      portConflict: true,
    });
    mockRecoverPortConflict.mockResolvedValue({
      success: false,
      message: 'still busy',
      new_port: undefined,
    });

    renderGate();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByTestId('fix-automatically-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('fix-automatically-btn'));

    await waitFor(() => {
      expect(
        screen.getByText("Automatic fix didn't work. Please restart your computer and try again.")
      ).toBeInTheDocument();
    });
  });

  it('"Pick a Different Runtime" still renders as secondary for port conflict', async () => {
    mockRunBootCheck.mockResolvedValue({
      kind: 'unreachable',
      reason: 'port conflict',
      portConflict: true,
    });

    renderGate();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pick a Different Runtime' })).toBeInTheDocument();
    });
  });
});

describe('BootCheckGate — picker (web build, !isTauri)', () => {
  beforeEach(() => {
    mockedIsTauri.mockReturnValue(false);
  });

  it('uses the web-friendly title and hides the Local option', () => {
    renderGate();

    expect(screen.getByText('Connect to Your Runtime')).toBeInTheDocument();
    expect(screen.queryByText('Select a Runtime')).not.toBeInTheDocument();
    expect(screen.queryByText('Run Locally (Recommended)')).not.toBeInTheDocument();
    expect(screen.getByText('Run on the Cloud (Complex)')).toBeInTheDocument();
  });

  it('renders the cloud form fields immediately (cloud is the only option)', () => {
    renderGate();

    expect(screen.getByPlaceholderText(/https:\/\/core\.example\.com/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Bearer token/i)).toBeInTheDocument();
  });

  it('does not render a hosted desktop download CTA', () => {
    renderGate();

    expect(screen.queryByTestId('web-download-cta')).not.toBeInTheDocument();
  });

  it('continues into a cloud boot check when URL + token are provided', async () => {
    mockRunBootCheck.mockResolvedValue({ kind: 'match' });

    renderGate();

    fireEvent.change(screen.getByPlaceholderText(/https:\/\/core\.example\.com/), {
      target: { value: 'https://core.example.com/rpc' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Bearer token/i), {
      target: { value: 'tok-web' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
    });
    expect(mockRunBootCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'cloud',
        url: 'https://core.example.com/rpc',
        token: 'tok-web',
      }),
      expect.any(Object)
    );
  });
});
