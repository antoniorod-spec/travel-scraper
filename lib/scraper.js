import * as cheerio from 'cheerio';

/**
 * Fetches the HTML content of a URL from the server side (no CORS issues).
 */
export async function fetchPageHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Main parser: receives raw HTML + original URL, returns structured data.
 */
export function parseCircuitPage(html, url) {
  const $ = cheerio.load(html);
  const data = {};

  // 1. URL
  data.url = url;

  // 2. Meta title
  data.metaTitle = extractMetaTitle($);

  // 3. Meta description
  data.metaDescription = extractMetaDescription($);

  // 4. Countries
  data.countries = extractCountries($, url);

  // 5-6. Days & Nights
  const dn = extractDaysNights($, url, data.metaTitle);
  data.days = dn.days;
  data.nights = dn.nights;

  // 7. Travel dates
  data.travelDates = extractDates($);

  // 8. Cities visited
  data.cities = extractCities($, data.metaTitle);

  // 9-10. Images
  const imgs = extractImages($);
  data.imageBanner = imgs.banner;
  data.imageSmall = imgs.small;

  // 11. Origins
  data.origins = extractOrigins($);

  // 12. Category 1
  data.category1 = extractCategory1($);

  // 13. Category 2
  data.category2 = extractCategory2($);

  // 14. Title (< 100 chars)
  data.title = buildTitle(data.metaTitle, data.category1);

  // 15. Date text
  data.dateText = buildDateText(data.travelDates);

  // 16. Circuit type
  data.circuitType = 8;

  // 17. Trip includes
  data.tripIncludes = extractSection($, [
    'el viaje incluye',
    'el precio incluye',
    'incluye',
    'servicios incluidos',
  ]);

  // 18. Included excursions
  data.excursionsIncluded = extractSection($, [
    'excursiones incluidas',
    'visitas incluidas',
  ]);

  // 19. Optional excursions
  data.excursionsOptional = extractSection($, [
    'excursiones opcionales',
    'visitas opcionales',
    'facultativas',
  ]);

  // 20. Hotels
  data.hotels = extractHotels($);

  // 21. Price footer
  data.priceFooter = extractPriceFooter($);

  // 22. Short description
  data.shortDescription = data.metaDescription || `Descubre ${data.metaTitle || 'este circuito'} en un viaje organizado.`;

  // 23. Price
  data.price = extractPrice($);

  // Fixed values
  data.regionalConfig = 1;
  data.promotions = 1;
  data.provider = 14;
  data.catalogOrigins = 593;

  // 24. Itinerary days (@City)
  data.itineraryDays = extractItineraryDays($);

  // 25. Itinerary texts ({Día X: ...})
  data.itineraryTexts = extractItineraryTexts($);

  return data;
}

// ==================== EXTRACTION HELPERS ====================

function extractMetaTitle($) {
  const og = $('meta[property="og:title"]').attr('content');
  if (og) return cleanTitle(og);
  const title = $('title').text();
  if (title) return cleanTitle(title);
  const h1 = $('h1').first().text();
  return h1 ? h1.trim() : '';
}

function cleanTitle(raw) {
  return raw
    .replace(/\s*\|.*$/, '')
    .replace(/\s*-\s*Kerala.*$/i, '')
    .replace(/\s*-\s*Viajes.*$/i, '')
    .trim();
}

function extractMetaDescription($) {
  const desc =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    '';
  return desc.trim();
}

