'use client';

import styles from '../styles';

function ResultCard({ data, onClick }) {
  const bannerStyle = data.imageBanner
    ? { backgroundImage: `url(${data.imageBanner})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'linear-gradient(135deg, #1a2035 0%, #0d1520 100%)' };

  return (
    <div style={styles.card} onClick={onClick} className="result-card">
      <div style={{ ...styles.cardBanner, ...bannerStyle }}>
        <span style={styles.cardCategory}>{data.category1 || 'Circuito'}</span>
        {data.fromCache && (
          <span style={styles.cardCacheBadge}>⚡ Cache</span>
        )}
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

function ErrorCard({ data, onRetry }) {
  const errorLabels = {
    'rate-limit': '⏳ Rate Limit',
    'forbidden': '🚫 Acceso denegado',
    'server-error': '💥 Error de servidor',
    'timeout': '⏰ Timeout',
    'network': '🌐 Error de red',
    'parse': '📄 Error de parseo',
    'unknown': '❓ Error desconocido',
  };
  const errorLabel = errorLabels[data.errorType] || errorLabels.unknown;

  return (
    <div style={{ ...styles.card, borderColor: 'rgba(239,68,68,0.3)' }}>
      <div style={styles.cardBody}>
        <div style={{ ...styles.cardTitle, color: 'var(--danger)' }}>Error al scrapear</div>
        <div style={{ fontSize: 11, color: 'var(--warning)', marginBottom: 6, fontWeight: 500 }}>
          {errorLabel}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all', marginBottom: 8 }}>
          {data.url}
        </div>
        <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 10 }}>{data.error}</div>
        {onRetry && (
          <button
            style={{ ...styles.btn, ...styles.btnRetry, ...styles.btnSmall }}
            onClick={(e) => { e.stopPropagation(); onRetry(data.url); }}
          >
            ↻ Reintentar
          </button>
        )}
      </div>
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

export default function CardGrid({ results, onDetail, onRetry }) {
  if (results.length === 0) return <EmptyState />;

  return (
    <div style={styles.cardGrid}>
      {results.map((d, i) =>
        d.error ? (
          <ErrorCard key={i} data={d} onRetry={onRetry} />
        ) : (
          <ResultCard key={i} data={d} onClick={() => onDetail(i)} />
        )
      )}
    </div>
  );
}
