import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as openUrlModule from '../../utils/openUrl';
import OpenhumanLinkModal, { OPENHUMAN_LINK_EVENT } from '../OpenhumanLinkModal';

vi.mock('../../services/webviewAccountService', () => ({
  isTauri: vi.fn(() => false),
  purgeWebviewAccount: vi.fn(),
}));

vi.mock('../../lib/nativeNotifications/tauriBridge', () => ({
  ensureNotificationPermission: vi.fn(),
  getNotificationPermissionState: vi.fn().mockResolvedValue('prompt'),
  showNativeNotification: vi.fn(),
}));

vi.mock('../../utils/openUrl', () => ({ openUrl: vi.fn().mockResolvedValue(undefined) }));

describe('OpenhumanLinkModal Discord community links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function dispatchPath(path: string) {
    act(() => {
      window.dispatchEvent(new CustomEvent(OPENHUMAN_LINK_EVENT, { detail: { path } }));
    });
  }

  it('ignores the old Discord report path', () => {
    render(<OpenhumanLinkModal />);

    dispatchPath('community/discord-report');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(openUrlModule.openUrl).not.toHaveBeenCalled();
  });

  it('ignores the old Discord join-community path', () => {
    render(<OpenhumanLinkModal />);

    dispatchPath('community/discord');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(openUrlModule.openUrl).not.toHaveBeenCalled();
  });
});