function extractCountries($, url) {
  // Kerala/Traveltool: breadcrumbs-rxjs - last item contains "País: Ciudad, Ciudad..."
  const rxjsItems = $('.breadcrumbs-rxjs__item');
  if (rxjsItems.length > 0) {
    const lastItem = $(rxjsItems[rxjsItems.length - 1]).clone();
    lastItem.find('a, i, div, p').remove();
    const lastText = lastItem.text().trim();
    // Extract country from "Turquía: Estambul, Ankara..." or just the country name
    const colonMatch = lastText.match(/^([^:,]+)/);
    if (colonMatch) {
      const country = colonMatch[1].trim();
      if (country.length > 2 && country.length < 40) return country;
    }
  }

  // Kerala/Traveltool: breadcrumbs-rxjs links (may be JS-rendered)
  const rxjsLinks = $('.breadcrumbs-rxjs__link');
  if (rxjsLinks.length > 1) {
    const candidates = [];
    rxjsLinks.each((i, el) => {
      const t = $(el).text().trim();
      if (t) candidates.push(t);
    });
    for (let i = Math.min(3, candidates.length - 1); i >= 1; i--) {
      const c = candidates[i];
      if (c && c.length > 2 && c.length < 30 && !/circuito|viaje|inicio|home/i.test(c)) {
        return c;
      }
    }
  }

  // From traditional breadcrumbs
  const breadcrumbLinks = $(
    '.breadcrumb a, .breadcrumbs a, nav[aria-label="breadcrumb"] a, .breadcrumb li a'
  );
  if (breadcrumbLinks.length > 2) {
    const candidates = [];
    breadcrumbLinks.each((i, el) => {
      candidates.push($(el).text().trim());
    });
    for (let i = Math.min(3, candidates.length - 1); i >= 2; i--) {
      const c = candidates[i];
      if (c && c.length > 2 && c.length < 30 && !/circuito|viaje|inicio|home/i.test(c)) {
        return c;
      }
    }
  }

  // From URL path
  const pathMatch = url.match(
    /(?:europa|asia|america|africa|oceania)\/([^\/]+)/i
  );
  if (pathMatch) {
    const c = decodeURIComponent(pathMatch[1]).replace(/-/g, ' ');
    return capitalize(c);
  }

  // From the header summary line ("Turquía, 9 Días · Circuito clásico")
  const summaryText =
    $('.header-summary__subtitle').text() ||
    $('.header-summary').text() ||
    $('h1').text() ||
    '';
  const countryMatch = summaryText.match(
    /^([A-ZÁ-Ú][a-záéíóúñ]+(?:\s[A-ZÁ-Ú][a-záéíóúñ]+)*)\s*[,:·]/
  );
  if (countryMatch) return countryMatch[1];

  return '';
}

function extractDaysNights($, url, title) {
  // From page text: "9 Días · Circuito clásico" or "9 días / 8 noches"
  const bodyText = $('body').text();

  let m = bodyText.match(/(\d+)\s*d[ií]as?\s*[\/·,\-]\s*(\d+)\s*noches/i);
  if (m) return { days: parseInt(m[1]), nights: parseInt(m[2]) };

  m = bodyText.match(/(\d+)\s*d[ií]as/i);
  if (m) {
    const d = parseInt(m[1]);
    return { days: d, nights: d - 1 };
  }

  // From URL
  const urlMatch = url.match(/(\d+)[_-]?dias/i);
  if (urlMatch) {
    const d = parseInt(urlMatch[1]);
    return { days: d, nights: d - 1 };
  }

  // From title
  const titleMatch = (title || '').match(/(\d+)\s*d[ií]as/i);
  if (titleMatch) {
    const d = parseInt(titleMatch[1]);
    return { days: d, nights: d - 1 };
  }

  return { days: '', nights: '' };
}

function extractDates($) {
  // Kerala/Traveltool: summary-product__box-departure-content
  // First occurrence typically has dates: "Salidas desde Febrero 2026 hasta Enero 2027"
  const departureContents = $('.summary-product__box-departure-content');
  if (departureContents.length > 0) {
    const dateText = $(departureContents[0]).text().trim();
    const months =
      'Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre';
    // "Salidas desde Febrero 2026 hasta Enero 2027"
    const fromUntil = new RegExp(
      `(${months})\\s+(\\d{4})\\s+hasta\\s+(${months})\\s+(\\d{4})`,
      'i'
    );
    const m = dateText.match(fromUntil);
    if (m) return `${m[1]} ${m[2]} - ${m[3]} ${m[4]}`;

    // Generic month-year range
    const re = new RegExp(
      `(${months})\\s+(\\d{4})\\s*[-–a]\\s*(${months})\\s+(\\d{4})`,
      'i'
    );
    const m2 = dateText.match(re);
    if (m2) return `${m2[1]} ${m2[2]} - ${m2[3]} ${m2[4]}`;

    // If the text contains date info but in different format, return cleaned
    if (/salidas?\s+desde/i.test(dateText) && dateText.length < 100) {
      return dateText.replace(/^salidas?\s+desde\s+/i, '').trim();
    }
  }

  const bodyText = $('body').text();
  const months =
    'Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre';
  const re = new RegExp(
    `(${months})\\s+(\\d{4})\\s*[-–a]\\s*(${months})\\s+(\\d{4})`,
    'i'
  );
  const m = bodyText.match(re);
  if (m) return `${m[1]} ${m[2]} - ${m[3]} ${m[4]}`;

  // From select/option elements (month selectors in the booking form)
  const opts = [];
  $('select option, .month-list li, .dates-selector span, [data-month]').each(
    (_, el) => {
      const t = $(el).text().trim();
      const monthRe = new RegExp(`^(${months})`, 'i');
      if (monthRe.test(t)) opts.push(t);
    }
  );
  if (opts.length >= 2) return `${opts[0]} - ${opts[opts.length - 1]}`;

  return '';
}

