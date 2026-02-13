import { CAPITAL_TO_COUNTRY, SPAIN_CITY_TO_REGION } from '../constants';
import { normalizeKey, splitCountries, normalizeCountryLabel, parseCityList } from '../utils';

export function extractCountries($, url, cities = '') {
  const countryCandidates = [];
  const addCountry = (raw) => {
    splitCountries(raw).forEach((part) => {
      const normalized = normalizeCountryLabel(part);
      if (normalized && normalized.length < 60) countryCandidates.push(normalized);
    });
  };

  const rxjsItems = $('.breadcrumbs-rxjs__item');
  if (rxjsItems.length > 0) {
    const lastItem = $(rxjsItems[rxjsItems.length - 1]).clone();
    lastItem.find('a, i, div, p').remove();
    const lastText = lastItem.text().trim();
    const colonMatch = lastText.match(/^([^:,]+)/);
    if (colonMatch) addCountry(colonMatch[1]);
  }

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
        addCountry(c);
      }
    }
  }

  const breadcrumbLinks = $('.breadcrumb a, .breadcrumbs a, nav[aria-label="breadcrumb"] a, .breadcrumb li a');
  if (breadcrumbLinks.length > 2) {
    const candidates = [];
    breadcrumbLinks.each((i, el) => {
      candidates.push($(el).text().trim());
    });
    for (let i = Math.min(3, candidates.length - 1); i >= 2; i--) {
      const c = candidates[i];
      if (c && c.length > 2 && c.length < 30 && !/circuito|viaje|inicio|home/i.test(c)) {
        addCountry(c);
      }
    }
  }

  const pathMatch = url.match(/(?:europa|asia|america|africa|oceania)\/([^\/]+)/i);
  if (pathMatch) addCountry(decodeURIComponent(pathMatch[1]).replace(/-/g, ' '));

  const summaryText = $('.header-summary__subtitle').text() || $('.header-summary').text() || $('h1').text() || '';
  const countryMatch = summaryText.match(/^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\s*[,:·]/);
  if (countryMatch) addCountry(countryMatch[1]);

  const cityList = parseCityList(cities);
  const visitedCapitals = [];
  const spanishRegions = new Set();
  for (const city of cityList) {
    const cityKey = normalizeKey(city);
    const capitalCountry = CAPITAL_TO_COUNTRY[cityKey];
    if (capitalCountry) {
      addCountry(capitalCountry);
      visitedCapitals.push(city);
    }
    if (SPAIN_CITY_TO_REGION[cityKey]) {
      spanishRegions.add(SPAIN_CITY_TO_REGION[cityKey]);
    }
  }

  const uniqueCountries = [];
  const countrySeen = new Set();
  for (const c of countryCandidates) {
    const key = normalizeKey(c);
    if (!key || countrySeen.has(key)) continue;
    countrySeen.add(key);
    uniqueCountries.push(c);
  }

  const hasSpain = uniqueCountries.some((c) => normalizeKey(c) === 'espana');
  const visitedCapitalUnique = [];
  const capSeen = new Set();
  for (const city of visitedCapitals) {
    const key = normalizeKey(city);
    if (key && !capSeen.has(key)) {
      capSeen.add(key);
      visitedCapitalUnique.push(city);
    }
  }

  const regionList = [];
  if (hasSpain && spanishRegions.size > 0) {
    for (const region of spanishRegions) regionList.push(region);
  }

  const finalValues = [...uniqueCountries, ...visitedCapitalUnique, ...regionList]
    .map((v) => String(v || '').trim())
    .filter(Boolean);

  return finalValues.join(', ');
}

export function extractCities($, title) {
  const cardCities = new Set();
  $('h3.card-effect-mask-rxjs__title').each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 1 && t.length < 50) cardCities.add(t);
  });
  if (cardCities.size > 0) return [...cardCities].join(', ');

  const imgCities = new Set();
  $('.carousel-rxjs__slide img').each((_, el) => {
    const alt = $(el).attr('alt') || $(el).attr('title') || '';
    const city = alt.trim();
    if (city.length > 1 && city.length < 50 && !/shim|not-available|banner/i.test(city)) {
      imgCities.add(city);
    }
  });
  if (imgCities.size > 0) return [...imgCities].join(', ');

  const colonMatch = (title || '').match(/:\s*(.+)/);
  if (colonMatch) {
    const raw = colonMatch[1]
      .replace(/\d+\s*d[ií]as?/gi, '')
      .replace(/circuito\s*\w*/gi, '')
      .replace(/desde\s+\w+/gi, '')
      .replace(/\s+y\s+/g, ', ')
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 1 && !/viaje|tour|crucero/i.test(c));
    if (raw.length > 0) return raw.join(', ');
  }

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

export function extractOrigins($) {
  const departureContents = $('.summary-product__box-departure-content');
  if (departureContents.length > 1) {
    const originsText = $(departureContents[1]).text().trim();
    if (originsText.length > 3 && !/salida|fecha|enero|febrero/i.test(originsText)) {
      return originsText.replace(/\.{3}$/, '');
    }
  }

  const departureLabels = $('.summary-product__box-departure-label');
  departureLabels.each((_, el) => {
    if (/desde/i.test($(el).text())) {
      const next = $(el).next('.summary-product__box-departure-content');
      if (next.length) {
        const t = next.text().trim();
        if (t.length > 3) return false;
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
