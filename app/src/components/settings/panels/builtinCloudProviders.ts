import type { AuthStyle } from '../../../utils/tauriCommands/config';

export type BuiltinCloudProvider = {
  slug: string;
  label: string;
  endpoint: string;
  authStyle: AuthStyle;
  tone: string;
  keyPlaceholder?: string;
};

const TONE = {
  emerald:
    'bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-200 text-emerald-900 dark:text-emerald-100',
  orange: 'bg-orange-50 dark:bg-orange-500/10 ring-orange-200 text-orange-900 dark:text-orange-100',
  slate: 'bg-slate-100 dark:bg-slate-500/15 ring-slate-300 text-slate-900 dark:text-slate-100',
  sky: 'bg-sky-50 dark:bg-sky-500/10 ring-sky-200 text-sky-900 dark:text-sky-100',
  fuchsia:
    'bg-fuchsia-50 dark:bg-fuchsia-500/10 ring-fuchsia-200 text-fuchsia-900 dark:text-fuchsia-100',
  rose: 'bg-rose-50 dark:bg-rose-500/10 ring-rose-200 text-rose-900 dark:text-rose-100',
  indigo: 'bg-indigo-50 dark:bg-indigo-500/10 ring-indigo-200 text-indigo-900 dark:text-indigo-100',
  amber: 'bg-amber-50 dark:bg-amber-500/10 ring-amber-200 text-amber-900 dark:text-amber-100',
  teal: 'bg-teal-50 dark:bg-teal-500/10 ring-teal-200 text-teal-900 dark:text-teal-100',
  violet: 'bg-violet-50 dark:bg-violet-500/10 ring-violet-200 text-violet-900 dark:text-violet-100',
  zinc: 'bg-zinc-100 dark:bg-zinc-500/15 ring-zinc-300 text-zinc-900 dark:text-zinc-100',
} as const;

export const BUILTIN_CLOUD_PROVIDERS: BuiltinCloudProvider[] = [
  {
    slug: 'openai',
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    authStyle: 'bearer',
    tone: TONE.emerald,
    keyPlaceholder: 'sk-...',
  },
  {
    slug: 'anthropic',
    label: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1',
    authStyle: 'anthropic',
    tone: TONE.orange,
    keyPlaceholder: 'sk-ant-...',
  },
  {
    slug: 'openrouter',
    label: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    authStyle: 'bearer',
    tone: TONE.slate,
    keyPlaceholder: 'sk-or-...',
  },
  {
    slug: 'orcarouter',
    label: 'OrcaRouter',
    endpoint: 'https://api.orcarouter.ai/v1',
    authStyle: 'bearer',
    tone: TONE.sky,
    keyPlaceholder: 'sk-orca-...',
  },
  {
    slug: 'gmi',
    label: 'GMI',
    endpoint: 'https://api.gmi-serving.com/v1',
    authStyle: 'bearer',
    tone: TONE.fuchsia,
    keyPlaceholder: 'gmi-...',
  },
  {
    slug: 'fireworks',
    label: 'Fireworks',
    endpoint: 'https://api.fireworks.ai/inference/v1',
    authStyle: 'bearer',
    tone: TONE.rose,
    keyPlaceholder: 'fw-...',
  },
  {
    slug: 'moonshot',
    label: 'Kimi (Moonshot)',
    endpoint: 'https://api.moonshot.ai/v1',
    authStyle: 'bearer',
    tone: TONE.indigo,
    keyPlaceholder: 'sk-...',
  },
  {
    slug: 'groq',
    label: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1',
    authStyle: 'bearer',
    tone: TONE.teal,
    keyPlaceholder: 'gsk_...',
  },
  {
    slug: 'mistral',
    label: 'Mistral',
    endpoint: 'https://api.mistral.ai/v1',
    authStyle: 'bearer',
    tone: TONE.amber,
  },
  {
    slug: 'deepseek',
    label: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/v1',
    authStyle: 'bearer',
    tone: TONE.zinc,
    keyPlaceholder: 'sk-...',
  },
  {
    slug: 'together',
    label: 'Together AI',
    endpoint: 'https://api.together.xyz/v1',
    authStyle: 'bearer',
    tone: TONE.violet,
  },
  {
    slug: 'google',
    label: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
    authStyle: 'bearer',
    tone: TONE.sky,
  },
  {
    slug: 'cerebras',
    label: 'Cerebras',
    endpoint: 'https://api.cerebras.ai/v1',
    authStyle: 'bearer',
    tone: TONE.orange,
  },
  {
    slug: 'xai',
    label: 'xAI',
    endpoint: 'https://api.x.ai/v1',
    authStyle: 'bearer',
    tone: TONE.zinc,
  },
  {
    slug: 'huggingface',
    label: 'Hugging Face',
    endpoint: 'https://router.huggingface.co/v1',
    authStyle: 'bearer',
    tone: TONE.amber,
    keyPlaceholder: 'hf_...',
  },
  {
    slug: 'nvidia',
    label: 'NVIDIA',
    endpoint: 'https://integrate.api.nvidia.com/v1',
    authStyle: 'bearer',
    tone: TONE.emerald,
  },
  {
    slug: 'zai',
    label: 'Z.AI',
    endpoint: 'https://api.z.ai/api/paas/v4',
    authStyle: 'bearer',
    tone: TONE.teal,
  },
  {
    slug: 'minimax',
    label: 'MiniMax',
    // OpenAI-compatible surface (`/v1/chat/completions`, `/v1/models`). The
    // prior `/anthropic` base + anthropic auth hit MiniMax's Messages API,
    // which Marvi doesn't speak — both chat and model-listing 404'd
    // (Sentry TAURI-RUST-8X3). Keep in sync with the Rust catalog.
    endpoint: 'https://api.minimax.io/v1',
    authStyle: 'bearer',
    tone: TONE.rose,
  },
  {
    slug: 'stepfun',
    label: 'StepFun',
    endpoint: 'https://api.stepfun.ai/step_plan/v1',
    authStyle: 'bearer',
    tone: TONE.indigo,
  },
  {
    slug: 'kilocode',
    label: 'Kilo Code',
    endpoint: 'https://api.kilo.ai/api/gateway',
    authStyle: 'bearer',
    tone: TONE.fuchsia,
  },
  {
    slug: 'deepinfra',
    label: 'DeepInfra',
    endpoint: 'https://api.deepinfra.com/v1/openai',
    authStyle: 'bearer',
    tone: TONE.slate,
  },
  {
    slug: 'novita',
    label: 'Novita',
    endpoint: 'https://api.novita.ai/v3/openai',
    authStyle: 'bearer',
    tone: TONE.violet,
  },
  {
    slug: 'venice',
    label: 'Venice',
    endpoint: 'https://api.venice.ai/api/v1',
    authStyle: 'bearer',
    tone: TONE.teal,
  },
  {
    slug: 'vercel-ai-gateway',
    label: 'Vercel AI Gateway',
    endpoint: 'https://ai-gateway.vercel.sh/v1',
    authStyle: 'bearer',
    tone: TONE.zinc,
  },
  {
    slug: 'sumopod',
    label: 'SumoPod',
    endpoint: 'https://ai.sumopod.com/v1',
    authStyle: 'bearer',
    tone: TONE.amber,
    keyPlaceholder: 'sk-...',
  },
  {
    slug: 'opencode-go',
    label: 'OpenCode Go',
    endpoint: 'https://opencode.ai/zen/go/v1',
    authStyle: 'bearer',
    tone: TONE.sky,
    keyPlaceholder: 'sk-...',
  },
];

