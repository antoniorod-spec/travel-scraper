'use client';

import { useState, useCallback } from 'react';
import styles from '../styles';

function StatusDot({ status }) {
  const map = {
    pending: { bg: 'var(--accent-dim)', color: 'var(--text-muted)', text: '●' },
    active: { bg: 'var(--accent-dim)', color: 'var(--accent)', text: '●', animate: true },
    done: { bg: 'rgba(34,197,94,0.2)', color: 'var(--success)', text: '✓' },
    error: { bg: 'rgba(239,68,68,0.2)', color: 'var(--danger)', text: '✕' },
  };
  const s = map[status] || map.pending;
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: s.bg,
        color: s.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        flexShrink: 0,
        animation: s.animate ? 'pulse 1.5s infinite' : 'none',
      }}
    >
      {s.text}
    </div>
  );
}

export default function Sidebar({
  urls, setUrls, queue, isProcessing, progress, pct,
  urlCount, concurrency, setConcurrency,
  startScraping, stopScraping, clearAll,
  sidebarOpen,
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  // ---- Drag & Drop ----
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter((f) => {
      const ext = f.name.toLowerCase().split('.').pop();
      return ext === 'txt' || ext === 'csv';
    });

    if (validFiles.length === 0) {
      // Maybe it's just text being dragged
      const text = e.dataTransfer.getData('text/plain');
      if (text) {
        setUrls((prev) => (prev ? prev + '\n' + text : text));
      }
      return;
    }

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target.result;
        // Extract URLs from file content
        const lines = content
          .split(/[\n\r]+/)
          .map((l) => l.trim())
          .filter((l) => l.startsWith('http'));
        if (lines.length > 0) {
          setUrls((prev) => (prev ? prev + '\n' + lines.join('\n') : lines.join('\n')));
        }
      };
      reader.readAsText(file);
    });
  }, [setUrls]);

  const sidebarStyle = {
    ...styles.sidebar,
  };

  return (
    <aside style={sidebarStyle} className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div style={styles.urlInputArea}>
        <h3 style={styles.sectionTitle}>
          URLs de circuitos
          <span style={styles.urlCount}>{urlCount}</span>
        </h3>
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <textarea
            style={{
              ...styles.textarea,
              ...(isDragOver ? styles.textareaDragOver : {}),
            }}
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            placeholder={`Pega aquí las URLs (una por línea)\n\nArrastra un archivo .txt o .csv con URLs\n\nEjemplo:\nhttps://kerala.viajes/grandes-viajes/europa/turquia/circuitos/circuito-clasico/turquia-estambul-ankara-capadocia-pamukkale-y-esmirna-9-dias.html`}
            disabled={isProcessing}
          />
          {isDragOver && (
            <div style={styles.dragOverlay}>
              📄 Suelta el archivo aquí
            </div>
          )}
        </div>
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div style={styles.queueSection}>
          <h3 style={{ ...styles.sectionTitle, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
            Cola de procesamiento
          </h3>
          <div style={styles.queueList}>
            {queue.map((q, i) => (
              <div key={i} style={styles.queueItem}>
                <StatusDot status={q.status} />
                <span
                  style={{
                    ...styles.queueUrl,
                    color: q.status === 'active' ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                  title={q.url}
                >
                  {q.url}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress */}
      {isProcessing && (
        <div style={styles.progressSection}>
          <div style={styles.progressInfo}>
            <span>Procesando {progress.current} de {progress.total}...</span>
            <span>{pct}%</span>
          </div>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={styles.sidebarActions}>
        <div style={styles.concurrencySelector}>
          <span>Concurrencia:</span>
          <select
            style={styles.concurrencySelect}
            value={concurrency}
            onChange={(e) => setConcurrency(Number(e.target.value))}
            disabled={isProcessing}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} simultáneo{n !== 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>
        {isProcessing ? (
          <button style={{ ...styles.btn, ...styles.btnDanger, flex: 1 }} onClick={stopScraping}>
            ■ Detener
          </button>
        ) : (
          <button style={{ ...styles.btn, ...styles.btnPrimary, flex: 1 }} onClick={() => startScraping()}>
            ▶ Iniciar Scraping
          </button>
        )}
        <button
          style={{ ...styles.btn, ...styles.btnSecondary, flex: 1 }}
          onClick={clearAll}
          disabled={isProcessing}
        >
          ✕ Limpiar
        </button>
      </div>
    </aside>
  );
}