function extractCities($, title) {
  // From title: "Turquía: Estambul, Ankara, Capadocia..."
  const colonMatch = (title || '').match(/:\s*(.+)/);
  if (colonMatch) {
    const raw = colonMatch[1]
      .replace(/\d+\s*d[ií]as?/gi, '')
      .replace(/circuito\s*\w*/gi, '')
      .replace(/\s+y\s+/g, ', ')
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 1 && !/viaje|tour/i.test(c));
    if (raw.length > 0) return raw.join(', ');
  }

  // From itinerary day titles
  const citySet = new Set();
  $(
    '.itinerary-day h3, .itinerary-day h4, .day-title, .itinerary__day-title'
  ).each((_, el) => {
    let text = $(el)
      .text()
      .replace(/d[ií]a\s*\d+\s*[:.\-]?\s*/gi, '')
      .trim();
    text.split(/[-–>]/).forEach((c) => {
      const city = c.trim();
      if (
        city.length > 2 &&
        city.length < 40 &&
        !/salida|llegada|vuelo|ciudad\s+de\s+origen|regreso/i.test(city)
      ) {
        citySet.add(city);
      }
    });
  });
  if (citySet.size > 0) return [...citySet].join(', ');

  return '';
}

function extractImages($) {
  let banner = '';

  // header-summary__bg
  const bgEl = $('.header-summary__bg');
  if (bgEl.length) {
    // Check for img inside
    const img = bgEl.find('img');
    if (img.length) {
      banner = img.attr('src') || img.attr('data-src') || '';
    }
    // Check inline style
    if (!banner) {
      const style = bgEl.attr('style') || '';
      const m = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
      if (m) banner = m[1];
    }
    // Check data-bg
    if (!banner) {
      banner = bgEl.attr('data-bg') || bgEl.attr('data-background') || '';
    }
  }

  // Fallback: any header-summary image
  if (!banner) {
    const headerImg = $('[class*="header-summary"] img').first();
    if (headerImg.length) {
      banner = headerImg.attr('src') || headerImg.attr('data-src') || '';
    }
  }

  // Fallback: og:image
  if (!banner) {
    banner = $('meta[property="og:image"]').attr('content') || '';
  }

  // Build small image
  let small = '';
  if (banner) {
    small = banner
      .replace(/resize\/crop\/\d+\/\d+/g, 'resize/crop/385/280')
      .replace(/\d+_\d+\.jpg/g, '900_900.jpg')
      .replace(/cdn\.traveltool\.es/g, 'cdn.smy.travel');
  }

  return { banner, small };
}

function extractOrigins($) {
  // Kerala/Traveltool: second summary-product__box-departure-content has origins
  const departureContents = $('.summary-product__box-departure-content');
  if (departureContents.length > 1) {
    const originsText = $(departureContents[1]).text().trim();
    if (originsText.length > 3 && !/salida|fecha|enero|febrero/i.test(originsText)) {
      return originsText.replace(/\.{3}$/, '');
    }
  }

  // Also check: departure label "Desde" followed by content
  const departureLabels = $('.summary-product__box-departure-label');
  departureLabels.each((_, el) => {
    if (/desde/i.test($(el).text())) {
      const next = $(el).next('.summary-product__box-departure-content');
      if (next.length) {
        const t = next.text().trim();
        if (t.length > 3) return false; // break - we already got it above
      }
    }
  });

  const origins = [];
  const selectors = [
    'select[name*="origin"] option',
    'select[name*="salida"] option',
    'select[name*="departure"] option',
    '.origin-selector option',
    '.departure-selector option',
    '.filter-origin option',
    '.airport-list li',
    '.origin-list li',
    '[data-origin]',
  ];

  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const t = $(el).text().trim();
      if (
        t &&
        t.length > 2 &&
        t.length < 50 &&
        !/selecciona|elige|todos|--/i.test(t)
      ) {
        origins.push(t);
      }
    });
    if (origins.length > 0) break;
  }

  return origins.join(', ');
}

