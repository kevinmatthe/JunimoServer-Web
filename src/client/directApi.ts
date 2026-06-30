import { z } from 'zod';

import {
  authStatusResponseSchema,
  authTimeoutResponseSchema,
  cabinsResponseSchema,
  clockSpeedResponseSchema,
  deleteFarmhandInputSchema,
  diagnosticsStateResponseSchema,
  farmhandResponseSchema,
  farmhandsResponseSchema,
  healthResponseSchema,
  inviteCodeResponseSchema,
  newGameRequestSchema,
  newGameResponseSchema,
  playersResponseSchema,
  reloadResponseSchema,
  renderingSetResponseSchema,
  renderingStatusSchema,
  roleGrantInputSchema,
  roleGrantResponseSchema,
  screenshotResponseSchema,
  serverStatusSchema,
  setAuthTimeoutInputSchema,
  setClockSpeedInputSchema,
  setRenderingInputSchema,
  setTimeInputSchema,
  settingsResponseSchema,
  statsResponseSchema,
  timeSetResponseSchema,
} from '../shared/junimo';

export type ScreenshotResponse = {
  success: boolean;
  base64Png?: string | null;
  width?: number;
  height?: number;
  error?: string | null;
};

export type ServerStatus = {
  playerCount: number;
  maxPlayers: number;
  steamInviteCode?: string | null;
  gogInviteCode?: string | null;
  serverVersion: string;
  isOnline: boolean;
  isReady: boolean;
  lastUpdated: string;
  farmName: string;
  day: number;
  season: string;
  year: number;
  timeOfDay: number;
  farmTypeKey: string;
  isPaused: boolean;
  version: number;
};

export type PlayersResponse = {
  players: Array<{ id: number; name: string; isOnline: boolean }>;
  version: number;
};

export type InviteCodeResponse = {
  inviteCode?: string | null;
  error?: string | null;
};

export type HealthResponse = {
  status: string;
  timestamp: string;
  lastTickMs?: number | null;
  pendingActions: number;
  gameAvailable?: boolean | null;
  tickCount: number;
  isFrozen: boolean;
};

export type StatsResponse = {
  fps: number;
  tps: number;
  targetTps: number;
  avgTickMs: number;
  memoryMb: number;
  gcGen0: number;
  gcGen1: number;
  gcGen2: number;
  pendingActions: number;
  gameThreadWaitMs: number;
};

export type FarmhandsResponse = {
  farmhands: Array<{ id: number; name: string; isCustomized: boolean }>;
  version: number;
};

export type SettingsResponse = {
  game: {
    farmName: string;
    farmType: number | string;
    profitMargin: number;
    startingCabins: number;
    spawnMonstersAtNight: string;
  };
  server: {
    maxPlayers: number;
    cabinStrategy: string;
    separateWallets: boolean;
    existingCabinBehavior: string;
  };
};

export type CabinsResponse = {
  strategy: string;
  totalCount: number;
  assignedCount: number;
  availableCount: number;
  cabins: Array<{
    tileX: number;
    tileY: number;
    isHidden: boolean;
    type: string;
    ownerId: number;
    ownerName: string;
    isAssigned: boolean;
  }>;
  savedPositionPlayerIds: number[];
};

export type RenderingStatus = {
  fps: number;
};

export type AuthStatusResponse = {
  enabled: boolean;
  authenticatedCount: number;
  pendingCount: number;
  timeoutSeconds: number;
  maxAttempts: number;
};

