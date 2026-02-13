'use client';

import { useState, useCallback, useMemo } from 'react';
import useScraper from './hooks/useScraper';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ResultsToolbar from './components/ResultsToolbar';
import CardGrid from './components/CardGrid';
import TableView from './components/TableView';
import DetailPanel from './components/DetailPanel';
import Notification from './components/Notification';
import styles from './styles';

export default function Home() {
  const scraper = useScraper();
  const [view, setView] = useState('cards');
  const [detailIndex, setDetailIndex] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---- Filters ----
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // ---- Update a single field in results (for editable detail panel) ----
  const updateResult = useCallback((fieldKey, value) => {
    scraper.setResults((prev) =>
      prev.map((r, i) => (i === detailIndex ? { ...r, [fieldKey]: value } : r))
    );
  }, [detailIndex, scraper]);

  // ---- Filter options ----
  const countryOptions = useMemo(() => {
    const set = new Set();
    scraper.results.forEach((r) => {
      if (!r.error && r.countries) {
        r.countries.split(',').forEach((c) => {
          const trimmed = c.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return [...set].sort();
  }, [scraper.results]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    scraper.results.forEach((r) => {
      if (!r.error && r.category1) set.add(r.category1);
    });
    return [...set].sort();
  }, [scraper.results]);

  // ---- Filtered results ----
  const filteredResults = useMemo(() => {
    let filtered = scraper.results;

    // Status filter
    if (filterStatus === 'success') {
      filtered = filtered.filter((r) => !r.error);
    } else if (filterStatus === 'error') {
      filtered = filtered.filter((r) => r.error);
    }

    // Country filter
    if (filterCountry) {
      filtered = filtered.filter((r) =>
        !r.error && r.countries && r.countries.toLowerCase().includes(filterCountry.toLowerCase())
      );
    }

    // Category filter
    if (filterCategory) {
      filtered = filtered.filter((r) =>
        !r.error && r.category1 && r.category1.toLowerCase() === filterCategory.toLowerCase()
      );
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((r) => {
        const searchable = [
          r.title, r.metaTitle, r.countries, r.category1,
          r.cities, r.url, r.error,
        ].filter(Boolean).join(' ').toLowerCase();
        return searchable.includes(q);
      });
    }

    return filtered;
  }, [scraper.results, filterStatus, filterCountry, filterCategory, searchQuery]);

  const validResults = filteredResults.filter((r) => !r.error);
  const errorResults = filteredResults.filter((r) => r.error);

  return (
    <>
      {/* ===== HEADER ===== */}
      <Header
        doneCount={scraper.doneCount}
        pendingCount={scraper.pendingCount}
        errorCount={scraper.errorCount}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
      />

      <div style={styles.main}>
        {/* ===== SIDEBAR OVERLAY (mobile) ===== */}
        {sidebarOpen && (
          <div
            style={{ ...styles.sidebarOverlay, ...styles.sidebarOverlayVisible }}
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ===== SIDEBAR ===== */}
        <Sidebar
          urls={scraper.urls}
          setUrls={scraper.setUrls}
          queue={scraper.queue}
          isProcessing={scraper.isProcessing}
          progress={scraper.progress}
          pct={scraper.pct}
          urlCount={scraper.urlCount}
          concurrency={scraper.concurrency}
          setConcurrency={scraper.setConcurrency}
          startScraping={scraper.startScraping}
          stopScraping={scraper.stopScraping}
          clearAll={scraper.clearAll}
          sidebarOpen={sidebarOpen}
        />

        {/* ===== CONTENT ===== */}
        <main style={styles.content}>
          {/* Toolbar */}
          <ResultsToolbar
            view={view}
            setView={setView}
            validCount={validResults.length}
            errorCount={errorResults.length}
            exportExcel={scraper.exportExcel}
            exportCSV={scraper.exportCSV}
            retryErrors={scraper.retryErrors}
            isProcessing={scraper.isProcessing}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterCountry={filterCountry}
            setFilterCountry={setFilterCountry}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            countryOptions={countryOptions}
            categoryOptions={categoryOptions}
          />

          {/* Results */}
          <div style={styles.resultsContainer}>
            {view === 'cards' ? (
              <CardGrid
                results={filteredResults}
                onDetail={setDetailIndex}
                onRetry={scraper.retrySingleUrl}
              />
            ) : (
              <TableView
                results={filteredResults}
                onDetail={setDetailIndex}
                onRetry={scraper.retrySingleUrl}
              />
            )}
          </div>
        </main>
      </div>

      {/* ===== DETAIL PANEL ===== */}
      {detailIndex !== null && scraper.results[detailIndex] && !scraper.results[detailIndex].error && (
        <DetailPanel
          data={scraper.results[detailIndex]}
          onClose={() => setDetailIndex(null)}
          onUpdate={updateResult}
        />
      )}

      {/* ===== NOTIFICATION ===== */}
      {scraper.notification && (
        <Notification msg={scraper.notification.msg} type={scraper.notification.type} />
      )}
    </>
  );
}