function extractCategory1($) {
  // Kerala/Traveltool: summary-product__box-tag elements
  const tags = [];
  $('.summary-product__box-tag').each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 2 && t.length < 60) tags.push(t);
  });
  if (tags.length > 0) return tags[0];

  // Look for text like "Turquía, 9 Días · Circuito clásico"
  const bodyText = $('body').text();
  const m = bodyText.match(
    /\d+\s*[Dd][ií]as?\s*[·•]\s*([^\n\r<]{3,40})/
  );
  if (m) {
    const cat = m[1].trim();
    if (cat.length > 2) return cat;
  }

  // From specific elements
  const candidates = $(
    '.tour-type, .circuit-type, [class*="tour-tag"], [class*="category"]'
  );
  for (let i = 0; i < candidates.length; i++) {
    const t = $(candidates[i]).text().trim();
    if (/circuito/i.test(t) && t.length < 40) return t;
  }

  return 'Circuito clásico';
}

function extractCategory2($) {
  // Kerala/Traveltool: additional tags from summary-product__box-tag
  const tags = [];
  $('.summary-product__box-tag').each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 2 && t.length < 60) tags.push(t);
  });
  // Return second tag if available
  if (tags.length > 1) return tags[1];

  const text = $('body').text().toLowerCase();
  if (/excursi[oó]n|visita guiada|con gu[ií]a/i.test(text)) return 'Con guías';
  return '';
}

function buildTitle(metaTitle, category) {
  if (!metaTitle) return '';
  let prefix = 'Circuito por';
  if (/combinado/i.test(category || '')) prefix = 'Combinado por';
  else if (/gran viaje/i.test(category || '')) prefix = 'Viaje por';

  let title = `${prefix} ${metaTitle}`;
  if (title.length > 100) title = title.substring(0, 97) + '...';
  return title;
}

function buildDateText(dates) {
  if (!dates) return '';
  return `Salidas desde ${dates.replace(/\s*-\s*/, ' hasta ')}`;
}

function extractSection($, keywords) {
  const headings = $('h2, h3, h4, h5, .section-title, .accordion-title, .tab-title');
  for (let i = 0; i < headings.length; i++) {
    const hText = $(headings[i]).text().toLowerCase().trim();
    if (keywords.some((k) => hText.includes(k))) {
      // Get the next sibling container
      let container = $(headings[i]).next();
      if (!container.length) container = $(headings[i]).parent();

      const items = [];
      container.find('li, p').each((_, el) => {
        const t = $(el).text().trim();
        if (t.length > 3) items.push(t);
      });
      if (items.length > 0) return items.join('\n');

      // Fallback: just get text content
      const directText = container.text().trim();
      if (directText.length > 10) return directText;
    }
  }

  // Search in accordion/tab panels
  const panels = $(
    '.accordion-panel, .tab-panel, .collapse-content, [class*="accordion"]'
  );
  for (let i = 0; i < panels.length; i++) {
    const panelText = $(panels[i]).text().toLowerCase();
    if (keywords.some((k) => panelText.includes(k))) {
      const items = [];
      $(panels[i])
        .find('li, p')
        .each((_, el) => {
          const t = $(el).text().trim();
          if (t.length > 3) items.push(t);
        });
      if (items.length > 0) return items.join('\n');
    }
  }

  return '';
}

function extractHotels($) {
  // Try specific hotel sections
  const selectors = [
    '[class*="hotel"]',
    '.hoteles',
    '.accommodation',
    '.alojamiento',
  ];
  for (const sel of selectors) {
    const section = $(sel);
    if (section.length) {
      const items = [];
      section.find('li, .hotel-name, .hotel-item, tr td:first-child, h4, h5').each(
        (_, el) => {
          const t = $(el).text().trim();
          if (t.length > 3 && t.length < 200) items.push(t);
        }
      );
      if (items.length > 0) return items.join('\n');
    }
  }

  // Search by heading
  const headings = $('h2, h3, h4');
  for (let i = 0; i < headings.length; i++) {
    if (/hotel/i.test($(headings[i]).text())) {
      let next = $(headings[i]).next();
      const items = [];
      let count = 0;
      while (next.length && count < 10) {
        if (['H2', 'H3', 'H4'].includes(next.prop('tagName'))) break;
        const t = next.text().trim();
        if (t.length > 3) items.push(t);
        next = next.next();
        count++;
      }
      if (items.length > 0) return items.join('\n');
    }
  }

  return '';
}

