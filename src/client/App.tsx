import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  AuthStatusResponse,
  CabinsResponse,
  DiagnosticsStateResponse,
  FarmhandsResponse,
  HealthResponse,
  InviteCodeResponse,
  PlayersResponse,
  RenderingStatus,
  ServerStatus,
  SettingsResponse,
  StatsResponse,
} from '../shared/junimo';

type SessionPayload = {
  authenticated: boolean;
  csrfToken: string | null;
  expiresAt: number | null;
};

type DashboardPayload = {
  status: ServerStatus;
  players: PlayersResponse;
  inviteCode: InviteCodeResponse;
  health: HealthResponse;
  stats: StatsResponse;
  farmhands: FarmhandsResponse;
  settings: SettingsResponse;
  cabins: CabinsResponse;
  rendering: RenderingStatus;
  screenshot: {
    success: boolean;
    base64Png?: string | null;
    width?: number;
    height?: number;
    error?: string | null;
  };
  auth: AuthStatusResponse;
  diagnostics: DiagnosticsStateResponse | null;
};

type AppConfigLegacy = {
  appName?: string;
  documentationUrl?: string;
  secureProxy?: boolean;
  baseUrlHint?: string;
};

const appConfig: AppConfigLegacy = {};

async function api<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  let payload: unknown = null;
  const text = await response.text();
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
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

function fmtTimeOfDay(value: number): string {
  if (!value) {
    return 'Unknown';
  }
  const padded = value.toString().padStart(4, '0');
  const hours = Number.parseInt(padded.slice(0, 2), 10) % 24;
  const minutes = Number.parseInt(padded.slice(2), 10);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function relativeTime(iso: string): string {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) {
    return iso;
  }
  const deltaMs = Date.now() - ts;
  const deltaSec = Math.round(deltaMs / 1000);
  if (Math.abs(deltaSec) < 60) {
    return `${deltaSec}s ago`;
  }
  const deltaMin = Math.round(deltaSec / 60);
  if (Math.abs(deltaMin) < 60) {
    return `${deltaMin}m ago`;
  }
  const deltaHour = Math.round(deltaMin / 60);
  return `${deltaHour}h ago`;
}

function metricTone(ok: boolean, warn = false): string {
  if (ok) {
    return 'metric metric-ok';
  }
  if (warn) {
    return 'metric metric-warn';
  }
  return 'metric metric-bad';
}

function screenshotUrl(base64Png?: string | null): string | null {
  if (!base64Png) {
    return null;
  }
  return `data:image/png;base64,${base64Png}`;
}

