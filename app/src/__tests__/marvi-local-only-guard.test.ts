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

  test('desktop navigation does not reintroduce hosted account menu surfaces', () => {
    const source = readRepoFile('src/config/navConfig.ts');

    expect(source).not.toContain("id: 'billing'");
    expect(source).not.toContain("id: 'wallet'");
    expect(source).not.toContain("id: 'rewards'");
    expect(source).not.toContain("id: 'invites'");
    expect(source).not.toContain("id: 'agent-world'");
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

  test('runtime prompts identify the assistant only as Marvi', () => {
    const runtimePromptFiles = [
      '../src/openhuman/agent/prompts/IDENTITY.md',
      '../src/openhuman/agent/prompts/SOUL.md',
      'src/SOUL.md',
      '../src/openhuman/desktop_companion/pipeline.rs',
      '../src/openhuman/meet_agent/brain/access.rs',
      '../src/openhuman/meet_agent/brain/constants.rs',
      '../src/openhuman/skill_registry/agent/skill_setup/prompt.md',
      '../src/openhuman/skill_runtime/agent/skill_executor/prompt.md',
    ];

    const forbiddenIdentity = [
      /you are openhuman/i,
      /you are hermes/i,
      /\bhermeshub\b/i,
      /\bopenhuman (?:node|python) runtime\b/i,
    ];

    for (const relativePath of runtimePromptFiles) {
      const source = readRepoFile(relativePath);
      for (const pattern of forbiddenIdentity) {
        expect(source, `${relativePath} contains ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  test('meeting identity defaults and wake words stay Marvi-facing', () => {
    const files = [
      '../src/openhuman/meet_agent/brain/constants.rs',
      '../src/openhuman/meet_agent/brain/access.rs',
      '../src/openhuman/meet_agent/schemas.rs',
    ];

    for (const relativePath of files) {
      const source = readRepoFile(relativePath);
      expect(source, `${relativePath} does not expose the Marvi meeting identity`).toMatch(/Marvi/);
      expect(source, `${relativePath} exposes the old meeting identity`).not.toMatch(/you are openhuman/i);
      expect(source, `${relativePath} advertises the old wake word`).not.toMatch(
        /gate \(\\"hey openhuman\\"\)/i
      );
    }
  });

  test('channel startup and success messages stay Marvi-facing', () => {
    const files = [
      '../src/openhuman/channels/runtime/startup.rs',
      '../src/openhuman/channels/providers/dingtalk.rs',
      '../src/openhuman/channels/providers/telegram/channel_recv.rs',
    ];

    const sources = files.map(readRepoFile);

    expect(sources[0]).not.toContain('OpenHuman Channel Server');
    expect(sources[0]).toContain('Marvi Channel Server');
    expect(sources[1]).not.toContain('unwrap_or("OpenHuman")');
    expect(sources[1]).toContain('unwrap_or("Marvi")');
    expect(sources[2]).not.toContain('You can talk to OpenHuman now.');
    expect(sources[2]).toContain('You can talk to Marvi now.');
  });
});
