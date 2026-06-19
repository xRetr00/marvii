export interface PrivacyLeaveItem {
  id: string;
  title: string;
  body: string;
}

/**
 * The honest list of things that can leave the user's laptop.
 * Copy source: repo README + handoff doc. Do not soften this list —
 * the point is to not lie about "100% local".
 */
export const WHAT_LEAVES_ITEMS: PrivacyLeaveItem[] = [
  {
    id: 'cloud-providers',
    title: 'User-configured AI providers',
    body: 'Marvi runs its core locally. Content leaves the device only when you explicitly configure and use an external AI provider.',
  },
  {
    id: 'skill-integrations',
    title: 'Third-party integrations',
    body: 'Third-party integrations like Gmail, Slack, or Notion talk to those services on your behalf only with your explicit permission.',
  },
  {
    id: 'sentry',
    title: 'Product analytics and telemetry',
    body: 'Marvi does not send product analytics, page views, interaction telemetry, or crash reports to the old hosted backend. Local logs stay on this device unless you choose to share them.',
  },
];

export const WHAT_LEAVES_HEADLINE = 'Local core. External services only when you configure them.';
export const WHAT_LEAVES_SUBHEAD = "For full transparency, here's exactly what does, and when.";