export type DiagnosticsStateResponse = {
  capturedAt: string;
  otherFarmerUids: number[];
  onlineFarmerCount: number;
  netReady: Array<{
    id: string;
    numberReady: number;
    numberRequired: number;
    isReady: boolean;
    isLocked: boolean;
  }>;
  newDaySync: {
    hasStarted: boolean;
    hasFinished: boolean;
    isActive: boolean;
  };
  activeClickableMenu?: string | null;
  timeOfDay: number;
  dayOfMonth: number;
  season: string;
  year: number;
  gameMode: number;
  isGameAvailable?: boolean | null;
  lastTickMs?: number | null;
  avgGameThreadWaitMs: number;
  cabins: Array<{
    tileX: number;
    tileY: number;
    indoorsName: string;
    ownerId: number;
    ownerName: string;
    ownerIsCustomized: boolean;
    ownerHasUserId: boolean;
    homeLocationOfOwner: string;
    farmhandReferenceDefined: boolean;
    farmhandReferenceUid: number;
    objectCount: number;
    fridgeItemCount: number;
    petCount: number;
    cellarObjectCount: number;
  }>;
  farmhandData: Array<{
    uniqueMultiplayerId: number;
    name: string;
    isCustomized: boolean;
    homeLocation: string;
    lastSleepLocation: string;
    hasUserId: boolean;
  }>;
  disconnectingFarmers: number[];
  farmHouseObjectCount: number;
  farmHouseFurnitureCount: number;
  farmHouseFridgeItemCount: number;
  masterCellarObjectCount: number;
  masterHasFlag?: boolean | null;
  masterHasEvent?: boolean | null;
  masterCaveChoice: number;
  masterShadowFriendshipPoints?: number | null;
  masterDaysPlayed: number;
  masterHasSpouse: boolean;
  masterName: string;
  saveImportFinalizeCount: number;
  failedFields: string[];
};

export type AuthTimeoutResponse = {
  success: boolean;
  timeoutSeconds: number;
  previousTimeoutSeconds: number;
  error?: string | null;
};

export type RenderingSetResponse = {
  success: boolean;
  fps: number;
  previousFps: number;
  message?: string | null;
  error?: string | null;
};

export type TimeSetResponse = {
  success: boolean;
  timeOfDay: number;
  message?: string | null;
  error?: string | null;
};

export type ClockSpeedResponse = {
  success: boolean;
  multiplier: number;
  effectiveMs: number;
  error?: string | null;
};

export type RoleGrantResponse = {
  success: boolean;
  playerId: number;
  playerName?: string | null;
  message?: string | null;
  error?: string | null;
};

export type FarmhandResponse = {
  success: boolean;
  message?: string | null;
  error?: string | null;
};

export type NewGameRequest = z.infer<typeof newGameRequestSchema>;

export type NewGameResponse = {
  success: boolean;
  message?: string | null;
  error?: string | null;
};

export type ReloadResponse = {
  success: boolean;
  message?: string | null;
  error?: string | null;
};

export type DashboardData = {
  status: ServerStatus;
  players: PlayersResponse;
  inviteCode: InviteCodeResponse;
  health: HealthResponse;
  stats: StatsResponse;
  farmhands: FarmhandsResponse;
  settings: SettingsResponse;
  cabins: CabinsResponse;
  rendering: RenderingStatus;
  screenshot: ScreenshotResponse;
  auth: AuthStatusResponse;
  diagnostics: DiagnosticsStateResponse | null;
  endpointErrors: Record<string, string>;
  lastLoadedAt: string | null;
};

export type BrowserRuntimeConfig = {
  appName?: string;
  documentationUrl?: string;
  defaultApiBaseUrl?: string;
  connectionMode?: 'direct';
};

export type ConnectionConfig = {
  apiBaseUrl: string;
  apiKey: string;
  rememberApiKey: boolean;
};

export type ConnectionAssessment = {
  normalizedBaseUrl: string;
  sameOrigin: boolean;
  hasApiKey: boolean;
  crossOrigin: boolean;
  mixedContentRisk: boolean;
  warnings: string[];
  notes: string[];
};

declare global {
  interface Window {
    __JUNIMO_WEB_CONFIG__?: BrowserRuntimeConfig;
  }
}

const runtimeConfigInternal: BrowserRuntimeConfig = window.__JUNIMO_WEB_CONFIG__ ?? {};
const PUBLIC_CONNECTION_KEY = 'junimo.direct.connection.public';
const SESSION_API_KEY_KEY = 'junimo.direct.connection.apiKey.session';
const LOCAL_API_KEY_KEY = 'junimo.direct.connection.apiKey.local';