export type OpenCodeGoUsageEstimate = {
  model: string;
  requestsPer5Hours: number;
  requestsPerWeek: number;
  requestsPerMonth: number;
  inputUsdPer1m: number;
  outputUsdPer1m: number;
  cachedReadUsdPer1m: number;
  cachedWriteUsdPer1m?: number;
};

const OPENCODE_GO_USAGE_ESTIMATES: Record<string, OpenCodeGoUsageEstimate> = {
  'glm-5.2': {
    model: 'GLM-5.2',
    requestsPer5Hours: 880,
    requestsPerWeek: 2150,
    requestsPerMonth: 4300,
    inputUsdPer1m: 1.4,
    outputUsdPer1m: 4.4,
    cachedReadUsdPer1m: 0.26,
  },
  'glm-5.1': {
    model: 'GLM-5.1',
    requestsPer5Hours: 880,
    requestsPerWeek: 2150,
    requestsPerMonth: 4300,
    inputUsdPer1m: 1.4,
    outputUsdPer1m: 4.4,
    cachedReadUsdPer1m: 0.26,
  },
  'kimi-k2.7-code': {
    model: 'Kimi K2.7 Code',
    requestsPer5Hours: 1350,
    requestsPerWeek: 4630,
    requestsPerMonth: 9250,
    inputUsdPer1m: 0.95,
    outputUsdPer1m: 4,
    cachedReadUsdPer1m: 0.19,
  },
  'kimi-k2.7': {
    model: 'Kimi K2.7',
    requestsPer5Hours: 1350,
    requestsPerWeek: 4630,
    requestsPerMonth: 9250,
    inputUsdPer1m: 0.95,
    outputUsdPer1m: 4,
    cachedReadUsdPer1m: 0.19,
  },
  'kimi-k2.6': {
    model: 'Kimi K2.6',
    requestsPer5Hours: 1150,
    requestsPerWeek: 2880,
    requestsPerMonth: 5750,
    inputUsdPer1m: 0.95,
    outputUsdPer1m: 4,
    cachedReadUsdPer1m: 0.16,
  },
  'mimo-v2.5': {
    model: 'MiMo-V2.5',
    requestsPer5Hours: 30100,
    requestsPerWeek: 75200,
    requestsPerMonth: 150400,
    inputUsdPer1m: 0.14,
    outputUsdPer1m: 0.28,
    cachedReadUsdPer1m: 0.0028,
  },
  'mimo-v2.5-pro': {
    model: 'MiMo-V2.5-Pro',
    requestsPer5Hours: 3250,
    requestsPerWeek: 8150,
    requestsPerMonth: 16300,
    inputUsdPer1m: 1.74,
    outputUsdPer1m: 3.48,
    cachedReadUsdPer1m: 0.0145,
  },
  'minimax-m3': {
    model: 'MiniMax M3',
    requestsPer5Hours: 3200,
    requestsPerWeek: 8000,
    requestsPerMonth: 16000,
    inputUsdPer1m: 0.3,
    outputUsdPer1m: 1.2,
    cachedReadUsdPer1m: 0.06,
  },
  'minimax-m2.7': {
    model: 'MiniMax M2.7',
    requestsPer5Hours: 3400,
    requestsPerWeek: 8500,
    requestsPerMonth: 17000,
    inputUsdPer1m: 0.3,
    outputUsdPer1m: 1.2,
    cachedReadUsdPer1m: 0.06,
    cachedWriteUsdPer1m: 0.375,
  },
  'minimax-m2.5': {
    model: 'MiniMax M2.5',
    requestsPer5Hours: 3400,
    requestsPerWeek: 8500,
    requestsPerMonth: 17000,
    inputUsdPer1m: 0.3,
    outputUsdPer1m: 1.2,
    cachedReadUsdPer1m: 0.06,
    cachedWriteUsdPer1m: 0.375,
  },
  'qwen3.7-max': {
    model: 'Qwen3.7 Max',
    requestsPer5Hours: 950,
    requestsPerWeek: 2390,
    requestsPerMonth: 4770,
    inputUsdPer1m: 2.5,
    outputUsdPer1m: 7.5,
    cachedReadUsdPer1m: 0.5,
    cachedWriteUsdPer1m: 3.125,
  },
  'qwen3.7-plus': {
    model: 'Qwen3.7 Plus',
    requestsPer5Hours: 4300,
    requestsPerWeek: 10800,
    requestsPerMonth: 21600,
    inputUsdPer1m: 0.4,
    outputUsdPer1m: 1.6,
    cachedReadUsdPer1m: 0.04,
    cachedWriteUsdPer1m: 0.5,
  },
  'qwen3.6-plus': {
    model: 'Qwen3.6 Plus',
    requestsPer5Hours: 3300,
    requestsPerWeek: 8200,
    requestsPerMonth: 16300,
    inputUsdPer1m: 0.5,
    outputUsdPer1m: 3,
    cachedReadUsdPer1m: 0.05,
    cachedWriteUsdPer1m: 0.625,
  },
  'deepseek-v4-pro': {
    model: 'DeepSeek V4 Pro',
    requestsPer5Hours: 3450,
    requestsPerWeek: 8550,
    requestsPerMonth: 17150,
    inputUsdPer1m: 1.74,
    outputUsdPer1m: 3.48,
    cachedReadUsdPer1m: 0.0145,
  },
  'deepseek-v4-flash': {
    model: 'DeepSeek V4 Flash',
    requestsPer5Hours: 31650,
    requestsPerWeek: 79050,
    requestsPerMonth: 158150,
    inputUsdPer1m: 0.14,
    outputUsdPer1m: 0.28,
    cachedReadUsdPer1m: 0.0028,
  },
};

