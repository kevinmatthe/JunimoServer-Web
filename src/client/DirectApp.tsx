import { useEffect, useMemo, useRef, useState } from 'react';

import {
  assessConnection,
  buildWebSocketUrl,
  clearStoredConnection,
  createEmptyDashboard,
  createNewGame,
  deleteFarmhand,
  fetchDashboard,
  grantAdminRole,
  loadStoredConnection,
  normalizeApiBaseUrl,
  reloadWorld,
  runtimeConfig,
  saveConnection,
  setAuthTimeout,
  setClockSpeed,
  setRendering,
  setTimeOfDay,
  type ConnectionConfig,
  type DashboardData,
} from './directApi';

const DELETE_CONFIRM_TEXT = 'DELETE FARMHAND';
const RELOAD_CONFIRM_TEXT = 'RELOAD WORLD';
const NEW_GAME_CONFIRM_TEXT = 'CREATE NEW GAME';
const CABIN_STRATEGIES = ['CabinStack', 'FarmhouseStack', 'None'] as const;

function fmtTimeOfDay(value: number): string {
  if (!value) {
    return 'Unknown';
  }
  const padded = value.toString().padStart(4, '0');
  const hours = Number.parseInt(padded.slice(0, 2), 10) % 24;
  const minutes = Number.parseInt(padded.slice(2), 10);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function relativeTime(iso: string | null): string {
  if (!iso) {
    return '-';
  }
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

function extractMessage(result: unknown, fallback: string): string {
  if (
    typeof result === 'object' &&
    result !== null &&
    'message' in result &&
    typeof (result as { message?: unknown }).message === 'string' &&
    (result as { message: string }).message.length > 0
  ) {
    return (result as { message: string }).message;
  }
  return fallback;
}

export function DirectApp() {
  const [draftConnection, setDraftConnection] = useState<ConnectionConfig>(() => loadStoredConnection());
  const [activeConnection, setActiveConnection] = useState<ConnectionConfig>(() => loadStoredConnection());
  const [dashboard, setDashboard] = useState<DashboardData>(() => createEmptyDashboard());
  const [loading, setLoading] = useState<boolean>(() =>
    Boolean(normalizeApiBaseUrl(loadStoredConnection().apiBaseUrl)),
  );
  const [includeDiagnostics, setIncludeDiagnostics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [chatConnected, setChatConnected] = useState(false);
  const [chatAuthenticated, setChatAuthenticated] = useState(false);
  const [chatLines, setChatLines] = useState<Array<{ type: string; text: string }>>([]);
  const [chatAuthor, setChatAuthor] = useState('AdminConsole');
  const [chatMessage, setChatMessage] = useState('');
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
    newGameCabinStrategy: 'CabinStack' as (typeof CABIN_STRATEGIES)[number],
    newGameMaxPlayers: '8',
    newGameProfitMargin: '1',
    newGameSeparateWallets: false,
  });
  const chatSocketRef = useRef<WebSocket | null>(null);

  const draftAssessment = useMemo(() => assessConnection(draftConnection), [draftConnection]);
  const activeAssessment = useMemo(() => assessConnection(activeConnection), [activeConnection]);
  const screenshotSrc = useMemo(
    () => screenshotUrl(dashboard.screenshot.base64Png),
    [dashboard.screenshot.base64Png],
  );
  const endpointErrors = useMemo(
    () => Object.entries(dashboard.endpointErrors),
    [dashboard.endpointErrors],
  );

  async function refreshData(
    connection: ConnectionConfig = activeConnection,
    nextIncludeDiagnostics = includeDiagnostics,
  ) {
    const normalizedBaseUrl = normalizeApiBaseUrl(connection.apiBaseUrl);
    if (!normalizedBaseUrl) {
      setDashboard(createEmptyDashboard());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const nextDashboard = await fetchDashboard(connection, nextIncludeDiagnostics);
      setDashboard(nextDashboard);
      setError(null);
    } catch (reason) {
      setDashboard(createEmptyDashboard());
      setError(reason instanceof Error ? reason.message : 'Failed to reach JunimoServer');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initialConnection = loadStoredConnection();
    if (normalizeApiBaseUrl(initialConnection.apiBaseUrl)) {
      void refreshData(initialConnection, includeDiagnostics);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const normalizedBaseUrl = activeAssessment.normalizedBaseUrl;
    if (!normalizedBaseUrl || activeAssessment.mixedContentRisk) {
      if (chatSocketRef.current) {
        chatSocketRef.current.close();
        chatSocketRef.current = null;
      }
      setChatConnected(false);
      setChatAuthenticated(false);
      return;
    }

    const socket = new WebSocket(buildWebSocketUrl(normalizedBaseUrl));
    chatSocketRef.current = socket;
    setChatAuthenticated(false);

    socket.addEventListener('open', () => {
      setChatConnected(true);
      setChatLines((current) => [
        ...current.slice(-49),
        { type: 'system', text: `WebSocket connected to ${normalizedBaseUrl}` },
      ]);
      const apiKey = activeConnection.apiKey.trim();
      if (!apiKey) {
        setChatAuthenticated(true);
        return;
      }
      socket.send(
        JSON.stringify({
          type: 'auth',
          payload: { token: apiKey },
        }),
      );
    });

    socket.addEventListener('close', () => {
      setChatConnected(false);
      setChatAuthenticated(false);
      setChatLines((current) => [
        ...current.slice(-49),
        { type: 'system', text: 'WebSocket disconnected' },
      ]);
    });

    socket.addEventListener('error', () => {
      setChatLines((current) => [
        ...current.slice(-49),
        { type: 'error', text: 'WebSocket connection failed' },
      ]);
    });

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as {
          type?: string;
          payload?: { playerName?: string; message?: string; error?: string };
        };
        if (payload.type === 'auth_success') {
          setChatAuthenticated(true);
          setChatLines((current) => [
            ...current.slice(-49),
            { type: 'system', text: 'WebSocket authenticated' },
          ]);
          return;
        }
        if (payload.type === 'auth_failed') {
          setChatAuthenticated(false);
          setChatLines((current) => [
            ...current.slice(-49),
            { type: 'error', text: payload.payload?.error ?? 'WebSocket auth failed' },
          ]);
          return;
        }
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
        if (payload.type === 'pong') {
          return;
        }
        if (payload.type === 'error') {
          setChatLines((current) => [
            ...current.slice(-49),
            { type: 'error', text: payload.payload?.error ?? 'Unknown WebSocket error' },
          ]);
          return;
        }
      } catch {
        setChatLines((current) => [
          ...current.slice(-49),
          { type: 'system', text: String(event.data) },
        ]);
      }
    });

    return () => {
      socket.close();
    };
  }, [
    activeAssessment.mixedContentRisk,
    activeAssessment.normalizedBaseUrl,
    activeConnection.apiKey,
  ]);

  function updateDraft<K extends keyof ConnectionConfig>(key: K, value: ConnectionConfig[K]) {
    setDraftConnection((current) => ({ ...current, [key]: value }));
  }

  function updateForm<K extends keyof typeof forms>(key: K, value: (typeof forms)[K]) {
    setForms((current) => ({ ...current, [key]: value }));
  }

  async function applyConnection(event: React.FormEvent) {
    event.preventDefault();
    const nextConnection: ConnectionConfig = {
      apiBaseUrl: normalizeApiBaseUrl(draftConnection.apiBaseUrl),
      apiKey: draftConnection.apiKey.trim(),
      rememberApiKey: draftConnection.rememberApiKey,
    };

    saveConnection(nextConnection);
    setDraftConnection(nextConnection);
    setActiveConnection(nextConnection);
    setError(null);
    setActionMessage(
      nextConnection.apiBaseUrl
        ? `Browser-direct target saved: ${nextConnection.apiBaseUrl}`
        : 'Connection cleared',
    );

    if (!nextConnection.apiBaseUrl) {
      setDashboard(createEmptyDashboard());
      setLoading(false);
      return;
    }

    await refreshData(nextConnection, includeDiagnostics);
  }

  async function resetConnection() {
    clearStoredConnection();
    const nextConnection = loadStoredConnection();
    setDraftConnection(nextConnection);
    setActiveConnection(nextConnection);
    setDashboard(createEmptyDashboard());
    setChatLines([]);
    setError(null);
    setActionMessage('Stored browser connection cleared');
    if (normalizeApiBaseUrl(nextConnection.apiBaseUrl)) {
      await refreshData(nextConnection, includeDiagnostics);
    } else {
      setLoading(false);
    }
  }

  async function runAction<T>(label: string, operation: () => Promise<T>) {
    if (!activeAssessment.normalizedBaseUrl) {
      setError('Configure an API address first.');
      return;
    }
    setBusyAction(label);
    setError(null);
    setActionMessage(null);
    try {
      const result = await operation();
      setActionMessage(extractMessage(result, `${label} completed`));
      await refreshData(activeConnection, includeDiagnostics);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `${label} failed`);
    } finally {
      setBusyAction(null);
    }
  }

  async function toggleDiagnostics(next: boolean) {
    setIncludeDiagnostics(next);
    if (!activeAssessment.normalizedBaseUrl) {
      return;
    }
    await refreshData(activeConnection, next);
  }

  function sendChat(event: React.FormEvent) {
    event.preventDefault();
    const socket = chatSocketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError('WebSocket is not connected');
      return;
    }

    const trimmedAuthor = chatAuthor.trim();
    const trimmedMessage = chatMessage.trim();
    if (!trimmedAuthor || !trimmedMessage) {
      return;
    }

    if (activeConnection.apiKey.trim() && !chatAuthenticated) {
      setError('WebSocket auth is not ready yet');
      return;
    }

    socket.send(
      JSON.stringify({
        type: 'chat_send',
        payload: {
          author: trimmedAuthor,
          message: trimmedMessage,
        },
      }),
    );
    setChatLines((current) => [
      ...current.slice(-49),
      { type: 'system', text: `Sent as ${trimmedAuthor}` },
    ]);
    setChatMessage('');
  }

  const heroTitle =
    dashboard.status.farmName ||
    (activeAssessment.normalizedBaseUrl ? 'JunimoServer direct console' : 'JunimoServer browser-direct console');

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Direct browser mode</span>
          <h1>{heroTitle}</h1>
          <p>
            Fill a JunimoServer API address and the browser will call it directly. This is the simplest
            mode, but cross-origin requests with `Authorization: Bearer ...` depend on the upstream API’s
            CORS behavior.
          </p>
        </div>
        <div className="hero-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={!activeAssessment.normalizedBaseUrl || loading}
            onClick={() => {
              void refreshData(activeConnection, includeDiagnostics);
            }}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <a
            className="secondary-button button-link"
            href={
              runtimeConfig.documentationUrl ??
              'https://stardew-valley-dedicated-server.github.io/server/features/rest-api.html'
            }
            target="_blank"
            rel="noreferrer"
          >
            API docs
          </a>
        </div>
      </header>

      <Panel
        title="Connection"
        subtitle="Runtime browser config. API key is session-only by default unless you explicitly choose to remember it."
      >
        <form className="connection-grid" onSubmit={applyConnection}>
          <label className="connection-field connection-field-wide">
            <span>API base URL</span>
            <input
              value={draftConnection.apiBaseUrl}
              onChange={(event) => updateDraft('apiBaseUrl', event.target.value)}
              placeholder={
                runtimeConfig.defaultApiBaseUrl
                  ? `Default: ${runtimeConfig.defaultApiBaseUrl}`
                  : 'http://127.0.0.1:8080'
              }
            />
          </label>
          <label className="connection-field connection-field-wide">
            <span>API key</span>
            <input
              type="password"
              value={draftConnection.apiKey}
              onChange={(event) => updateDraft('apiKey', event.target.value)}
              placeholder="Optional only if upstream API_KEY is unset"
            />
          </label>
          <label className="checkbox-row connection-checkbox">
            <input
              type="checkbox"
              checked={draftConnection.rememberApiKey}
              onChange={(event) => updateDraft('rememberApiKey', event.target.checked)}
            />
            <span>Remember API key in local storage</span>
          </label>
          <div className="connection-actions">
            <button type="submit">Save and connect</button>
            <button className="secondary-button" type="button" onClick={() => void resetConnection()}>
              Clear stored config
            </button>
          </div>
        </form>

        <div className="connection-summary">
          <InfoChip
            label="Current target"
            value={activeAssessment.normalizedBaseUrl || 'Not configured'}
          />
          <InfoChip
            label="Mode"
            value={
              activeAssessment.normalizedBaseUrl
                ? activeAssessment.sameOrigin
                  ? 'Same-origin direct'
                  : 'Cross-origin direct'
                : 'No connection'
            }
          />
          <InfoChip
            label="API key storage"
            value={
              activeConnection.apiKey
                ? activeConnection.rememberApiKey
                  ? 'localStorage'
                  : 'sessionStorage'
                : 'No key'
            }
          />
        </div>

        <div className="assessment-grid">
          <MessageCard
            tone="warn"
            title="Warnings"
            items={
              draftAssessment.warnings.length > 0
                ? draftAssessment.warnings
                : ['No immediate browser-side warning detected for the current draft connection.']
            }
          />
          <MessageCard
            tone="note"
            title="Notes"
            items={[
              ...draftAssessment.notes,
              'Direct mode keeps deployment simple because the container only serves static assets.',
              'WebSocket chat can still work cross-origin because auth happens in-band after connect.',
            ]}
          />
        </div>
      </Panel>

      {loading ? <div className="notice notice-info">Refreshing data from {activeAssessment.normalizedBaseUrl}…</div> : null}
      {error ? <div className="notice notice-error">{error}</div> : null}
      {actionMessage ? <div className="notice notice-success">{actionMessage}</div> : null}
      {activeAssessment.crossOrigin && activeAssessment.hasApiKey ? (
        <div className="notice notice-warn">
          Cross-origin direct mode with an API key will likely fail for protected HTTP endpoints because the
          browser must send a CORS preflight for `Authorization`.
        </div>
      ) : null}

      <section className="metric-grid">
        <article className={metricTone(Boolean(dashboard.status.isOnline))}>
          <span className="metric-label">Server</span>
          <strong>{dashboard.status.isOnline ? 'Online' : 'Offline'}</strong>
          <small>{dashboard.status.serverVersion}</small>
        </article>
        <article className={metricTone(Boolean(dashboard.status.isReady), Boolean(dashboard.status.isOnline))}>
          <span className="metric-label">Ready state</span>
          <strong>{dashboard.status.isReady ? 'Ready' : 'Blocked'}</strong>
          <small>{dashboard.status.isPaused ? 'Clock paused' : 'Clock running'}</small>
        </article>
        <article className={metricTone(dashboard.players.players.length < dashboard.status.maxPlayers, false)}>
          <span className="metric-label">Players</span>
          <strong>
            {dashboard.players.players.length} / {dashboard.status.maxPlayers}
          </strong>
          <small>Connected now</small>
        </article>
        <article className={metricTone(!dashboard.health.isFrozen, dashboard.health.status === 'degraded')}>
          <span className="metric-label">Health</span>
          <strong>{dashboard.health.status || 'unknown'}</strong>
          <small>{dashboard.health.lastTickMs ?? 0} ms since last tick</small>
        </article>
        <article className="metric metric-neutral">
          <span className="metric-label">Game time</span>
          <strong>{fmtTimeOfDay(dashboard.status.timeOfDay)}</strong>
          <small>
            {dashboard.status.season} day {dashboard.status.day}, year {dashboard.status.year}
          </small>
        </article>
        <article className="metric metric-neutral">
          <span className="metric-label">Render rate</span>
          <strong>{dashboard.rendering.fps} FPS</strong>
          <small>{dashboard.stats.fps.toFixed(1)} measured host FPS</small>
        </article>
      </section>

      {endpointErrors.length > 0 ? (
        <Panel
          title="Partial request failures"
          subtitle="The dashboard renders with partial data. These endpoints failed on the last refresh."
        >
          <Table
            headers={['Endpoint', 'Error']}
            rows={endpointErrors.map(([endpoint, message]) => [endpoint, message])}
            emptyText="No endpoint failures"
          />
        </Panel>
      ) : null}

      <section className="layout-grid">
        <div className="column">
          <Panel title="Overview" subtitle="Current state and configured runtime behavior">
            <DataList
              items={[
                ['Farm', dashboard.status.farmName || '-'],
                ['Farm type', String(dashboard.status.farmTypeKey || '-')],
                [
                  'Last load',
                  dashboard.lastLoadedAt
                    ? `${dashboard.lastLoadedAt} (${relativeTime(dashboard.lastLoadedAt)})`
                    : 'Not loaded',
                ],
                ['Invite code', dashboard.inviteCode.inviteCode ?? dashboard.inviteCode.error ?? 'Unavailable'],
                ['Auth protection', dashboard.auth.enabled ? 'Enabled' : 'Disabled'],
                ['Auth timeout', `${dashboard.auth.timeoutSeconds}s`],
                ['Cabin strategy', dashboard.cabins.strategy || '-'],
                ['Separate wallets', dashboard.settings.server.separateWallets ? 'Yes' : 'No'],
              ]}
            />
          </Panel>

          <Panel title="Players" subtitle="Connected players and known farmhands">
            <Table
              headers={['Name', 'ID', 'Online']}
              rows={dashboard.players.players.map((player) => [
                player.name,
                String(player.id),
                player.isOnline ? 'Yes' : 'No',
              ])}
              emptyText="No connected players"
            />
            <div className="table-spacer" />
            <Table
              headers={['Farmhand', 'ID', 'Customized']}
              rows={dashboard.farmhands.farmhands.map((farmhand) => [
                farmhand.name,
                String(farmhand.id),
                farmhand.isCustomized ? 'Yes' : 'No',
              ])}
              emptyText="No farmhand slots found"
            />
          </Panel>

          <Panel title="Cabins" subtitle="Assignment and hidden-stack state">
            <div className="stats-row">
              <Badge label="Total" value={dashboard.cabins.totalCount} />
              <Badge label="Assigned" value={dashboard.cabins.assignedCount} />
              <Badge label="Available" value={dashboard.cabins.availableCount} />
            </div>
            <Table
              headers={['Owner', 'Type', 'Tile', 'Assigned', 'Hidden']}
              rows={dashboard.cabins.cabins.map((cabin) => [
                cabin.ownerName || 'Unassigned',
                cabin.type,
                `${cabin.tileX}, ${cabin.tileY}`,
                cabin.isAssigned ? 'Yes' : 'No',
                cabin.isHidden ? 'Yes' : 'No',
              ])}
              emptyText="No cabins"
            />
          </Panel>

          <Panel title="Performance" subtitle="Host metrics from /stats and /health">
            <div className="stats-grid">
              <StatBlock label="TPS" value={dashboard.stats.tps.toFixed(1)} />
              <StatBlock label="Target TPS" value={String(dashboard.stats.targetTps)} />
              <StatBlock label="Avg tick" value={`${dashboard.stats.avgTickMs.toFixed(2)} ms`} />
              <StatBlock label="Memory" value={`${dashboard.stats.memoryMb.toFixed(1)} MB`} />
              <StatBlock label="Pending actions" value={String(dashboard.health.pendingActions)} />
              <StatBlock label="Game-thread wait" value={`${dashboard.stats.gameThreadWaitMs.toFixed(2)} ms`} />
            </div>
            <div className="stats-grid compact">
              <StatBlock label="GC Gen0" value={String(dashboard.stats.gcGen0)} />
              <StatBlock label="GC Gen1" value={String(dashboard.stats.gcGen1)} />
              <StatBlock label="GC Gen2" value={String(dashboard.stats.gcGen2)} />
              <StatBlock label="Tick count" value={String(dashboard.health.tickCount)} />
            </div>
          </Panel>
        </div>

        <div className="column">
          <Panel title="Controls" subtitle="Runtime operations sent directly from the browser">
            <div className="form-grid">
              <ActionForm
                title="Auth timeout"
                description="Update password-protection timeout in seconds."
                busy={busyAction === 'Auth timeout'}
                onSubmit={(event) => {
                  event.preventDefault();
                  void runAction('Auth timeout', () =>
                    setAuthTimeout(activeConnection, { value: Number(forms.authTimeout) }),
                  );
                }}
              >
                <label>
                  <span>Seconds</span>
                  <input
                    value={forms.authTimeout}
                    onChange={(event) => updateForm('authTimeout', event.target.value)}
                  />
                </label>
              </ActionForm>

              <ActionForm
                title="Render rate"
                description="Set `/rendering?fps=`. `0` disables rendering."
                busy={busyAction === 'Render rate'}
                onSubmit={(event) => {
                  event.preventDefault();
                  void runAction('Render rate', () =>
                    setRendering(activeConnection, { fps: Number(forms.renderingFps) }),
                  );
                }}
              >
                <label>
                  <span>FPS</span>
                  <input
                    value={forms.renderingFps}
                    onChange={(event) => updateForm('renderingFps', event.target.value)}
                  />
                </label>
              </ActionForm>

              <ActionForm
                title="Set game time"
                description="Valid upstream range is `600` to `2600`."
                busy={busyAction === 'Set game time'}
                onSubmit={(event) => {
                  event.preventDefault();
                  void runAction('Set game time', () =>
                    setTimeOfDay(activeConnection, { value: Number(forms.timeOfDay) }),
                  );
                }}
              >
                <label>
                  <span>Time value</span>
                  <input
                    value={forms.timeOfDay}
                    onChange={(event) => updateForm('timeOfDay', event.target.value)}
                  />
                </label>
              </ActionForm>

              <ActionForm
                title="Clock speed"
                description="Set `/clock-speed?multiplier=` to accelerate or slow the day."
                busy={busyAction === 'Clock speed'}
                onSubmit={(event) => {
                  event.preventDefault();
                  void runAction('Clock speed', () =>
                    setClockSpeed(activeConnection, { multiplier: Number(forms.clockSpeed) }),
                  );
                }}
              >
                <label>
                  <span>Multiplier</span>
                  <input
                    value={forms.clockSpeed}
                    onChange={(event) => updateForm('clockSpeed', event.target.value)}
                  />
                </label>
              </ActionForm>

              <ActionForm
                title="Grant admin"
                description="Provide exactly one of player name or player ID."
                busy={busyAction === 'Grant admin'}
                onSubmit={(event) => {
                  event.preventDefault();
                  void runAction('Grant admin', () =>
                    grantAdminRole(
                      activeConnection,
                      forms.grantAdminId.trim()
                        ? { playerId: Number(forms.grantAdminId) }
                        : { name: forms.grantAdminName.trim() },
                    ),
                  );
                }}
              >
                <label>
                  <span>Player name</span>
                  <input
                    value={forms.grantAdminName}
                    onChange={(event) => updateForm('grantAdminName', event.target.value)}
                  />
                </label>
                <label>
                  <span>Player ID</span>
                  <input
                    value={forms.grantAdminId}
                    onChange={(event) => updateForm('grantAdminId', event.target.value)}
                  />
                </label>
              </ActionForm>
            </div>
          </Panel>

          <Panel
            title="Live screenshot"
            subtitle="Direct request to `/screenshot`. Cross-origin mode with API key may be blocked by browser CORS."
          >
            {screenshotSrc ? (
              <img className="screenshot-frame" src={screenshotSrc} alt="JunimoServer screenshot" />
            ) : (
              <div className="empty-state">
                Screenshot unavailable: {dashboard.screenshot.error ?? 'No image data'}
              </div>
            )}
          </Panel>

          <Panel
            title="Direct WebSocket chat"
            subtitle="Auth is sent as a WebSocket message after connect, so chat can still work in cases where HTTP direct mode is blocked by CORS."
          >
            <div className="chat-status-row">
              <span className={chatConnected ? 'status-pill status-ok' : 'status-pill status-offline'}>
                {chatConnected ? 'Socket open' : 'Socket closed'}
              </span>
              <span className={chatAuthenticated ? 'status-pill status-ok' : 'status-pill status-offline'}>
                {chatAuthenticated ? 'Auth ready' : activeConnection.apiKey ? 'Auth pending' : 'No auth'}
              </span>
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

        <div className="column">
          <Panel title="Diagnostics" subtitle="Opt-in because `/diagnostics/state` is larger and mostly test-facing">
            <div className="toggle-row">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={includeDiagnostics}
                  onChange={(event) => {
                    void toggleDiagnostics(event.target.checked);
                  }}
                />
                <span>Load `/diagnostics/state` on refresh</span>
              </label>
            </div>
            {dashboard.diagnostics ? (
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
                Diagnostics are off by default. Enable them if you need live engine-state debugging.
              </div>
            )}
          </Panel>

          <Panel
            title="Danger zone"
            subtitle="These actions still require explicit confirmation text on the frontend, even in direct browser mode."
          >
            <div className="danger-grid">
              <ActionForm
                title="Delete farmhand"
                description="Upstream requires either `name` or `playerId`. This cannot be undone."
                busy={busyAction === 'Delete farmhand'}
                danger
                onSubmit={(event) => {
                  event.preventDefault();
                  void runAction('Delete farmhand', () =>
                    deleteFarmhand(
                      activeConnection,
                      forms.deleteFarmhandId.trim()
                        ? {
                            playerId: Number(forms.deleteFarmhandId),
                            confirmText: DELETE_CONFIRM_TEXT,
                          }
                        : {
                            name: forms.deleteFarmhandName.trim(),
                            confirmText: DELETE_CONFIRM_TEXT,
                          },
                    ),
                  );
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
                  <span>Type `{DELETE_CONFIRM_TEXT}`</span>
                  <input
                    value={forms.deleteConfirm}
                    onChange={(event) => updateForm('deleteConfirm', event.target.value)}
                  />
                </label>
              </ActionForm>

              <ActionForm
                title="Reload world"
                description="Calls upstream `/reload`. Fails closed when clients are connected."
                busy={busyAction === 'Reload world'}
                danger
                onSubmit={(event) => {
                  event.preventDefault();
                  if (forms.reloadConfirm !== RELOAD_CONFIRM_TEXT) {
                    setError(`Type exactly "${RELOAD_CONFIRM_TEXT}" before reloading.`);
                    return;
                  }
                  void runAction('Reload world', () => reloadWorld(activeConnection));
                }}
              >
                <label>
                  <span>Type `{RELOAD_CONFIRM_TEXT}`</span>
                  <input
                    value={forms.reloadConfirm}
                    onChange={(event) => updateForm('reloadConfirm', event.target.value)}
                  />
                </label>
              </ActionForm>

              <ActionForm
                title="Create new game"
                description="Wraps upstream `/newgame`. Use only when you intend to replace the active world."
                busy={busyAction === 'Create new game'}
                danger
                onSubmit={(event) => {
                  event.preventDefault();
                  const rawFarmType = forms.newGameFarmType.trim();
                  const farmType = /^\d+$/.test(rawFarmType) ? Number(rawFarmType) : rawFarmType;
                  void runAction('Create new game', () =>
                    createNewGame(activeConnection, {
                      farmType,
                      farmName: forms.newGameFarmName.trim() || undefined,
                      startingCabins: Number(forms.newGameStartingCabins),
                      cabinStrategy: forms.newGameCabinStrategy,
                      maxPlayers: Number(forms.newGameMaxPlayers),
                      profitMargin: Number(forms.newGameProfitMargin),
                      separateWallets: forms.newGameSeparateWallets,
                      confirmText: NEW_GAME_CONFIRM_TEXT,
                    }),
                  );
                }}
              >
                <label>
                  <span>Farm type (0-6 or custom ID)</span>
                  <input
                    value={forms.newGameFarmType}
                    onChange={(event) => updateForm('newGameFarmType', event.target.value)}
                  />
                </label>
                <label>
                  <span>Farm name</span>
                  <input
                    value={forms.newGameFarmName}
                    onChange={(event) => updateForm('newGameFarmName', event.target.value)}
                  />
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
                    onChange={(event) =>
                      updateForm(
                        'newGameCabinStrategy',
                        event.target.value as (typeof CABIN_STRATEGIES)[number],
                      )
                    }
                  >
                    {CABIN_STRATEGIES.map((strategy) => (
                      <option key={strategy} value={strategy}>
                        {strategy}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Max players</span>
                  <input
                    value={forms.newGameMaxPlayers}
                    onChange={(event) => updateForm('newGameMaxPlayers', event.target.value)}
                  />
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
                  <span>Type `{NEW_GAME_CONFIRM_TEXT}`</span>
                  <input
                    value={forms.newGameConfirm}
                    onChange={(event) => updateForm('newGameConfirm', event.target.value)}
                  />
                </label>
              </ActionForm>
            </div>
          </Panel>
        </div>
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

function InfoChip(props: { label: string; value: string }) {
  return (
    <div className="info-chip">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function MessageCard(props: { tone: 'warn' | 'note'; title: string; items: string[] }) {
  return (
    <div className={`message-card message-card-${props.tone}`}>
      <h3>{props.title}</h3>
      <ul>
        {props.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
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
