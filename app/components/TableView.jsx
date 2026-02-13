'use client';

import styles from '../styles';

export default function TableView({ results, onDetail, onRetry }) {
  const headers = ['URL', 'Título', 'País', 'Días', 'Ciudades', 'Cat. 1', 'Precio', 'Fechas', ''];
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
                <td colSpan={headers.length - 1} style={{ ...styles.td, color: 'var(--danger)' }}>
                  Error: {d.url} — {d.error}
                  {d.errorType && (
                    <span style={{ marginLeft: 8, color: 'var(--warning)', fontSize: 11 }}>
                      [{d.errorType}]
                    </span>
                  )}
                </td>
                <td style={styles.td}>
                  {onRetry && (
                    <button
                      style={{
                        ...styles.btn,
                        ...styles.btnRetry,
                        ...styles.btnSmall,
                        padding: '4px 8px',
                        fontSize: 11,
                      }}
                      onClick={(e) => { e.stopPropagation(); onRetry(d.url); }}
                    >
                      ↻
                    </button>
                  )}
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
                <td style={styles.td}></td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
