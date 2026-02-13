'use client';

import styles from '../styles';

export default function ResultsToolbar({
  view, setView,
  validCount, errorCount,
  exportExcel, exportCSV,
  retryErrors, isProcessing,
  searchQuery, setSearchQuery,
  filterStatus, setFilterStatus,
  filterCountry, setFilterCountry,
  filterCategory, setFilterCategory,
  countryOptions, categoryOptions,
}) {
  return (
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
        {validCount > 0 && (
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {validCount} resultado{validCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <input
          style={styles.searchInput}
          type="text"
          placeholder="🔍 Buscar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          style={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Todos</option>
          <option value="success">✓ Éxito</option>
          <option value="error">✕ Error</option>
        </select>
        {countryOptions.length > 0 && (
          <select
            style={styles.filterSelect}
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
          >
            <option value="">País: Todos</option>
            {countryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        {categoryOptions.length > 0 && (
          <select
            style={styles.filterSelect}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">Cat: Todas</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      <div style={styles.toolbarRight}>
        {errorCount > 0 && !isProcessing && (
          <button
            style={{ ...styles.btn, ...styles.btnRetry, ...styles.btnSmall }}
            onClick={retryErrors}
          >
            ↻ Reintentar errores ({errorCount})
          </button>
        )}
        {validCount > 0 && (
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
  );
}