function normalizeOpenCodeGoModelId(modelId: string): string {
  return modelId
    .trim()
    .replace(/^opencode-go\//, '')
    .replace(/^opencode-go:/, '')
    .toLowerCase();
}

export function opencodeGoUsageForModel(modelId: string): OpenCodeGoUsageEstimate | null {
  return OPENCODE_GO_USAGE_ESTIMATES[normalizeOpenCodeGoModelId(modelId)] ?? null;
}

// NOTE: Claude Code CLI is intentionally NOT a builtin chip. It is a
// CLI-backed peer provider surfaced via a dedicated "Sign in with Claude
// Code" connect action in AIPanel (mirroring the Codex connect button), not
// a key-based HTTP provider in the chip grid. Its slug is reserved in
// AIPanel's BUILTIN_RESERVED_SLUGS, and its endpoint/auth-style are handled
// by the `claude-code` cases in `defaultEndpointFor` / `authStyleForSlug`.

export const BUILTIN_CLOUD_PROVIDER_SLUGS = BUILTIN_CLOUD_PROVIDERS.map(provider => provider.slug);

export const BUILTIN_CLOUD_PROVIDER_META = Object.fromEntries(
  BUILTIN_CLOUD_PROVIDERS.map(provider => [
    provider.slug,
    { label: provider.label, tone: provider.tone },
  ])
) as Record<string, { tone: string; label: string }>;

export function builtinCloudProvider(slug: string): BuiltinCloudProvider | undefined {
  return BUILTIN_CLOUD_PROVIDERS.find(provider => provider.slug === slug);
}

export function defaultEndpointForBuiltinCloudProvider(slug: string): string {
  return builtinCloudProvider(slug)?.endpoint ?? '';
}

export function authStyleForBuiltinCloudProvider(slug: string): AuthStyle | undefined {
  return builtinCloudProvider(slug)?.authStyle;
}