const emptyStatus: ServerStatus = {
  playerCount: 0,
  maxPlayers: 0,
  serverVersion: 'unknown',
  isOnline: false,
  isReady: false,
  lastUpdated: '',
  steamInviteCode: null,
  gogInviteCode: null,
  farmName: '',
  day: 0,
  season: '',
  year: 0,
  timeOfDay: 0,
  farmTypeKey: '',
  isPaused: false,
  version: 0,
};

const emptyPlayers: PlayersResponse = {
  players: [],
  version: 0,
};

const emptyInviteCode: InviteCodeResponse = {
  inviteCode: null,
  error: null,
};

const emptyHealth: HealthResponse = {
  status: 'unknown',
  timestamp: '',
  lastTickMs: null,
  pendingActions: 0,
  gameAvailable: null,
  tickCount: 0,
  isFrozen: false,
};

const emptyStats: StatsResponse = {
  fps: 0,
  tps: 0,
  targetTps: 0,
  avgTickMs: 0,
  memoryMb: 0,
  gcGen0: 0,
  gcGen1: 0,
  gcGen2: 0,
  pendingActions: 0,
  gameThreadWaitMs: 0,
};

const emptyFarmhands: FarmhandsResponse = {
  farmhands: [],
  version: 0,
};

const emptySettings: SettingsResponse = {
  game: {
    farmName: '',
    farmType: 0,
    profitMargin: 1,
    startingCabins: 0,
    spawnMonstersAtNight: '',
  },
  server: {
    maxPlayers: 0,
    cabinStrategy: '',
    separateWallets: false,
    existingCabinBehavior: '',
  },
};

const emptyCabins: CabinsResponse = {
  strategy: '',
  totalCount: 0,
  assignedCount: 0,
  availableCount: 0,
  cabins: [],
  savedPositionPlayerIds: [],
};

const emptyRendering: RenderingStatus = {
  fps: 0,
};

const emptyScreenshot: ScreenshotResponse = {
  success: false,
  error: 'Not loaded',
  width: 0,
  height: 0,
  base64Png: null,
};

const emptyAuth: AuthStatusResponse = {
  enabled: false,
  authenticatedCount: 0,
  pendingCount: 0,
  timeoutSeconds: 0,
  maxAttempts: 0,
};

export const runtimeConfig = runtimeConfigInternal;

export function createEmptyDashboard(): DashboardData {
  return {
    status: { ...emptyStatus },
    players: { ...emptyPlayers, players: [] },
    inviteCode: { ...emptyInviteCode },
    health: { ...emptyHealth },
    stats: { ...emptyStats },
    farmhands: { ...emptyFarmhands, farmhands: [] },
    settings: {
      game: { ...emptySettings.game },
      server: { ...emptySettings.server },
    },
    cabins: { ...emptyCabins, cabins: [], savedPositionPlayerIds: [] },
    rendering: { ...emptyRendering },
    screenshot: { ...emptyScreenshot },
    auth: { ...emptyAuth },
    diagnostics: null,
    endpointErrors: {},
    lastLoadedAt: null,
  };
}

function normalizeServerStatus(value: z.infer<typeof serverStatusSchema>): ServerStatus {
  return {
    playerCount: value.playerCount,
    maxPlayers: value.maxPlayers,
    steamInviteCode: value.steamInviteCode ?? null,
    gogInviteCode: value.gogInviteCode ?? null,
    serverVersion: value.serverVersion,
    isOnline: value.isOnline,
    isReady: value.isReady,
    lastUpdated: value.lastUpdated,
    farmName: value.farmName ?? '',
    day: value.day ?? 0,
    season: value.season ?? '',
    year: value.year ?? 0,
    timeOfDay: value.timeOfDay ?? 0,
    farmTypeKey: value.farmTypeKey ?? '',
    isPaused: value.isPaused ?? false,
    version: value.version ?? 0,
  };
}

function normalizePlayersResponse(
  value: z.infer<typeof playersResponseSchema>,
): PlayersResponse {
  return {
    players: value.players,
    version: value.version ?? 0,
  };
}

