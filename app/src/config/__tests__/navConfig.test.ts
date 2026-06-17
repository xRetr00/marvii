import { describe, expect, it } from 'vitest';

import { AVATAR_MENU_ITEMS, NAV_TABS } from '../navConfig';

describe('NAV_TABS', () => {
  it('has exactly 6 entries', () => {
    expect(NAV_TABS).toHaveLength(6);
  });

  it('has the correct ids in order', () => {
    expect(NAV_TABS.map(t => t.id)).toEqual([
      'home',
      'chat',
      'human',
      'brain',
      'connections',
      'settings',
    ]);
  });

  it('has the correct paths', () => {
    expect(NAV_TABS.map(t => t.path)).toEqual([
      '/home',
      '/chat',
      '/human',
      '/brain',
      '/connections',
      '/settings',
    ]);
  });

  it('has the correct labelKeys', () => {
    expect(NAV_TABS.map(t => t.labelKey)).toEqual([
      'nav.home',
      'nav.chat',
      'nav.human',
      'nav.brain',
      'nav.connections',
      'nav.settings',
    ]);
  });

  it('has the correct walkthroughAttrs', () => {
    expect(NAV_TABS.map(t => t.walkthroughAttr)).toEqual([
      'tab-home',
      'tab-chat',
      'tab-human',
      'tab-brain',
      'tab-connections',
      'tab-settings',
    ]);
  });

  it('does not contain an activity tab', () => {
    expect(NAV_TABS.find(t => t.id === 'activity')).toBeUndefined();
  });

  it('does not contain a rewards tab', () => {
    expect(NAV_TABS.find(t => t.id === 'rewards')).toBeUndefined();
  });

  it('does not contain an intelligence or skills tab id', () => {
    expect(NAV_TABS.find(t => t.id === 'intelligence')).toBeUndefined();
    expect(NAV_TABS.find(t => t.id === 'skills')).toBeUndefined();
  });
});

describe('AVATAR_MENU_ITEMS', () => {
  it('does not surface account, billing, rewards, invites, or wallet shortcuts', () => {
    expect(AVATAR_MENU_ITEMS).toEqual([]);
  });
});
