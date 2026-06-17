import { beforeEach, describe, expect, test, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  analyticsEnabled: true,
  captureException: vi.fn(),
  flush: vi.fn(() => Promise.resolve(true)),
  getClient: vi.fn(),
  init: vi.fn(),
}));

vi.mock('@sentry/react', () => ({
  browserApiErrorsIntegration: vi.fn(() => ({ name: 'BrowserApiErrors' })),
  captureException: hoisted.captureException,
  captureMessage: vi.fn(),
  dedupeIntegration: vi.fn(() => ({})),
  flush: hoisted.flush,
  functionToStringIntegration: vi.fn(() => ({})),
  getClient: hoisted.getClient,
  globalHandlersIntegration: vi.fn(() => ({ name: 'GlobalHandlers' })),
  httpContextIntegration: vi.fn(() => ({ name: 'HttpContext' })),
  init: hoisted.init,
  linkedErrorsIntegration: vi.fn(() => ({})),
}));

vi.mock('../../lib/coreState/store', () => ({
  getCoreStateSnapshot: () => ({
    snapshot: { analyticsEnabled: hoisted.analyticsEnabled, currentUser: { _id: 'user-local' } },
  }),
}));

vi.mock('../../utils/config', () => ({
  APP_BINARY_VERSION: '0.57.43',
  APP_ENVIRONMENT: 'staging',
  APP_VERSION: '0.57.43',
  BUILD_SHA: 'abc123',
  CORE_CARGO_VERSION: '0.57.43',
  CORE_RPC_TIMEOUT_MS: 30000,
  CORE_RPC_URL: 'http://127.0.0.1:7788/rpc',
  GA_MEASUREMENT_ID: 'G-TEST12345',
  IS_DEV: false,
  OPENPANEL_API_URL: 'https://panel.tinyhumans.ai/api',
  OPENPANEL_CLIENT_ID: 'test-client',
  SENTRY_DSN: 'https://abc@example.ingest.sentry.io/1',
  SENTRY_RELEASE: 'marvi@test+abc',
  SENTRY_SMOKE_TEST: false,
  TAURI_CARGO_VERSION: '0.57.43',
}));

describe('analytics local-only policy', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = '';
    delete (window as Partial<Window>).gtag;
    delete (window as Partial<Window>).dataLayer;
    vi.stubGlobal('fetch', vi.fn());
  });

  test('does not initialize Sentry or fire manual Sentry test events', async () => {
    hoisted.getClient.mockReturnValue({});
    hoisted.captureException.mockReturnValue('event-id');
    const { initSentry, triggerSentryTestEvent } = await import('../analytics');

    initSentry();
    const result = await triggerSentryTestEvent();

    expect(result).toBeUndefined();
    expect(hoisted.init).not.toHaveBeenCalled();
    expect(hoisted.captureException).not.toHaveBeenCalled();
    expect(hoisted.flush).not.toHaveBeenCalled();
  });

  test('does not initialize GA or OpenPanel even when analytics consent is true', async () => {
    const { initGA, syncAnalyticsConsent, trackEvent, trackPageView } =
      await import('../analytics');

    initGA();
    syncAnalyticsConsent(true);
    trackPageView('/home');
    trackEvent('app_open');

    expect(window.gtag).toBeUndefined();
    expect(window.dataLayer).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('does not collect delegated UI interaction telemetry', async () => {
    const { initGA, startUiInteractionTracking } = await import('../analytics');

    initGA();
    const stop = startUiInteractionTracking();
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('data-testid', 'local-only-button');
    document.body.appendChild(button);

    button.click();
    stop();

    expect(fetch).not.toHaveBeenCalled();
  });
});