function normalizeStatsResponse(value: z.infer<typeof statsResponseSchema>): StatsResponse {
  return {
    fps: value.fps,
    tps: value.tps,
    targetTps: value.targetTps ?? 0,
    avgTickMs: value.avgTickMs,
    memoryMb: value.memoryMb,
    gcGen0: value.gcGen0,
    gcGen1: value.gcGen1,
    gcGen2: value.gcGen2,
    pendingActions: value.pendingActions,
    gameThreadWaitMs: value.gameThreadWaitMs,
  };
}

function normalizeFarmhandsResponse(
  value: z.infer<typeof farmhandsResponseSchema>,
): FarmhandsResponse {
  return {
    farmhands: value.farmhands,
    version: value.version ?? 0,
  };
}

function normalizeAuthTimeoutResponse(
  value: z.infer<typeof authTimeoutResponseSchema>,
): AuthTimeoutResponse {
  return {
    success: value.success,
    timeoutSeconds: value.timeoutSeconds,
    previousTimeoutSeconds: value.previousTimeoutSeconds ?? 0,
    error: value.error ?? null,
  };
}

function normalizeRenderingSetResponse(
  value: z.infer<typeof renderingSetResponseSchema>,
): RenderingSetResponse {
  return {
    success: value.success,
    fps: value.fps,
    previousFps: value.previousFps ?? 0,
    message: value.message ?? null,
    error: value.error ?? null,
  };
}

function normalizeClockSpeedResponse(
  value: z.infer<typeof clockSpeedResponseSchema>,
): ClockSpeedResponse {
  return {
    success: value.success,
    multiplier: value.multiplier ?? 0,
    effectiveMs: value.effectiveMs ?? 0,
    error: value.error ?? null,
  };
}

function normalizeRoleGrantResponse(
  value: z.infer<typeof roleGrantResponseSchema>,
): RoleGrantResponse {
  return {
    success: value.success,
    playerId: value.playerId ?? 0,
    playerName: value.playerName ?? null,
    message: value.message ?? null,
    error: value.error ?? null,
  };
}

export function normalizeApiBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  const url = new URL(withProtocol);
  const normalizedPath = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '');
  url.pathname = normalizedPath;
  url.search = '';
  url.hash = '';
  return `${url.origin}${url.pathname}`;
}

export function loadStoredConnection(): ConnectionConfig {
  let apiBaseUrl = runtimeConfig.defaultApiBaseUrl?.trim() ?? '';
  let rememberApiKey = false;

  try {
    const publicRaw = window.localStorage.getItem(PUBLIC_CONNECTION_KEY);
    if (publicRaw) {
      const parsed = JSON.parse(publicRaw) as {
        apiBaseUrl?: string;
        rememberApiKey?: boolean;
      };
      if (typeof parsed.apiBaseUrl === 'string') {
        apiBaseUrl = parsed.apiBaseUrl;
      }
      rememberApiKey = Boolean(parsed.rememberApiKey);
    }
  } catch {
    // Ignore malformed local storage.
  }

  const sessionApiKey = window.sessionStorage.getItem(SESSION_API_KEY_KEY) ?? '';
  const localApiKey = window.localStorage.getItem(LOCAL_API_KEY_KEY) ?? '';
  const apiKey = rememberApiKey ? localApiKey : sessionApiKey || localApiKey;

  return {
    apiBaseUrl,
    apiKey,
    rememberApiKey,
  };
}

