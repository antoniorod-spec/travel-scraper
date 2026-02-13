'use client';

import styles from '../styles';

export function StatBadge({ color, value, label }) {
  return (
    <div style={styles.statBadge}>
      <div style={{ ...styles.statDot, background: color, boxShadow: `0 0 8px ${color}66` }} />
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13 }}>
        {value}
      </span>
      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</span>
    </div>
  );
}

export default function Header({ doneCount, pendingCount, errorCount, onToggleSidebar, sidebarOpen }) {
  return (
    <header style={styles.header}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          style={{
            ...styles.mobileMenuBtn,
            display: undefined, // overridden by CSS media query
          }}
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Cerrar panel' : 'Abrir panel'}
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>TS</div>
          <div style={styles.logoText}>
            Travel<span style={{ color: 'var(--accent)' }}>Scraper</span> Pro
          </div>
        </div>
      </div>
      <div style={styles.statsArea}>
        <StatBadge color="var(--success)" value={doneCount} label="scrapeados" />
        <StatBadge color="var(--warning)" value={pendingCount} label="pendientes" />
        <StatBadge color="var(--danger)" value={errorCount} label="errores" />
      </div>
    </header>
  );
}
