'use client';

export default function Notification({ msg, type }) {
  const colors = {
    success: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)', color: 'var(--success)', icon: '✓' },
    error: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', color: 'var(--danger)', icon: '✕' },
    warning: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', color: 'var(--warning)', icon: '⚠' },
    info: { bg: 'var(--accent-dim)', border: 'rgba(13,223,186,0.4)', color: 'var(--accent)', icon: 'ℹ' },
  };
  const c = colors[type] || colors.info;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        padding: '14px 24px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 500,
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
        animation: 'notifIn 0.3s ease',
      }}
    >
      <span>{c.icon}</span> {msg}
    </div>
  );
}