export function saveConnection(connection: ConnectionConfig): void {
  const normalized: ConnectionConfig = {
    apiBaseUrl: normalizeApiBaseUrl(connection.apiBaseUrl),
    apiKey: connection.apiKey.trim(),
    rememberApiKey: connection.rememberApiKey,
  };

  window.localStorage.setItem(
    PUBLIC_CONNECTION_KEY,
    JSON.stringify({
      apiBaseUrl: normalized.apiBaseUrl,
      rememberApiKey: normalized.rememberApiKey,
    }),
  );

  if (normalized.rememberApiKey) {
    if (normalized.apiKey) {
      window.localStorage.setItem(LOCAL_API_KEY_KEY, normalized.apiKey);
    } else {
      window.localStorage.removeItem(LOCAL_API_KEY_KEY);
    }
    window.sessionStorage.removeItem(SESSION_API_KEY_KEY);
  } else {
    if (normalized.apiKey) {
      window.sessionStorage.setItem(SESSION_API_KEY_KEY, normalized.apiKey);
    } else {
      window.sessionStorage.removeItem(SESSION_API_KEY_KEY);
    }
    window.localStorage.removeItem(LOCAL_API_KEY_KEY);
  }
}

export function clearStoredConnection(): void {
  window.localStorage.removeItem(PUBLIC_CONNECTION_KEY);
  window.localStorage.removeItem(LOCAL_API_KEY_KEY);
  window.sessionStorage.removeItem(SESSION_API_KEY_KEY);
}

export function assessConnection(connection: ConnectionConfig): ConnectionAssessment {
  const normalizedBaseUrl = normalizeApiBaseUrl(connection.apiBaseUrl);
  if (!normalizedBaseUrl) {
    return {
      normalizedBaseUrl: '',
      sameOrigin: false,
      hasApiKey: false,
      crossOrigin: false,
      mixedContentRisk: false,
      warnings: [],
      notes: ['Enter a JunimoServer API address to start direct browser mode.'],
    };
  }

  const apiUrl = new URL(normalizedBaseUrl);
  const sameOrigin = apiUrl.origin === window.location.origin;
  const crossOrigin = !sameOrigin;
  const hasApiKey = connection.apiKey.trim().length > 0;
  const mixedContentRisk = window.location.protocol === 'https:' && apiUrl.protocol === 'http:';

  const warnings: string[] = [];
  const notes: string[] = [];

  if (mixedContentRisk) {
    warnings.push('This page is loaded over HTTPS but the API URL is HTTP. Browsers block mixed-content requests before they reach JunimoServer.');
  }

  if (crossOrigin) {
    warnings.push('Cross-origin direct browser mode is active. JunimoServer does not appear to expose full CORS preflight support for every protected endpoint.');
    notes.push('Simple unauthenticated GET requests may still work, but browser-preflighted requests can fail before the server sees them.');
  } else {
    notes.push('Same-origin direct mode: browser CORS restrictions are not a blocker here.');
  }

  if (crossOrigin && hasApiKey) {
    warnings.push('Using an API key in the browser adds an Authorization header, which triggers CORS preflight. Protected endpoints are likely to fail unless the API is same-origin or JunimoServer adds full OPTIONS/CORS support.');
  }

  if (crossOrigin) {
    warnings.push('DELETE /farmhands is especially likely to fail in browser-direct mode because DELETE always triggers preflight.');
  }

  if (!hasApiKey) {
    notes.push('Leave API key empty only if the upstream Junimo API is intentionally running without API_KEY.');
  }

  return {
    normalizedBaseUrl,
    sameOrigin,
    hasApiKey,
    crossOrigin,
    mixedContentRisk,
    warnings,
    notes,
  };
}

export function buildWebSocketUrl(apiBaseUrl: string): string {
  const normalized = normalizeApiBaseUrl(apiBaseUrl);
  const url = new URL(normalized);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  url.search = '';
  url.hash = '';
  return url.toString();
}

