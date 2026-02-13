'use client';

import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook that encapsulates all scraping logic: URLs, queue, results,
 * concurrency-limited scraping, export, etc.
 */
export default function useScraper(getAuthHeaders = () => ({})) {
  const [urls, setUrls] = useState('');
  const [queue, setQueue] = useState([]); // { url, status: 'pending'|'active'|'done'|'error', data?, error?, errorType? }
  const [results, setResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [concurrency, setConcurrency] = useState(3);
  const abortRef = useRef(false);
  const resultsRef = useRef([]);

  const urlCount = urls.trim() ? urls.trim().split('\n').filter((l) => l.trim()).length : 0;
  const doneCount = queue.filter((q) => q.status === 'done').length;
  const errorCount = queue.filter((q) => q.status === 'error').length;
  const pendingCount = queue.filter((q) => q.status === 'pending' || q.status === 'active').length;

  // ---- Notify ----
  const notify = useCallback((msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // ---- Concurrent scraping with per-domain delay ----
  const startScraping = async (concurrencyOverride) => {
    const maxConcurrency = concurrencyOverride ?? concurrency;
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
    resultsRef.current = [];
    setResults([]);
    setProgress({ current: 0, total: lines.length });

    const initialQueue = lines.map((url) => ({ url, status: 'pending' }));
    setQueue(initialQueue);

    // Per-domain delay tracking
    const domainLastRequest = {};
    const DELAY_PER_DOMAIN = 600;

    let completedCount = 0;
    let cursor = 0;

    const processOne = async () => {
      while (cursor < lines.length && !abortRef.current) {
        const myIndex = cursor++;
        const url = lines[myIndex];

        // Per-domain delay
        try {
          const domain = new URL(url).hostname;
          const lastReq = domainLastRequest[domain] || 0;
          const elapsed = Date.now() - lastReq;
          if (elapsed < DELAY_PER_DOMAIN) {
            await new Promise((r) => setTimeout(r, DELAY_PER_DOMAIN - elapsed));
          }
          domainLastRequest[domain] = Date.now();
        } catch { /* ignore URL parse errors, let the API handle them */ }

        if (abortRef.current) break;

        // Mark active
        setQueue((prev) =>
          prev.map((q, idx) => (idx === myIndex ? { ...q, status: 'active' } : q))
        );

        try {
          const res = await fetch('/api/scrape', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({ url }),
          });

          const json = await res.json();

          if (json.success) {
            resultsRef.current[myIndex] = json.data;
            setQueue((prev) =>
              prev.map((q, idx) =>
                idx === myIndex ? { ...q, status: 'done', data: json.data } : q
              )
            );
          } else {
            const errorType = classifyError(res.status, json.error);
            resultsRef.current[myIndex] = { url, error: json.error, errorType, metaTitle: 'Error', fromCache: json.fromCache };
            setQueue((prev) =>
              prev.map((q, idx) =>
                idx === myIndex ? { ...q, status: 'error', error: json.error, errorType } : q
              )
            );
          }
        } catch (err) {
          const errorType = classifyError(0, err.message);
          resultsRef.current[myIndex] = { url, error: err.message, errorType, metaTitle: 'Error' };
          setQueue((prev) =>
            prev.map((q, idx) =>
              idx === myIndex ? { ...q, status: 'error', error: err.message, errorType } : q
            )
          );
        }

        completedCount++;
        setProgress({ current: completedCount, total: lines.length });
        // Build a clean results array (no gaps)
        setResults([...resultsRef.current.filter(Boolean)]);
      }
    };

    // Launch workers
    const workers = [];
    for (let w = 0; w < Math.min(maxConcurrency, lines.length); w++) {
      workers.push(processOne());
    }
    await Promise.all(workers);

    setIsProcessing(false);
    const finalResults = resultsRef.current.filter(Boolean);
    setResults(finalResults);
    const successCount = finalResults.filter((r) => !r.error).length;
    const failCount = finalResults.filter((r) => r.error).length;
    notify(
      `Completado: ${successCount} éxito${successCount !== 1 ? 's' : ''}, ${failCount} error${failCount !== 1 ? 'es' : ''}`,
      failCount > 0 ? 'warning' : 'success'
    );
  };

  const stopScraping = () => {
    abortRef.current = true;
    notify('Scraping detenido', 'warning');
  };

  // ---- Retry errored URLs ----
  const retryErrors = async () => {
    const errorUrls = results.filter((r) => r.error).map((r) => r.url);
    if (errorUrls.length === 0) {
      notify('No hay errores para reintentar', 'info');
      return;
    }
    // Remove errored results and re-add them to the queue
    const goodResults = results.filter((r) => !r.error);
    resultsRef.current = [...goodResults];
    setResults([...goodResults]);

    abortRef.current = false;
    setIsProcessing(true);

    const totalBefore = goodResults.length;
    setProgress({ current: 0, total: errorUrls.length });

    const retryQueue = errorUrls.map((url) => ({ url, status: 'pending' }));
    setQueue((prev) => [
      ...prev.filter((q) => q.status === 'done'),
      ...retryQueue,
    ]);

    const domainLastRequest = {};
    const DELAY_PER_DOMAIN = 600;
    let completedCount = 0;
    let cursor = 0;

    const processOne = async () => {
      while (cursor < errorUrls.length && !abortRef.current) {
        const myIndex = cursor++;
        const url = errorUrls[myIndex];

        try {
          const domain = new URL(url).hostname;
          const lastReq = domainLastRequest[domain] || 0;
          const elapsed = Date.now() - lastReq;
          if (elapsed < DELAY_PER_DOMAIN) {
            await new Promise((r) => setTimeout(r, DELAY_PER_DOMAIN - elapsed));
          }
          domainLastRequest[domain] = Date.now();
        } catch { /* ignore */ }

        if (abortRef.current) break;

        setQueue((prev) =>
          prev.map((q) => (q.url === url && q.status === 'pending' ? { ...q, status: 'active' } : q))
        );

        try {
          const res = await fetch('/api/scrape', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({ url }),
          });
          const json = await res.json();

          if (json.success) {
            resultsRef.current.push(json.data);
            setQueue((prev) =>
              prev.map((q) => (q.url === url && q.status === 'active' ? { ...q, status: 'done', data: json.data } : q))
            );
          } else {
            const errorType = classifyError(res.status, json.error);
            resultsRef.current.push({ url, error: json.error, errorType, metaTitle: 'Error' });
            setQueue((prev) =>
              prev.map((q) => (q.url === url && q.status === 'active' ? { ...q, status: 'error', error: json.error, errorType } : q))
            );
          }
        } catch (err) {
          const errorType = classifyError(0, err.message);
          resultsRef.current.push({ url, error: err.message, errorType, metaTitle: 'Error' });
          setQueue((prev) =>
            prev.map((q) => (q.url === url && q.status === 'active' ? { ...q, status: 'error', error: err.message, errorType } : q))
          );
        }

        completedCount++;
        setProgress({ current: completedCount, total: errorUrls.length });
        setResults([...resultsRef.current.filter(Boolean)]);
      }
    };

    const workers = [];
    for (let w = 0; w < Math.min(concurrency, errorUrls.length); w++) {
      workers.push(processOne());
    }
    await Promise.all(workers);

    setIsProcessing(false);
    const finalResults = resultsRef.current.filter(Boolean);
    setResults(finalResults);
    const successCount = finalResults.filter((r) => !r.error).length - totalBefore;
    const failCount = finalResults.filter((r) => r.error).length;
    notify(
      `Reintento: ${successCount} recuperado${successCount !== 1 ? 's' : ''}, ${failCount} error${failCount !== 1 ? 'es' : ''} restante${failCount !== 1 ? 's' : ''}`,
      failCount > 0 ? 'warning' : 'success'
    );
  };

  // ---- Retry single URL ----
  const retrySingleUrl = async (urlToRetry) => {
    notify(`Reintentando: ${urlToRetry.substring(0, 50)}...`, 'info');
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ url: urlToRetry }),
      });
      const json = await res.json();

      setResults((prev) => {
        const updated = prev.map((r) => {
          if (r.url === urlToRetry && r.error) {
            if (json.success) return json.data;
            const errorType = classifyError(res.status, json.error);
            return { ...r, error: json.error, errorType };
          }
          return r;
        });
        resultsRef.current = updated;
        return updated;
      });

      setQueue((prev) =>
        prev.map((q) => {
          if (q.url === urlToRetry) {
            if (json.success) return { ...q, status: 'done', data: json.data, error: undefined };
            return { ...q, status: 'error', error: json.error };
          }
          return q;
        })
      );

      if (json.success) {
        notify('URL reintentada con éxito', 'success');
      } else {
        notify('El reintento falló: ' + json.error, 'error');
      }
    } catch (err) {
      notify('Error al reintentar: ' + err.message, 'error');
    }
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
    resultsRef.current = [];
    setProgress({ current: 0, total: 0 });
  };

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return {
    urls, setUrls,
    queue, results, setResults,
    isProcessing, notification,
    progress, pct,
    concurrency, setConcurrency,
    urlCount, doneCount, errorCount, pendingCount,
    notify, startScraping, stopScraping,
    retryErrors, retrySingleUrl,
    exportExcel, exportCSV, clearAll,
  };
}

// ---- Error classification ----
function classifyError(httpStatus, message) {
  const msg = (message || '').toLowerCase();
  if (httpStatus === 429 || /rate.?limit/i.test(msg)) return 'rate-limit';
  if (httpStatus === 403 || /forbidden|blocked|access denied/i.test(msg)) return 'forbidden';
  if (httpStatus >= 500 || /5\d\d|server error|internal/i.test(msg)) return 'server-error';
  if (/timeout|abort|timed out/i.test(msg)) return 'timeout';
  if (/network|fetch|econnrefused|enotfound|dns/i.test(msg)) return 'network';
  if (/parse|cheerio|syntax|unexpected/i.test(msg)) return 'parse';
  return 'unknown';
}
