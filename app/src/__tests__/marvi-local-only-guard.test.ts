import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, test } from 'vitest';

const appRoot = path.resolve(__dirname, '../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
}

describe('Marvi local-only guard', () => {
  test('Composio settings stay direct/local-only', () => {
    const source = readRepoFile('src/components/settings/panels/ComposioPanel.tsx');

    expect(source).not.toContain('openhumanComposioClearApiKey');
    expect(source).not.toContain('modeManaged');
    expect(source).not.toContain('confirmSwitch');
    expect(source).not.toContain('value="backend"');
  });

  test('bottom tab bar does not reintroduce hosted account menu surfaces', () => {
    const source = readRepoFile('src/components/BottomTabBar.tsx');

    expect(source).not.toContain('aria-haspopup');
    expect(source).not.toContain('Invite a friend');
    expect(source).not.toContain('Wallet');
    expect(source).not.toContain('Billing');
    expect(source).not.toContain('Rewards');
  });

  test('desktop routes do not import hosted rewards or invites pages', () => {
    const source = readRepoFile('src/AppRoutes.tsx');

    expect(source).not.toContain("from './pages/Rewards'");
    expect(source).not.toContain("from './pages/Invites'");
    expect(source).toContain(
      'path="/rewards" element={<Navigate to="/settings/account" replace />}'
    );
    expect(source).toContain(
      'path="/invites" element={<Navigate to="/settings/account" replace />}'
    );
  });

  test('outbound telemetry stays disabled and old Discord community links stay blocked', () => {
    const analytics = readRepoFile('src/services/analytics.ts');
    const linkModal = readRepoFile('src/components/OpenhumanLinkModal.tsx');

    expect(analytics).toContain('const MARVI_OUTBOUND_TELEMETRY_ENABLED = false');
    expect(linkModal).not.toContain("'community/discord'");
    expect(linkModal).not.toContain("'community/discord-report'");
  });
});