function buildRequestUrl(
  connection: ConnectionConfig,
  pathname: string,
  query?: Record<string, string | number | boolean | undefined>,
): string {
  const url = new URL(pathname, normalizeApiBaseUrl(connection.apiBaseUrl));
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function toRequestError(
  reason: unknown,
  connection: ConnectionConfig,
  method: string,
): Error {
  if (reason instanceof Error && !/Failed to fetch/i.test(reason.message)) {
    return reason;
  }

  const assessment = assessConnection(connection);
  const hintParts = [
    'Browser blocked the request before JunimoServer returned a response.',
  ];

  if (assessment.mixedContentRisk) {
    hintParts.push('The current page is HTTPS while the API target is HTTP.');
  } else if (assessment.crossOrigin && assessment.hasApiKey) {
    hintParts.push('This direct request is cross-origin and uses Authorization, so the browser likely blocked the CORS preflight.');
  } else if (assessment.crossOrigin && method === 'DELETE') {
    hintParts.push('DELETE requests are preflighted by browsers and JunimoServer may not answer that preflight.');
  } else if (assessment.crossOrigin) {
    hintParts.push('This is most likely a CORS limitation in cross-origin direct mode.');
  }

  return new Error(hintParts.join(' '));
}

async function requestJunimoJson<T>(
  connection: ConnectionConfig,
  pathname: string,
  parser: z.ZodType<T, z.ZodTypeDef, unknown>,
  options?: {
    method?: 'GET' | 'POST' | 'DELETE';
    query?: Record<string, string | number | boolean | undefined>;
    body?: string;
  },
): Promise<T> {
  const method = options?.method ?? 'GET';
  const headers = new Headers();
  headers.set('Accept', 'application/json');
  const apiKey = connection.apiKey.trim();
  if (apiKey) {
    headers.set('Authorization', `Bearer ${apiKey}`);
  }

  let response: Response;
  try {
    response = await fetch(buildRequestUrl(connection, pathname, options?.query), {
      method,
      headers,
      body: options?.body,
    });
  } catch (reason) {
    throw toRequestError(reason, connection, method);
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text.length > 0) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text };
    }
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : typeof payload === 'object' &&
            payload !== null &&
            'message' in payload &&
            typeof (payload as { message?: unknown }).message === 'string'
          ? (payload as { message: string }).message
          : `Junimo request failed (${response.status})`;
    throw new Error(message);
  }

  return parser.parse(payload);
}

function resolveSettled<T>(
  result: PromiseSettledResult<T>,
  fallback: T,
  errors: Record<string, string>,
  key: string,
): T {
  if (result.status === 'fulfilled') {
    return result.value;
  }
  errors[key] = result.reason instanceof Error ? result.reason.message : 'Request failed';
  return fallback;
}

export async function fetchDashboard(
  connection: ConnectionConfig,
  includeDiagnostics: boolean,
): Promise<DashboardData> {
  const result = createEmptyDashboard();
  const errors: Record<string, string> = {};

  const [
    status,
    players,
    inviteCode,
    health,
    stats,
    farmhands,
    settings,
    cabins,
    rendering,
    screenshot,
    auth,
    diagnostics,
  ] = await Promise.allSettled([
    requestJunimoJson(connection, '/status', serverStatusSchema).then(normalizeServerStatus),
    requestJunimoJson(connection, '/players', playersResponseSchema).then(normalizePlayersResponse),
    requestJunimoJson(connection, '/invite-code', inviteCodeResponseSchema),
    requestJunimoJson(connection, '/health', healthResponseSchema),
    requestJunimoJson(connection, '/stats', statsResponseSchema).then(normalizeStatsResponse),
    requestJunimoJson(connection, '/farmhands', farmhandsResponseSchema).then(normalizeFarmhandsResponse),
    requestJunimoJson(connection, '/settings', settingsResponseSchema),
    requestJunimoJson(connection, '/cabins', cabinsResponseSchema),
    requestJunimoJson(connection, '/rendering', renderingStatusSchema),
    requestJunimoJson(connection, '/screenshot', screenshotResponseSchema),
    requestJunimoJson(connection, '/auth', authStatusResponseSchema),
    includeDiagnostics
      ? requestJunimoJson(connection, '/diagnostics/state', diagnosticsStateResponseSchema)
      : Promise.resolve(null),
  ]);

  result.status = resolveSettled(status, result.status, errors, 'status');
  result.players = resolveSettled(players, result.players, errors, 'players');
  result.inviteCode = resolveSettled(inviteCode, result.inviteCode, errors, 'inviteCode');
  result.health = resolveSettled(health, result.health, errors, 'health');
  result.stats = resolveSettled(stats, result.stats, errors, 'stats');
  result.farmhands = resolveSettled(farmhands, result.farmhands, errors, 'farmhands');
  result.settings = resolveSettled(settings, result.settings, errors, 'settings');
  result.cabins = resolveSettled(cabins, result.cabins, errors, 'cabins');
  result.rendering = resolveSettled(rendering, result.rendering, errors, 'rendering');
  result.screenshot = resolveSettled(screenshot, result.screenshot, errors, 'screenshot');
  result.auth = resolveSettled(auth, result.auth, errors, 'auth');
  result.diagnostics = includeDiagnostics
    ? resolveSettled(diagnostics, null, errors, 'diagnostics')
    : null;
  result.endpointErrors = errors;
  result.lastLoadedAt = new Date().toISOString();

  return result;
}

