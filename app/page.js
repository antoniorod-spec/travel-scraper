'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import useScraper from './hooks/useScraper';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ResultsToolbar from './components/ResultsToolbar';
import CardGrid from './components/CardGrid';
import TableView from './components/TableView';
import DetailPanel from './components/DetailPanel';
import Notification from './components/Notification';
import styles from './styles';
import { supabaseClient } from '../lib/supabase/client';

export default function Home() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState('viewer');
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const getAuthHeaders = useCallback(() => {
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [session]);

  const scraper = useScraper(getAuthHeaders);
  const [view, setView] = useState('cards');
  const [detailIndex, setDetailIndex] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---- Filters ----
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (!mounted) return;
      setSession(data.session || null);
      if (data.session?.user?.id) {
        await loadProfileRole(data.session.user.id);
      }
      setAuthLoading(false);
    };
    bootstrap();

    const { data: listener } = supabaseClient.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession || null);
      if (nextSession?.user?.id) {
        await loadProfileRole(nextSession.user.id);
      } else {
        setRole('viewer');
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const loadProfileRole = async (userId) => {
    const { data } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    setRole(data?.role || 'viewer');
  };

  const login = async (e) => {
    e.preventDefault();
    setAuthError('');
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
    }
  };

  const signUp = async () => {
    setAuthError('');
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
      setAuthError(error.message);
      return;
    }
    setAuthError('Cuenta creada. Si tienes confirmación por email, revísala.');
  };

  const logout = async () => {
    await supabaseClient.auth.signOut();
    scraper.clearAll();
  };

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

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Cargando sesión...
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
        <form
          onSubmit={login}
          style={{
            width: '100%',
            maxWidth: 420,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <h2 style={{ fontSize: 22, marginBottom: 8 }}>Acceso</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.editableInput}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.editableInput}
            required
          />
          <button type="submit" style={{ ...styles.btn, ...styles.btnPrimary }}>Entrar</button>
          <button type="button" onClick={signUp} style={{ ...styles.btn, ...styles.btnSecondary }}>
            Crear cuenta
          </button>
          {authError && <div style={{ color: 'var(--warning)', fontSize: 13 }}>{authError}</div>}
        </form>
      </div>
    );
  }

  return (
    <>
      {/* ===== HEADER ===== */}
      <Header
        doneCount={scraper.doneCount}
        pendingCount={scraper.pendingCount}
        errorCount={scraper.errorCount}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
        userEmail={session.user?.email || ''}
        userRole={role}
        onLogout={logout}
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