export function App() {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [includeDiagnostics, setIncludeDiagnostics] = useState(false);
  const [chatConnected, setChatConnected] = useState(false);
  const [chatLines, setChatLines] = useState<Array<{ type: string; text: string }>>([]);
  const [chatAuthor, setChatAuthor] = useState('AdminConsole');
  const [chatMessage, setChatMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'map' | 'controls' | 'chat'>('dashboard');
  const [forms, setForms] = useState({
    authTimeout: '600',
    renderingFps: '15',
    timeOfDay: '1200',
    clockSpeed: '1',
    grantAdminName: '',
    grantAdminId: '',
    deleteFarmhandName: '',
    deleteFarmhandId: '',
    deleteConfirm: '',
    reloadConfirm: '',
    newGameConfirm: '',
    newGameFarmType: '0',
    newGameFarmName: '',
    newGameStartingCabins: '1',
    newGameCabinStrategy: 'CabinStack',
    newGameMaxPlayers: '8',
    newGameProfitMargin: '1',
    newGameSeparateWallets: false,
  });
  const chatSocketRef = useRef<WebSocket | null>(null);

  const screenshotSrc = useMemo(() => screenshotUrl(dashboard?.screenshot.base64Png), [dashboard]);

  async function refreshData(nextIncludeDiagnostics = includeDiagnostics) {
    const nextSession = await api<SessionPayload>('/api/auth/session');
    setSession(nextSession);
    if (!nextSession.authenticated) {
      setDashboard(null);
      setLoading(false);
      return;
    }

    const nextDashboard = await api<DashboardPayload>(
      `/api/dashboard?diagnostics=${nextIncludeDiagnostics ? 'true' : 'false'}`,
    );
    setDashboard(nextDashboard);
    setLoading(false);
  }

  useEffect(() => {
    refreshData().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Failed to load');
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!session?.authenticated || !session.csrfToken) {
      if (chatSocketRef.current) {
        chatSocketRef.current.close();
        chatSocketRef.current = null;
      }
      setChatConnected(false);
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/ws`);
    chatSocketRef.current = socket;

    socket.addEventListener('open', () => {
      setChatConnected(true);
      setChatLines((current) => [...current.slice(-19), { type: 'system', text: 'Chat bridge connected' }]);
    });
    socket.addEventListener('close', () => {
      setChatConnected(false);
      setChatLines((current) => [...current.slice(-19), { type: 'system', text: 'Chat bridge disconnected' }]);
    });
    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data as string) as {
          type?: string;
          payload?: { playerName?: string; message?: string; error?: string };
        };
        if (payload.type === 'chat') {
          setChatLines((current) => [
            ...current.slice(-49),
            {
              type: 'chat',
              text: `${payload.payload?.playerName ?? 'Unknown'}: ${payload.payload?.message ?? ''}`,
            },
          ]);
          return;
        }
        if (payload.type === 'auth_success') {
          setChatLines((current) => [...current.slice(-49), { type: 'system', text: 'Junimo WebSocket authenticated' }]);
          return;
        }
        if (payload.type === 'auth_failed') {
          setChatLines((current) => [
            ...current.slice(-49),
            { type: 'error', text: payload.payload?.error ?? 'Upstream auth failed' },
          ]);
          return;
        }
        if (payload.type === 'error') {
          setChatLines((current) => [
            ...current.slice(-49),
            { type: 'error', text: payload.payload?.error ?? 'Unknown chat error' },
          ]);
        }
      } catch {
        setChatLines((current) => [...current.slice(-49), { type: 'system', text: String(event.data) }]);
      }
    });

    return () => {
      socket.close();
    };
  }, [session?.authenticated, session?.csrfToken]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const nextSession = await api<SessionPayload>('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      setSession(nextSession);
      setPassword('');
      await refreshData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Login failed');
      setLoading(false);
    }
  }

  async function logout() {
    if (!session?.csrfToken) {
      return;
    }
    try {
      await api('/api/auth/logout', {
        method: 'POST',
        headers: {
          [ 'x-csrf-token' ]: session.csrfToken,
        },
      });
      setSession({ authenticated: false, csrfToken: null, expiresAt: null });
      setDashboard(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Logout failed');
    }
  }

  async function runAction<T>(
    key: string,
    url: string,
    init: RequestInit,
    onSuccess?: (result: T) => void,
  ) {
    if (!session?.csrfToken) {
      setError('No active session');
      return;
    }
    setBusyAction(key);
    setError(null);
    setActionMessage(null);
    try {
      const result = await api<T>(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': session.csrfToken,
          ...(init.headers ?? {}),
        },
      });
      onSuccess?.(result);
      await refreshData();
      setActionMessage(`${key} completed`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `${key} failed`);
    } finally {
      setBusyAction(null);
    }
  }

  function updateForm<K extends keyof typeof forms>(key: K, value: (typeof forms)[K]) {
    setForms((current) => ({ ...current, [key]: value }));
  }

  async function sendChat(event: React.FormEvent) {
    event.preventDefault();
    if (!session?.csrfToken || !chatSocketRef.current || chatSocketRef.current.readyState !== WebSocket.OPEN) {
      setError('Chat bridge is not connected');
      return;
    }
    const trimmedAuthor = chatAuthor.trim();
    const trimmedMessage = chatMessage.trim();
    if (!trimmedAuthor || !trimmedMessage) {
      return;
    }
    chatSocketRef.current.send(
      JSON.stringify({
        type: 'chat_send',
        csrfToken: session.csrfToken,
        payload: {
          author: trimmedAuthor,
          message: trimmedMessage,
        },
      }),
    );
    setChatLines((current) => [...current.slice(-49), { type: 'system', text: `Sent as ${trimmedAuthor}` }]);
    setChatMessage('');
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="loading-panel">
          <p>Loading secure control panel…</p>
        </div>
      </div>
    );
  }

  if (!session?.authenticated) {
    return (
      <div className="page-shell">
        <div className="login-card">
          <div className="login-banner">
            <span className="eyebrow">Security-first control plane</span>
            <h1>{appConfig.appName ?? 'JunimoServer Control'}</h1>
            <p>
              This UI never exposes the upstream Junimo `API_KEY` to the browser. All calls go through a
              same-origin proxy with session auth, CSRF, and write-path guardrails.
            </p>
          </div>
          <form className="login-form" onSubmit={login}>
            <label>
              <span>Admin password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Enter ADMIN_PASSWORD"
              />
            </label>
            <button type="submit">Unlock panel</button>
            {error ? <p className="error-text">{error}</p> : null}
          </form>
          <div className="login-footnote">
            <span>Proxy target: {appConfig.baseUrlHint ?? 'configured on server'}</span>
            <a href={appConfig.documentationUrl ?? '#'} target="_blank" rel="noreferrer">
              API reference
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero-copy">
          <span className="eyebrow">JunimoServer administration</span>
          <h1>{dashboard?.status.farmName || 'JunimoServer'} control panel</h1>
          <p>
            Same-origin admin console for the documented REST API. Write operations require session auth,
            CSRF, rate limits, and explicit confirmation for destructive paths.
          </p>
        </div>
        <div className="hero-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setLoading(true);
              refreshData().catch((reason) => {
                setError(reason instanceof Error ? reason.message : 'Refresh failed');
                setLoading(false);
              });
            }}
          >
            Refresh
          </button>
          <button className="secondary-button" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      {error ? <div className="notice notice-error">{error}</div> : null}
      {actionMessage ? <div className="notice notice-success">{actionMessage}</div> : null}

      <section className="metric-grid">
        <article className={metricTone(Boolean(dashboard?.status.isOnline))}>
          <span className="metric-label">Server</span>
          <strong>{dashboard?.status.isOnline ? 'Online' : 'Offline'}</strong>
          <small>{dashboard?.status.serverVersion}</small>
        </article>
        <article className={metricTone(Boolean(dashboard?.status.isReady), Boolean(dashboard?.status.isOnline))}>
          <span className="metric-label">Ready state</span>
          <strong>{dashboard?.status.isReady ? 'Ready' : 'Blocked'}</strong>
          <small>{dashboard?.status.isPaused ? 'Clock paused' : 'Clock running'}</small>
        </article>
        <article className={metricTone((dashboard?.players.players.length ?? 0) < (dashboard?.status.maxPlayers ?? 0), false)}>
          <span className="metric-label">Players</span>
          <strong>
            {dashboard?.players.players.length ?? 0} / {dashboard?.status.maxPlayers ?? 0}
          </strong>
          <small>Connected now</small>
        </article>
        <article className={metricTone(!(dashboard?.health.isFrozen ?? false), (dashboard?.health.status ?? '') === 'degraded')}>
          <span className="metric-label">Health</span>
          <strong>{dashboard?.health.status ?? 'unknown'}</strong>
          <small>{dashboard?.health.lastTickMs ?? 0} ms since last tick</small>
        </article>
        <article className="metric metric-neutral">
          <span className="metric-label">Game time</span>
          <strong>{fmtTimeOfDay(dashboard?.status.timeOfDay ?? 0)}</strong>
          <small>
            {dashboard?.status.season} day {dashboard?.status.day}, year {dashboard?.status.year}
          </small>
        </article>
        <article className="metric metric-neutral">
          <span className="metric-label">Render rate</span>
          <strong>{dashboard?.rendering.fps ?? 0} FPS</strong>
          <small>{dashboard?.stats.fps.toFixed(1)} measured host FPS</small>
        </article>
      </section>

      
      <nav className="stardew-tabs">
        <button className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
        <button className={`tab-button ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>Map View</button>
        <button className={`tab-button ${activeTab === 'controls' ? 'active' : ''}`} onClick={() => setActiveTab('controls')}>Controls</button>
        <button className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>Chat Bridge</button>
      </nav>

      <section className="tab-content">
        {activeTab === 'dashboard' && (
          <div className="layout-grid">
            <div className="column">
              <Panel title="Overview" subtitle="Snapshot-backed state and settings">
            <DataList
              items={[
                ['Farm', dashboard?.status.farmName ?? '-'],
                ['Farm type', String(dashboard?.status.farmTypeKey ?? '-')],
                ['Updated', `${dashboard?.status.lastUpdated ?? '-'} (${relativeTime(dashboard?.status.lastUpdated ?? '')})`],
                ['Invite code', dashboard?.inviteCode.inviteCode ?? dashboard?.inviteCode.error ?? 'Unavailable'],
                ['Auth protection', dashboard?.auth.enabled ? 'Enabled' : 'Disabled'],
                ['Auth timeout', `${dashboard?.auth.timeoutSeconds ?? 0}s`],
                ['Cabin strategy', dashboard?.cabins.strategy ?? '-'],
                ['Separate wallets', dashboard?.settings.server.separateWallets ? 'Yes' : 'No'],
              ]}
            />
          </Panel>
              <Panel title="Players" subtitle="Connected players and known farmhands">
            <Table
              headers={['Name', 'ID', 'Online']}
              rows={dashboard?.players.players.map((player) => [
                player.name,
                String(player.id),
                player.isOnline ? 'Yes' : 'No',
              ]) ?? []}
              emptyText="No connected players"
            />
            <div className="table-spacer" />
            <Table
              headers={['Farmhand', 'ID', 'Customized']}
              rows={dashboard?.farmhands.farmhands.map((farmhand) => [
                farmhand.name,
                String(farmhand.id),
                farmhand.isCustomized ? 'Yes' : 'No',
              ]) ?? []}
              emptyText="No farmhand slots found"
            />
          </Panel>
            </div>
            <div className="column">
              <Panel title="Performance" subtitle="Host process metrics from /stats and /health">
            <div className="stats-grid">
              <StatBlock label="TPS" value={dashboard?.stats.tps.toFixed(1) ?? '-'} />
              <StatBlock label="Target TPS" value={String(dashboard?.stats.targetTps ?? '-')} />
              <StatBlock label="Avg tick" value={`${dashboard?.stats.avgTickMs.toFixed(2) ?? '-'} ms`} />
              <StatBlock label="Memory" value={`${dashboard?.stats.memoryMb.toFixed(1) ?? '-'} MB`} />
              <StatBlock label="Pending actions" value={String(dashboard?.health.pendingActions ?? '-')} />
              <StatBlock label="Game-thread wait" value={`${dashboard?.stats.gameThreadWaitMs.toFixed(2) ?? '-'} ms`} />
            </div>
            <div className="stats-grid compact">
              <StatBlock label="GC Gen0" value={String(dashboard?.stats.gcGen0 ?? '-')} />
              <StatBlock label="GC Gen1" value={String(dashboard?.stats.gcGen1 ?? '-')} />
              <StatBlock label="GC Gen2" value={String(dashboard?.stats.gcGen2 ?? '-')} />
              <StatBlock label="Tick count" value={String(dashboard?.health.tickCount ?? '-')} />
            </div>
          </Panel>
              <Panel title="Cabins" subtitle="Assignment and hidden-stack state">
            <div className="stats-row">
              <Badge label="Total" value={dashboard?.cabins.totalCount ?? 0} />
              <Badge label="Assigned" value={dashboard?.cabins.assignedCount ?? 0} />
              <Badge label="Available" value={dashboard?.cabins.availableCount ?? 0} />
            </div>
            <Table
              headers={['Owner', 'Type', 'Tile', 'Assigned', 'Hidden']}
              rows={dashboard?.cabins.cabins.map((cabin) => [
                cabin.ownerName || 'Unassigned',
                cabin.type,
                `${cabin.tileX}, ${cabin.tileY}`,
                cabin.isAssigned ? 'Yes' : 'No',
                cabin.isHidden ? 'Yes' : 'No',
              ]) ?? []}
              emptyText="No cabins"
            />
          </Panel>
            </div>
            <div className="column">
              <Panel title="Diagnostics" subtitle="Opt-in because `/diagnostics/state` is heavier and mostly test-facing">
            <div className="toggle-row">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={includeDiagnostics}
                  onChange={(event) => {
                    const next = event.target.checked;
                    setIncludeDiagnostics(next);
                    setLoading(true);
                    refreshData(next).catch((reason) => {
                      setError(reason instanceof Error ? reason.message : 'Diagnostics refresh failed');
                      setLoading(false);
                    });
                  }}
                />
                <span>Load `/diagnostics/state` on refresh</span>
              </label>
            </div>
            {dashboard?.diagnostics ? (
              <>
                <DataList
                  items={[
                    ['Captured at', dashboard.diagnostics.capturedAt],
                    ['Game mode', String(dashboard.diagnostics.gameMode)],
                    ['Menu', dashboard.diagnostics.activeClickableMenu ?? 'None'],
                    ['Online farmers', String(dashboard.diagnostics.onlineFarmerCount)],
                    ['Disconnecting', dashboard.diagnostics.disconnectingFarmers.join(', ') || 'None'],
                    ['Failed fields', dashboard.diagnostics.failedFields.join(', ') || 'None'],
                  ]}
                />
                <div className="table-spacer" />
                <Table
                  headers={['Cabin owner', 'Indoors', 'Objects', 'Cellar', 'Pet']}
                  rows={dashboard.diagnostics.cabins.map((cabin) => [
                    cabin.ownerName || 'Unassigned',
                    cabin.indoorsName,
                    String(cabin.objectCount),
                    String(cabin.cellarObjectCount),
                    String(cabin.petCount),
                  ])}
                  emptyText="No diagnostics cabins"
                />
              </>
            ) : (
              <div className="empty-state">
                Diagnostics are off by default. Enable the checkbox if you need live engine-state debugging.
              </div>
            )}
          </Panel>
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="layout-single">
            <Panel title="Live screenshot" subtitle="Fetched through the local secure proxy">
            {screenshotSrc ? (
              <img className="screenshot-frame full-map" src={screenshotSrc} alt="JunimoServer screenshot" />
            ) : (
              <div className="empty-state">Screenshot unavailable: {dashboard?.screenshot.error ?? 'No image data'}</div>
            )}
          </Panel>
          </div>
        )}

        {activeTab === 'controls' && (
          <div className="layout-grid">
            <div className="column">
              <Panel title="Controls" subtitle="Low-risk runtime operations">
            <div className="form-grid">
              <ActionForm
                title="Auth timeout"
                description="Update password-protection timeout in seconds."
                busy={busyAction === 'Auth timeout'}
                onSubmit={(event) => {
                  event.preventDefault();
                  runAction('Auth timeout', '/api/actions/auth-timeout', {
                    method: 'POST',
                    body: JSON.stringify({ value: Number(forms.authTimeout) }),
                  });
                }}
              >
                <label>
                  <span>Seconds</span>
                  <input value={forms.authTimeout} onChange={(event) => updateForm('authTimeout', event.target.value)} />
                </label>
              </ActionForm>

              <ActionForm
                title="Render rate"
                description="Set `/rendering?fps=`. `0` disables rendering."
                busy={busyAction === 'Render rate'}
                onSubmit={(event) => {
                  event.preventDefault();
                  runAction('Render rate', '/api/actions/rendering', {
                    method: 'POST',
                    body: JSON.stringify({ fps: Number(forms.renderingFps) }),
                  });
                }}
              >
                <label>
                  <span>FPS</span>
                  <input value={forms.renderingFps} onChange={(event) => updateForm('renderingFps', event.target.value)} />
                </label>
              </ActionForm>

              <ActionForm
                title="Set game time"
                description="Valid upstream range is `600` to `2600`."
                busy={busyAction === 'Set game time'}
                onSubmit={(event) => {
                  event.preventDefault();
                  runAction('Set game time', '/api/actions/time', {
                    method: 'POST',
                    body: JSON.stringify({ value: Number(forms.timeOfDay) }),
                  });
                }}
              >
                <label>
                  <span>Time value</span>
                  <input value={forms.timeOfDay} onChange={(event) => updateForm('timeOfDay', event.target.value)} />
                </label>
              </ActionForm>

              <ActionForm
                title="Clock speed"
                description="Set `/clock-speed?multiplier=` to accelerate or slow the day."
                busy={busyAction === 'Clock speed'}
                onSubmit={(event) => {
                  event.preventDefault();
                  runAction('Clock speed', '/api/actions/clock-speed', {
                    method: 'POST',
                    body: JSON.stringify({ multiplier: Number(forms.clockSpeed) }),
                  });
                }}
              >
                <label>
                  <span>Multiplier</span>
                  <input value={forms.clockSpeed} onChange={(event) => updateForm('clockSpeed', event.target.value)} />
                </label>
              </ActionForm>

              <ActionForm
                title="Grant admin"
                description="Provide exactly one of player name or player ID."
                busy={busyAction === 'Grant admin'}
                onSubmit={(event) => {
                  event.preventDefault();
                  runAction('Grant admin', '/api/actions/grant-admin', {
                    method: 'POST',
                    body: JSON.stringify(
                      forms.grantAdminId.trim()
                        ? { playerId: Number(forms.grantAdminId) }
                        : { name: forms.grantAdminName.trim() },
                    ),
                  });
                }}
              >
                <label>
                  <span>Player name</span>
                  <input value={forms.grantAdminName} onChange={(event) => updateForm('grantAdminName', event.target.value)} />
                </label>
                <label>
                  <span>Player ID</span>
                  <input value={forms.grantAdminId} onChange={(event) => updateForm('grantAdminId', event.target.value)} />
                </label>
              </ActionForm>
            </div>
          </Panel>
            </div>
            <div className="column">
              <Panel title="Danger zone" subtitle="Destructive or disruptive operations require explicit confirmation text">
            <div className="danger-grid">
              <ActionForm
                title="Delete farmhand"
                description="Upstream requires either `name` or `playerId`. This cannot be undone."
                busy={busyAction === 'Delete farmhand'}
                danger
                onSubmit={(event) => {
                  event.preventDefault();
                  runAction('Delete farmhand', '/api/actions/farmhand', {
                    method: 'DELETE',
                    body: JSON.stringify(
                      forms.deleteFarmhandId.trim()
                        ? {
                            playerId: Number(forms.deleteFarmhandId),
                            confirmText: forms.deleteConfirm,
                          }
                        : {
                            name: forms.deleteFarmhandName.trim(),
                            confirmText: forms.deleteConfirm,
                          },
                    ),
                  });
                }}
              >
                <label>
                  <span>Farmhand name</span>
                  <input
                    value={forms.deleteFarmhandName}
                    onChange={(event) => updateForm('deleteFarmhandName', event.target.value)}
                  />
                </label>
                <label>
                  <span>Farmhand ID</span>
                  <input
                    value={forms.deleteFarmhandId}
                    onChange={(event) => updateForm('deleteFarmhandId', event.target.value)}
                  />
                </label>
                <label>
                  <span>Type `DELETE FARMHAND`</span>
                  <input value={forms.deleteConfirm} onChange={(event) => updateForm('deleteConfirm', event.target.value)} />
                </label>
              </ActionForm>

              <ActionForm
                title="Reload world"
                description="Calls upstream `/reload`. Fails closed when clients are connected."
                busy={busyAction === 'Reload world'}
                danger
                onSubmit={(event) => {
                  event.preventDefault();
                  runAction('Reload world', '/api/actions/reload', {
                    method: 'POST',
                    body: JSON.stringify({ confirmText: forms.reloadConfirm }),
                  });
                }}
              >
                <label>
                  <span>Type `RELOAD WORLD`</span>
                  <input value={forms.reloadConfirm} onChange={(event) => updateForm('reloadConfirm', event.target.value)} />
                </label>
              </ActionForm>

              <ActionForm
                title="Create new game"
                description="Wraps upstream `/newgame`. Use only when you intend to replace the current active world."
                busy={busyAction === 'Create new game'}
                danger
                onSubmit={(event) => {
                  event.preventDefault();
                  const rawFarmType = forms.newGameFarmType.trim();
                  const farmType = /^\d+$/.test(rawFarmType) ? Number(rawFarmType) : rawFarmType;
                  runAction('Create new game', '/api/actions/new-game', {
                    method: 'POST',
                    body: JSON.stringify({
                      farmType,
                      farmName: forms.newGameFarmName.trim() || undefined,
                      startingCabins: Number(forms.newGameStartingCabins),
                      cabinStrategy: forms.newGameCabinStrategy,
                      maxPlayers: Number(forms.newGameMaxPlayers),
                      profitMargin: Number(forms.newGameProfitMargin),
                      separateWallets: forms.newGameSeparateWallets,
                      confirmText: forms.newGameConfirm,
                    }),
                  });
                }}
              >
                <label>
                  <span>Farm type (0-6 or custom ID)</span>
                  <input value={forms.newGameFarmType} onChange={(event) => updateForm('newGameFarmType', event.target.value)} />
                </label>
                <label>
                  <span>Farm name</span>
                  <input value={forms.newGameFarmName} onChange={(event) => updateForm('newGameFarmName', event.target.value)} />
                </label>
                <label>
                  <span>Starting cabins</span>
                  <input
                    value={forms.newGameStartingCabins}
                    onChange={(event) => updateForm('newGameStartingCabins', event.target.value)}
                  />
                </label>
                <label>
                  <span>Cabin strategy</span>
                  <select
                    value={forms.newGameCabinStrategy}
                    onChange={(event) => updateForm('newGameCabinStrategy', event.target.value)}
                  >
                    <option value="CabinStack">CabinStack</option>
                    <option value="FarmhouseStack">FarmhouseStack</option>
                    <option value="None">None</option>
                  </select>
                </label>
                <label>
                  <span>Max players</span>
                  <input value={forms.newGameMaxPlayers} onChange={(event) => updateForm('newGameMaxPlayers', event.target.value)} />
                </label>
                <label>
                  <span>Profit margin</span>
                  <input
                    value={forms.newGameProfitMargin}
                    onChange={(event) => updateForm('newGameProfitMargin', event.target.value)}
                  />
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={forms.newGameSeparateWallets}
                    onChange={(event) => updateForm('newGameSeparateWallets', event.target.checked)}
                  />
                  <span>Separate wallets</span>
                </label>
                <label>
                  <span>Type `CREATE NEW GAME`</span>
                  <input value={forms.newGameConfirm} onChange={(event) => updateForm('newGameConfirm', event.target.value)} />
                </label>
              </ActionForm>
            </div>
          </Panel>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="layout-single">
            <Panel title="Chat bridge" subtitle="WebSocket relay stays same-origin; browser never sees the upstream API key">
            <div className="chat-status-row">
              <span className={chatConnected ? 'status-pill status-ok' : 'status-pill status-offline'}>
                {chatConnected ? 'Connected' : 'Disconnected'}
              </span>
              <span className="muted-text">Messages fan out through the backend WebSocket proxy.</span>
            </div>
            <div className="chat-log">
              {chatLines.length === 0 ? <div className="empty-state">No chat traffic yet.</div> : null}
              {chatLines.map((line, index) => (
                <div key={`${line.type}-${index}`} className={`chat-line chat-${line.type}`}>
                  {line.text}
                </div>
              ))}
            </div>
            <form className="chat-form" onSubmit={sendChat}>
              <label>
                <span>Author</span>
                <input value={chatAuthor} onChange={(event) => setChatAuthor(event.target.value)} />
              </label>
              <label className="chat-message-input">
                <span>Message</span>
                <input value={chatMessage} onChange={(event) => setChatMessage(event.target.value)} />
              </label>
              <button type="submit">Send</button>
            </form>
          </Panel>
          </div>
        )}
      </section>
    </div>
  );
}

function Panel(props: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{props.title}</h2>
          {props.subtitle ? <p>{props.subtitle}</p> : null}
        </div>
      </div>
      {props.children}
    </section>
  );
}

function DataList(props: { items: Array<[string, string]> }) {
  return (
    <dl className="data-list">
      {props.items.map(([label, value]) => (
        <div key={label} className="data-list-row">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Table(props: { headers: string[]; rows: string[][]; emptyText: string }) {
  if (props.rows.length === 0) {
    return <div className="empty-state">{props.emptyText}</div>;
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {props.headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row, index) => (
            <tr key={`${row.join('-')}-${index}`}>
              {row.map((value, cellIndex) => (
                <td key={`${index}-${cellIndex}`}>{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Badge(props: { label: string; value: number }) {
  return (
    <div className="badge-card">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function StatBlock(props: { label: string; value: string }) {
  return (
    <div className="stat-block">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function ActionForm(props: {
  title: string;
  description: string;
  busy: boolean;
  danger?: boolean;
  onSubmit: (event: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <form className={`action-form${props.danger ? ' action-form-danger' : ''}`} onSubmit={props.onSubmit}>
      <div className="action-form-header">
        <h3>{props.title}</h3>
        <p>{props.description}</p>
      </div>
      <div className="action-form-body">{props.children}</div>
      <button type="submit" disabled={props.busy}>
        {props.busy ? 'Working…' : props.title}
      </button>
    </form>
  );
}
