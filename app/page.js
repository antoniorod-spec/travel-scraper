'use client';

import { useState, useRef, useCallback } from 'react';

// ============================
// MAIN APP COMPONENT
// ============================
export default function Home() {
  const [urls, setUrls] = useState('');
  const [queue, setQueue] = useState([]); // { url, status: 'pending'|'active'|'done'|'error', data?, error? }
  const [results, setResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState('cards');
  const [detailIndex, setDetailIndex] = useState(null);
  const [notification, setNotification] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const abortRef = useRef(false);

  const urlCount = urls.trim() ? urls.trim().split('\n').filter((l) => l.trim()).length : 0;
  const doneCount = queue.filter((q) => q.status === 'done').length;
  const errorCount = queue.filter((q) => q.status === 'error').length;
  const pendingCount = queue.filter((q) => q.status === 'pending' || q.status === 'active').length;

  // ---- Notify ----
  const notify = useCallback((msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // ---- Start scraping ----
  const startScraping = async () => {
    const lines = urls
      .trim()
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 10);

    if (lines.length === 0) {
      notify('Introduce al menos una URL válida', 'error');
      return;
    }

    abortRef.current = false;
    setIsProcessing(true);
    setResults([]);
    setProgress({ current: 0, total: lines.length });

    const initialQueue = lines.map((url) => ({ url, status: 'pending' }));
    setQueue(initialQueue);

    const newResults = [];

    for (let i = 0; i < lines.length; i++) {
      if (abortRef.current) break;

      // Mark active
      setQueue((prev) =>
        prev.map((q, idx) => (idx === i ? { ...q, status: 'active' } : q))
      );

      try {
        const res = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: lines[i] }),
        });

        const json = await res.json();

        if (json.success) {
          newResults.push(json.data);
          setQueue((prev) =>
            prev.map((q, idx) =>
              idx === i ? { ...q, status: 'done', data: json.data } : q
            )
          );
        } else {
          newResults.push({ url: lines[i], error: json.error, metaTitle: 'Error' });
          setQueue((prev) =>
            prev.map((q, idx) =>
              idx === i ? { ...q, status: 'error', error: json.error } : q
            )
          );
        }
      } catch (err) {
        newResults.push({ url: lines[i], error: err.message, metaTitle: 'Error' });
        setQueue((prev) =>
          prev.map((q, idx) =>
            idx === i ? { ...q, status: 'error', error: err.message } : q
          )
        );
      }

      setProgress({ current: i + 1, total: lines.length });
      setResults([...newResults]);

      // Delay between requests
      if (i < lines.length - 1 && !abortRef.current) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    setIsProcessing(false);
    const successCount = newResults.filter((r) => !r.error).length;
    const failCount = newResults.filter((r) => r.error).length;
    notify(
      `Completado: ${successCount} éxito${successCount !== 1 ? 's' : ''}, ${failCount} error${failCount !== 1 ? 'es' : ''}`,
      failCount > 0 ? 'warning' : 'success'
    );
  };

  const stopScraping = () => {
    abortRef.current = true;
    notify('Scraping detenido', 'warning');
  };

  // ---- Export Excel ----
  const exportExcel = async () => {
    const valid = results.filter((r) => !r.error);
    if (valid.length === 0) {
      notify('No hay datos para exportar', 'error');
      return;
    }

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: valid }),
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scraping_traveltool_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      notify('Excel descargado correctamente', 'success');
    } catch (err) {
      notify('Error al exportar: ' + err.message, 'error');
    }
  };

  // ---- Export CSV (client-side) ----
  const exportCSV = () => {
    const valid = results.filter((r) => !r.error);
    if (valid.length === 0) {
      notify('No hay datos para exportar', 'error');
      return;
    }

    const maxDays = Math.max(
      ...valid.map((d) =>
        Math.max(d.itineraryDays?.length || 0, d.itineraryTexts?.length || 0, d.days || 0)
      )
    );

    const headers = [
      'url','titulo','meta description','países visitados','número de días',
      'Fecha 1','visitando','imagen principal','imagen lateral pequeña',
      'origen','categoría 1','categoría 2','precio','categoría 3','titulo',
      'descripción larga','Fecha 1','tipo de circuito','el viaje incluye',
      'excursiones incluidas','excursiones opcionales','hoteles previstos',
      'pie de tabla de precios','descripción corta','configuración regional',
      'promociones','proveedor','catalogo origenes','origen inicial',
    ];

    for (let i = 1; i <= maxDays; i++) headers.push(`día ${i}`);
    for (let i = 1; i <= maxDays; i++) headers.push(`itinerario${i}`);

    const sanitizeCsvCell = (value) => {
      const str = String(value || '');
      return /^[=+\-@]/.test(str) ? `'${str}` : str;
    };

    let csv = headers.map((h) => `"${h}"`).join(',') + '\n';

    valid.forEach((d) => {
      const row = [
        d.url, d.metaTitle, d.metaDescription, d.countries, d.days,
        d.travelDates, d.cities, d.imageBanner, d.imageSmall, d.origins,
        d.category1, d.category2, d.price, '', d.title, d.metaDescription,
        d.dateText, d.circuitType, d.tripIncludes, d.excursionsIncluded,
        d.excursionsOptional, d.hotels, d.priceFooter, d.shortDescription,
        d.regionalConfig, d.promotions, d.provider, d.catalogOrigins, '',
      ];
      for (let i = 0; i < maxDays; i++) row.push(d.itineraryDays?.[i] || '');
      for (let i = 0; i < maxDays; i++) row.push(d.itineraryTexts?.[i] || '');

      csv += row
        .map((v) => `"${sanitizeCsvCell(v).replace(/"/g, '""')}"`)
        .join(',') + '\n';
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `scraping_traveltool_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    notify('CSV descargado correctamente', 'success');
  };

  const clearAll = () => {
    setUrls('');
    setQueue([]);
    setResults([]);
    setProgress({ current: 0, total: 0 });
  };

  const validResults = results.filter((r) => !r.error);
  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <>
      {/* ===== HEADER ===== */}
      <header style={styles.header}>
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>TS</div>
          <div style={styles.logoText}>
            Travel<span style={{ color: 'var(--accent)' }}>Scraper</span> Pro
          </div>
        </div>
        <div style={styles.statsArea}>
          <StatBadge color="var(--success)" value={doneCount} label="scrapeados" />
          <StatBadge color="var(--warning)" value={pendingCount} label="pendientes" />
          <StatBadge color="var(--danger)" value={errorCount} label="errores" />
        </div>
      </header>

      <div style={styles.main}>
        {/* ===== SIDEBAR ===== */}
        <aside style={styles.sidebar}>
          <div style={styles.urlInputArea}>
            <h3 style={styles.sectionTitle}>
              URLs de circuitos
              <span style={styles.urlCount}>{urlCount}</span>
            </h3>
            <textarea
              style={styles.textarea}
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder={`Pega aquí las URLs (una por línea)\n\nEjemplo:\nhttps://kerala.viajes/grandes-viajes/europa/turquia/circuitos/circuito-clasico/turquia-estambul-ankara-capadocia-pamukkale-y-esmirna-9-dias.html`}
              disabled={isProcessing}
            />
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
            {isProcessing ? (
              <button style={{ ...styles.btn, ...styles.btnDanger, flex: 1 }} onClick={stopScraping}>
                ■ Detener
              </button>
            ) : (
              <button style={{ ...styles.btn, ...styles.btnPrimary, flex: 1 }} onClick={startScraping}>
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

        {/* ===== CONTENT ===== */}
        <main style={styles.content}>
          {/* Toolbar */}
          <div style={styles.toolbar}>
            <div style={styles.toolbarLeft}>
              <div style={styles.tabGroup}>
                <button
                  style={{ ...styles.tab, ...(view === 'cards' ? styles.tabActive : {}) }}
                  onClick={() => setView('cards')}
                >
                  ◈ Tarjetas
                </button>
                <button
                  style={{ ...styles.tab, ...(view === 'table' ? styles.tabActive : {}) }}
                  onClick={() => setView('table')}
                >
                  ☰ Tabla
                </button>
              </div>
              {validResults.length > 0 && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {validResults.length} resultado{validResults.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div style={styles.toolbarRight}>
              {validResults.length > 0 && (
                <>
                  <button style={{ ...styles.btn, ...styles.btnExport }} onClick={exportExcel}>
                    ⬇ Excel
                  </button>
                  <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={exportCSV}>
                    ⬇ CSV
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Results */}
          <div style={styles.resultsContainer}>
            {results.length === 0 ? (
              <EmptyState />
            ) : view === 'cards' ? (
              <CardGrid results={results} onDetail={setDetailIndex} />
            ) : (
              <TableView results={results} onDetail={setDetailIndex} />
            )}
          </div>
        </main>
      </div>

      {/* ===== DETAIL PANEL ===== */}
      {detailIndex !== null && results[detailIndex] && !results[detailIndex].error && (
        <DetailPanel data={results[detailIndex]} onClose={() => setDetailIndex(null)} />
      )}

      {/* ===== NOTIFICATION ===== */}
      {notification && <Notification msg={notification.msg} type={notification.type} />}
    </>
  );
}

// ============================
// SUB-COMPONENTS
// ============================

function StatBadge({ color, value, label }) {
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

function EmptyState() {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>🌍</div>
      <h4 style={{ fontSize: 18, color: 'var(--text-secondary)' }}>Sin resultados aún</h4>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 420, textAlign: 'center', lineHeight: 1.6 }}>
        Pega las URLs de los circuitos en el panel izquierdo y pulsa &quot;Iniciar Scraping&quot; para extraer toda la información automáticamente.
      </p>
    </div>
  );
}

function CardGrid({ results, onDetail }) {
  return (
    <div style={styles.cardGrid}>
      {results.map((d, i) =>
        d.error ? (
          <ErrorCard key={i} data={d} />
        ) : (
          <ResultCard key={i} data={d} onClick={() => onDetail(i)} />
        )
      )}
    </div>
  );
}

function ResultCard({ data, onClick }) {
  const bannerStyle = data.imageBanner
    ? { backgroundImage: `url(${data.imageBanner})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'linear-gradient(135deg, #1a2035 0%, #0d1520 100%)' };

  return (
    <div style={styles.card} onClick={onClick} className="result-card">
      <div style={{ ...styles.cardBanner, ...bannerStyle }}>
        <span style={styles.cardCategory}>{data.category1 || 'Circuito'}</span>
      </div>
      <div style={styles.cardBody}>
        <div style={styles.cardTitle}>{data.title || data.metaTitle || 'Sin título'}</div>
        <div style={styles.cardMeta}>
          <span style={styles.metaTag}>🌍 {data.countries || '-'}</span>
          <span style={styles.metaTag}>📅 {data.days || '?'}d / {data.nights || '?'}n</span>
          {data.price && (
            <span style={{ ...styles.metaTag, color: 'var(--accent-orange)' }}>
              💰 {data.price}€
            </span>
          )}
        </div>
        <div style={styles.cardCities}>
          <strong style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Visitando:{' '}
          </strong>
          {data.cities || '-'}
        </div>
      </div>
      <div style={styles.cardFooter}>
        <span style={{ ...styles.cardStatus, color: 'var(--success)' }}>✓ Scrapeado</span>
        <button
          style={styles.detailBtn}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          🔍
        </button>
      </div>
    </div>
  );
}

function ErrorCard({ data }) {
  return (
    <div style={{ ...styles.card, borderColor: 'rgba(239,68,68,0.3)' }}>
      <div style={styles.cardBody}>
        <div style={{ ...styles.cardTitle, color: 'var(--danger)' }}>Error al scrapear</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all', marginBottom: 8 }}>
          {data.url}
        </div>
        <div style={{ fontSize: 12, color: 'var(--danger)' }}>{data.error}</div>
      </div>
    </div>
  );
}

function TableView({ results, onDetail }) {
  const headers = ['URL', 'Título', 'País', 'Días', 'Ciudades', 'Cat. 1', 'Precio', 'Fechas'];
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={styles.table}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={styles.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((d, i) =>
            d.error ? (
              <tr key={i}>
                <td colSpan={headers.length} style={{ ...styles.td, color: 'var(--danger)' }}>
                  Error: {d.url} — {d.error}
                </td>
              </tr>
            ) : (
              <tr key={i} onClick={() => onDetail(i)} style={{ cursor: 'pointer' }}>
                <td style={{ ...styles.td, color: 'var(--accent)', fontFamily: "'Space Mono',monospace", fontSize: 11, maxWidth: 200 }}>
                  {d.url?.substring(0, 50)}...
                </td>
                <td style={styles.td}>{d.title || d.metaTitle || '-'}</td>
                <td style={styles.td}>{d.countries || '-'}</td>
                <td style={styles.td}>{d.days || '-'}</td>
                <td style={{ ...styles.td, maxWidth: 180 }}>{(d.cities || '').substring(0, 40)}</td>
                <td style={styles.td}>{d.category1 || '-'}</td>
                <td style={styles.td}>{d.price || '-'}</td>
                <td style={styles.td}>{d.travelDates || '-'}</td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

function DetailPanel({ data, onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.detailPanel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.detailHeader}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>{data.title || data.metaTitle}</h3>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={styles.detailBody}>
          <DetailSection title="Información General">
            <Field label="URL" value={<a href={data.url} target="_blank" rel="noreferrer">{data.url}</a>} />
            <Field label="Meta Title" value={data.metaTitle} />
            <Field label="Meta Description" value={data.metaDescription} />
            <Field label="Título" value={data.title} />
            <Field label="Países" value={data.countries} />
            <Field label="Días / Noches" value={`${data.days} días / ${data.nights} noches`} />
            <Field label="Fechas" value={data.travelDates} />
            <Field label="Fecha Texto" value={data.dateText} />
            <Field label="Ciudades" value={data.cities} />
            <Field label="Orígenes" value={data.origins} />
          </DetailSection>

          <DetailSection title="Categorización">
            <Field label="Categoría 1" value={data.category1} />
            <Field label="Categoría 2" value={data.category2} />
            <Field label="Tipo Circuito" value={data.circuitType} />
            <Field label="Precio" value={data.price ? `${data.price}€` : '-'} />
          </DetailSection>

          <DetailSection title="Imágenes">
            <Field label="Banner" value={data.imageBanner ? <a href={data.imageBanner} target="_blank" rel="noreferrer">{data.imageBanner.substring(0, 80)}...</a> : '-'} />
            <Field label="Img. Pequeña" value={data.imageSmall ? <a href={data.imageSmall} target="_blank" rel="noreferrer">{data.imageSmall.substring(0, 80)}...</a> : '-'} />
            {data.imageSmall && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={data.imageSmall}
                  alt="Preview"
                  style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, border: '1px solid var(--border)' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
          </DetailSection>

          <DetailSection title="Contenido">
            <Field label="Descripción corta" value={data.shortDescription} />
            <Field label="El viaje incluye" value={data.tripIncludes || '-'} />
            <Field label="Exc. incluidas" value={data.excursionsIncluded || '-'} />
            <Field label="Exc. opcionales" value={data.excursionsOptional || '-'} />
            <Field label="Hoteles" value={data.hotels || '-'} />
            <Field label="Pie de precios" value={data.priceFooter || '-'} />
          </DetailSection>

          <DetailSection title="Itinerario — Días">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {(data.itineraryDays || []).map((day, i) => (
                <span key={i} style={styles.metaTag}>
                  Día {i + 1}: {day}
                </span>
              ))}
              {(!data.itineraryDays || data.itineraryDays.length === 0) && (
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin datos de itinerario</span>
              )}
            </div>
          </DetailSection>

          <DetailSection title="Itinerario — Texto">
            <div
              style={{
                fontSize: 12,
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                maxHeight: 300,
                overflowY: 'auto',
                background: 'var(--bg-primary)',
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}
            >
              {(data.itineraryTexts || []).join('\n\n') || 'Sin datos de itinerario'}
            </div>
          </DetailSection>

          <DetailSection title="Valores Fijos">
            <Field label="Config. Regional" value={data.regionalConfig} />
            <Field label="Promociones" value={data.promotions} />
            <Field label="Proveedor" value={data.provider} />
            <Field label="Cat. Orígenes" value={data.catalogOrigins} />
          </DetailSection>
        </div>
      </div>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h4
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
          color: 'var(--accent)',
          marginBottom: 12,
          paddingBottom: 6,
          borderBottom: '1px solid var(--border)',
        }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ display: 'flex', marginBottom: 8, fontSize: 13, lineHeight: 1.5 }}>
      <span style={{ width: 160, minWidth: 160, color: 'var(--text-muted)', fontWeight: 500 }}>
        {label}
      </span>
      <span style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>
        {value || '-'}
      </span>
    </div>
  );
}

function Notification({ msg, type }) {
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

// ============================
// STYLES (Inline for portability)
// ============================
const styles = {
  header: {
    background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-card) 100%)',
    borderBottom: '1px solid var(--border)',
    padding: '16px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logoArea: { display: 'flex', alignItems: 'center', gap: 12 },
  logoIcon: {
    width: 40,
    height: 40,
    background: 'linear-gradient(135deg, var(--accent), #06b6a0)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--bg-primary)',
    boxShadow: '0 4px 16px rgba(13,223,186,0.3)',
  },
  logoText: { fontSize: 19, fontWeight: 700, letterSpacing: -0.5 },
  statsArea: { display: 'flex', gap: 16, alignItems: 'center' },
  statBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 12px',
    background: 'var(--bg-primary)',
    borderRadius: 18,
    border: '1px solid var(--border)',
  },
  statDot: { width: 8, height: 8, borderRadius: '50%' },

  main: { display: 'flex', height: 'calc(100vh - 73px)' },

  sidebar: {
    width: 400,
    minWidth: 400,
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  urlInputArea: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: 'var(--text-muted)',
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  urlCount: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 11,
    color: 'var(--text-muted)',
    padding: '2px 8px',
    background: 'var(--bg-primary)',
    borderRadius: 6,
  },
  textarea: {
    flex: 1,
    width: '100%',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontFamily: "'Space Mono', monospace",
    fontSize: 12,
    lineHeight: 1.8,
    padding: 14,
    resize: 'none',
    outline: 'none',
  },
  queueSection: {
    maxHeight: 200,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    borderTop: '1px solid var(--border)',
  },
  queueList: { flex: 1, overflowY: 'auto' },
  queueItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 20px',
    borderBottom: '1px solid var(--border)',
    fontSize: 12,
  },
  queueUrl: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 11,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  progressSection: {
    padding: '14px 20px',
    borderTop: '1px solid var(--border)',
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  progressTrack: {
    height: 6,
    background: 'var(--bg-primary)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--accent), #06e8c0)',
    borderRadius: 3,
    transition: 'width 0.5s ease',
  },
  sidebarActions: {
    padding: '14px 20px',
    display: 'flex',
    gap: 10,
    borderTop: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
  },

  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '11px 22px',
    borderRadius: 8,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, var(--accent), #06b6a0)',
    color: 'var(--bg-primary)',
    boxShadow: '0 4px 16px rgba(13,223,186,0.25)',
  },
  btnSecondary: {
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
  },
  btnDanger: {
    background: 'rgba(239,68,68,0.15)',
    color: 'var(--danger)',
    border: '1px solid rgba(239,68,68,0.3)',
  },
  btnExport: {
    background: 'linear-gradient(135deg, var(--accent-orange), #e55a2b)',
    color: 'white',
    boxShadow: '0 4px 16px rgba(255,107,53,0.25)',
  },

  content: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  toolbar: {
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
    flexShrink: 0,
  },
  toolbarLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: 10 },
  tabGroup: {
    display: 'flex',
    background: 'var(--bg-primary)',
    borderRadius: 8,
    padding: 3,
    border: '1px solid var(--border)',
  },
  tab: {
    padding: '7px 16px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    border: 'none',
    background: 'transparent',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'var(--accent)',
    color: 'var(--bg-primary)',
    fontWeight: 600,
  },

  resultsContainer: { flex: 1, overflow: 'auto', padding: 20 },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 14,
    color: 'var(--text-muted)',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    background: 'var(--bg-card)',
    borderRadius: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 36,
    border: '1px dashed var(--border)',
  },

  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
    gap: 18,
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.25s',
  },
  cardBanner: {
    height: 110,
    position: 'relative',
  },
  cardCategory: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: '4px 10px',
    background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(8px)',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--accent)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: { padding: '14px 18px' },
  cardTitle: { fontSize: 15, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 },
  cardMeta: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  metaTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    color: 'var(--text-muted)',
    background: 'var(--bg-primary)',
    padding: '3px 10px',
    borderRadius: 6,
  },
  cardCities: { fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 18px',
    borderTop: '1px solid var(--border)',
    background: 'rgba(0,0,0,0.12)',
  },
  cardStatus: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 500 },
  detailBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
  },

  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 },
  th: {
    background: 'var(--bg-card)',
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: 'var(--text-muted)',
    borderBottom: '2px solid var(--accent)',
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  td: {
    padding: '10px 14px',
    borderBottom: '1px solid var(--border)',
    maxWidth: 220,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--text-secondary)',
  },

  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 200,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  detailPanel: {
    width: 700,
    maxWidth: '92vw',
    background: 'var(--bg-secondary)',
    borderLeft: '1px solid var(--border)',
    overflowY: 'auto',
  },
  detailHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    background: 'var(--bg-secondary)',
    zIndex: 10,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBody: { padding: '20px 24px' },
};
