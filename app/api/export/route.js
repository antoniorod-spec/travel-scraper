import * as XLSX from 'xlsx';
import { consumeRateLimit, getClientIp } from '../../../lib/rateLimit';
import { clampText, sanitizeSpreadsheetCell } from '../../../lib/security';

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const rate = consumeRateLimit(`export:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return Response.json(
        { error: 'Rate limit exceeded. Try again later.', retryAfterMs: rate.resetInMs },
        { status: 429 }
      );
    }

    const { items } = await request.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'No data to export' }, { status: 400 });
    }
    if (items.length > 300) {
      return Response.json({ error: 'Too many items. Max allowed is 300 per export.' }, { status: 400 });
    }

    // Determine max days for dynamic columns
    const maxDays = Math.min(
      60,
      Math.max(
        ...items.map((d) =>
          Math.max(
            d.itineraryDays?.length || 0,
            d.itineraryTexts?.length || 0,
            d.days || 0
          )
        )
      )
    );

    // Build headers matching the CSV template
    const baseHeaders = [
      'url',
      'titulo',
      'meta description',
      'países visitados',
      'número de días',
      'Fecha 1',
      'visitando',
      'imagen principal',
      'imagen lateral pequeña',
      'origen',
      'categoría 1',
      'categoría 2',
      'precio',
      'categoría 3',
      'titulo',
      'descripción larga',
      'Fecha 1',
      'tipo de circuito',
      'el viaje incluye',
      'excursiones incluidas',
      'excursiones opcionales',
      'hoteles previstos',
      'pie de tabla de precios',
      'descripción corta',
      'configuración regional',
      'promociones',
      'proveedor',
      'catalogo origenes',
      'origen inicial',
    ];

    const headers = [...baseHeaders];
    for (let i = 1; i <= maxDays; i++) headers.push(`día ${i}`);
    for (let i = 1; i <= maxDays; i++) headers.push(`itinerario${i}`);

    const toSafeCell = (value, maxLen) => sanitizeSpreadsheetCell(clampText(value, maxLen));

    // Build rows
    const rows = items.map((d) => {
      const row = [
        toSafeCell(d.url, 2000),
        toSafeCell(d.metaTitle, 500),
        toSafeCell(d.metaDescription, 5000),
        toSafeCell(d.countries, 500),
        d.days || '',
        toSafeCell(d.travelDates, 200),
        toSafeCell(d.cities, 2000),
        toSafeCell(d.imageBanner, 2000),
        toSafeCell(d.imageSmall, 2000),
        toSafeCell(d.origins, 2000),
        toSafeCell(d.category1, 200),
        toSafeCell(d.category2, 200),
        d.price || '',
        toSafeCell(d.category3, 200),
        toSafeCell(d.title, 500),
        toSafeCell(d.metaDescription, 5000), // descripción larga
        toSafeCell(d.dateText, 500),
        d.circuitType || 8,
        toSafeCell(d.tripIncludes, 15000),
        toSafeCell(d.excursionsIncluded, 10000),
        toSafeCell(d.excursionsOptional, 10000),
        toSafeCell(d.hotels, 10000),
        toSafeCell(d.priceFooter, 8000),
        toSafeCell(d.shortDescription, 3000),
        d.regionalConfig || 1,
        d.promotions || 1,
        d.provider || 14,
        d.catalogOrigins || 593,
        '', // origen inicial
      ];

      // Itinerary days
      for (let i = 0; i < maxDays; i++) {
        row.push(toSafeCell(d.itineraryDays?.[i], 500));
      }
      // Itinerary texts
      for (let i = 0; i < maxDays; i++) {
        row.push(toSafeCell(d.itineraryTexts?.[i], 12000));
      }

      return row;
    });

    // Create workbook
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((_, i) => ({
      wch: i === 0 ? 60 : i < 5 ? 30 : 25,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Circuitos');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="scraping_traveltool_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}


