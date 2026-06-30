import React, { ReactNode } from 'react';
import { Sparkline } from './Sparkline';

interface LayoutProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: Array<{ id: string; label: string; icon?: string }>;
  headerMetrics: Array<{ label: string; value: string | ReactNode; tone?: 'ok' | 'warn' | 'bad' | 'neutral' }>;
  performanceHistory: {
    tps: number[];
    memory: number[];
    avgTick: number[];
  };
  children: ReactNode;
  rightAction?: ReactNode;
}

export function AppLayout({
  activeTab,
  onTabChange,
  tabs,
  headerMetrics,
  performanceHistory,
  children,
  rightAction
}: LayoutProps) {
  const latestTps = performanceHistory.tps.length > 0 ? performanceHistory.tps[performanceHistory.tps.length - 1].toFixed(1) : '-';
  const latestMem = performanceHistory.memory.length > 0 ? performanceHistory.memory[performanceHistory.memory.length - 1].toFixed(1) : '-';
  const latestTick = performanceHistory.avgTick.length > 0 ? performanceHistory.avgTick[performanceHistory.avgTick.length - 1].toFixed(2) : '-';

  return (
    <div className="saas-layout">
      <aside className="saas-sidebar">
        <div className="saas-sidebar-brand">
          <h1>Junimo UI</h1>
        </div>
        <nav className="saas-sidebar-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`saas-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.icon && <span className="nav-icon">{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="saas-content-wrapper">
        <header className="saas-header">
          <div className="saas-header-metrics">
            {headerMetrics.map((metric, i) => (
              <div key={i} className={`saas-header-metric tone-${metric.tone || 'neutral'}`}>
                <span className="label">{metric.label}</span>
                <span className="value">{metric.value}</span>
              </div>
            ))}
          </div>
          <div className="saas-header-actions">
            {rightAction}
          </div>
        </header>

        <main className="saas-main">
          {children}
        </main>

        <footer className="saas-statusbar">
          <div className="saas-status-item">
            <span className="label">TPS</span>
            <span className="value">{latestTps}</span>
            <Sparkline data={performanceHistory.tps} color="var(--accent)" />
          </div>
          <div className="saas-status-item">
            <span className="label">Mem</span>
            <span className="value">{latestMem} MB</span>
            <Sparkline data={performanceHistory.memory} color="var(--warn)" />
          </div>
          <div className="saas-status-item">
            <span className="label">Avg Tick</span>
            <span className="value">{latestTick} ms</span>
            <Sparkline data={performanceHistory.avgTick} color="var(--text)" />
          </div>
        </footer>
      </div>
    </div>
  );
}