export async function setAuthTimeout(
  connection: ConnectionConfig,
  input: z.input<typeof setAuthTimeoutInputSchema>,
): Promise<AuthTimeoutResponse> {
  const parsed = setAuthTimeoutInputSchema.parse(input);
  return requestJunimoJson(connection, '/auth/timeout', authTimeoutResponseSchema, {
    method: 'POST',
    query: { value: parsed.value },
  }).then(normalizeAuthTimeoutResponse);
}

export async function setRendering(
  connection: ConnectionConfig,
  input: z.input<typeof setRenderingInputSchema>,
): Promise<RenderingSetResponse> {
  const parsed = setRenderingInputSchema.parse(input);
  return requestJunimoJson(connection, '/rendering', renderingSetResponseSchema, {
    method: 'POST',
    query: { fps: parsed.fps },
  }).then(normalizeRenderingSetResponse);
}

export async function setTimeOfDay(
  connection: ConnectionConfig,
  input: z.input<typeof setTimeInputSchema>,
): Promise<TimeSetResponse> {
  const parsed = setTimeInputSchema.parse(input);
  return requestJunimoJson(connection, '/time', timeSetResponseSchema, {
    method: 'POST',
    query: { value: parsed.value },
  });
}

export async function setClockSpeed(
  connection: ConnectionConfig,
  input: z.input<typeof setClockSpeedInputSchema>,
): Promise<ClockSpeedResponse> {
  const parsed = setClockSpeedInputSchema.parse(input);
  return requestJunimoJson(connection, '/clock-speed', clockSpeedResponseSchema, {
    method: 'POST',
    query: { multiplier: parsed.multiplier },
  }).then(normalizeClockSpeedResponse);
}

export async function grantAdminRole(
  connection: ConnectionConfig,
  input: z.input<typeof roleGrantInputSchema>,
): Promise<RoleGrantResponse> {
  const parsed = roleGrantInputSchema.parse(input);
  return requestJunimoJson(connection, '/roles/admin', roleGrantResponseSchema, {
    method: 'POST',
    query: {
      name: parsed.name,
      playerId: parsed.playerId,
    },
  }).then(normalizeRoleGrantResponse);
}

export async function deleteFarmhand(
  connection: ConnectionConfig,
  input: z.input<typeof deleteFarmhandInputSchema>,
): Promise<FarmhandResponse> {
  const parsed = deleteFarmhandInputSchema.parse(input);
  return requestJunimoJson(connection, '/farmhands', farmhandResponseSchema, {
    method: 'DELETE',
    query: {
      name: parsed.name,
      playerId: parsed.playerId,
    },
  });
}

export async function createNewGame(
  connection: ConnectionConfig,
  input: z.input<typeof newGameRequestSchema>,
): Promise<NewGameResponse> {
  const parsed = newGameRequestSchema.parse(input);
  return requestJunimoJson(connection, '/newgame', newGameResponseSchema, {
    method: 'POST',
    body: JSON.stringify(parsed),
  });
}

export async function reloadWorld(connection: ConnectionConfig): Promise<ReloadResponse> {
  return requestJunimoJson(connection, '/reload', reloadResponseSchema, {
    method: 'POST',
  });
}