function extractPriceFooter($) {
  const selectors = [
    '.price-conditions',
    '.conditions',
    '[class*="condicion"]',
    '.price-footer',
    '.nota-precios',
    '.price-notes',
    '.legal-text',
  ];
  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length) {
      const t = el.text().trim();
      if (t.length > 10) return t.substring(0, 1000);
    }
  }
  return '';
}

function extractPrice($) {
  // Kerala/Traveltool: span.price__int inside header-summary__price-value
  const priceInt = $('span.price__int').first();
  if (priceInt.length) {
    const num = parseInt(priceInt.text().replace(/[^\d]/g, ''));
    if (num > 50 && num < 50000) return num;
  }

  const selectors = [
    '.header-summary__price-value',
    '.price .amount',
    '.precio .amount',
    '.tour-price',
    '[class*="price"] .amount',
    '.price',
    '.precio',
  ];
  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length) {
      const raw = el.text().replace(/[^\d.,]/g, '').trim();
      const num = parseInt(raw.replace(/\./g, '').replace(',', '.'));
      if (num > 50 && num < 50000) return num;
    }
  }
  return '';
}

function extractItineraryDays($) {
  const days = [];

  // Try structured itinerary elements
  const dayEls = $(
    '.itinerary-day, .day-item, [class*="itinerary"] [class*="day"], .itinerary__day, .accordion-item'
  );

  if (dayEls.length > 0) {
    dayEls.each((_, el) => {
      const titleEl = $(el).find(
        'h3, h4, h5, .day-title, .title, .accordion-title, .itinerary__day-title'
      );
      if (titleEl.length) {
        let text = titleEl
          .first()
          .text()
          .replace(/d[ií]a\s*\d+\s*[:.\-]?\s*/gi, '')
          .trim();
        const cities = text
          .split(/[-–>]/)
          .map((c) => c.trim())
          .filter(
            (c) =>
              c.length > 1 &&
              c.length < 50 &&
              !/ciudad\s+de\s+origen|salida|llegada|vuelo|regreso/i.test(c)
          );
        if (cities.length > 0) {
          days.push('@' + cities[cities.length - 1]);
        } else if (text.length > 1) {
          days.push('@' + text.substring(0, 50));
        }
      }
    });
  }

  // Fallback: regex from body text
  if (days.length === 0) {
    const bodyText = $('body').text();
    const re = /[Dd][ií]a\s*(\d+)\s*[:.\-]\s*([^\n\r]{3,100})/g;
    let match;
    while ((match = re.exec(bodyText)) !== null) {
      let dayText = match[2].trim();
      const cities = dayText
        .split(/[-–>]/)
        .map((c) => c.trim())
        .filter(
          (c) =>
            c.length > 1 &&
            !/ciudad\s+de\s+origen|salida/i.test(c)
        );
      if (cities.length > 0) {
        const last = cities[cities.length - 1].replace(/\..*/g, '').trim();
        days.push('@' + last);
      }
    }
  }

  return days;
}

function extractItineraryTexts($) {
  const texts = [];

  const dayEls = $(
    '.itinerary-day, .day-item, [class*="itinerary"] [class*="day"], .itinerary__day, .accordion-item'
  );

  if (dayEls.length > 0) {
    dayEls.each((_, el) => {
      const titleEl = $(el).find(
        'h3, h4, h5, .day-title, .title, .accordion-title'
      );
      const title = titleEl.length ? titleEl.first().text().trim() : '';

      // Get body text (exclude title)
      const clone = $(el).clone();
      clone.find('h3, h4, h5, .day-title, .title, .accordion-title').remove();
      const body = clone.text().trim().replace(/\s+/g, ' ');

      if (title || body) {
        const combined = title + (body ? ': ' + body : '');
        texts.push('{' + combined);
      }
    });
  }

  // Fallback: regex
  if (texts.length === 0) {
    const bodyText = $('body').text();
    const re = /([Dd][ií]a\s*\d+\s*[:.\-]\s*[^\n]{10,500})/g;
    let match;
    while ((match = re.exec(bodyText)) !== null) {
      texts.push('{' + match[1].trim());
    }
  }

  return texts;
}

// ==================== UTILITY ====================

function capitalize(str) {
  return str
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
