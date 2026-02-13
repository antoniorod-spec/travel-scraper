import { COUNTRY_ALIASES } from './constants';

export function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.\-]/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function splitCountries(text) {
  if (!text) return [];
  return String(text)
    .replace(/\s+y\s+/gi, ', ')
    .replace(/\s+e\s+/gi, ', ')
    .replace(/[;/|]/g, ',')
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c.length > 1);
}

export function normalizeCountryLabel(raw) {
  const cleaned = String(raw || '')
    .replace(/\s*\d+\s*d[ií]as?.*$/i, '')
    .replace(/\b(circuito|viaje|tour|pa[ií]s)\b/gi, '')
    .replace(/[:·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';

  const key = normalizeKey(cleaned);
  if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key];
  return cleaned
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ')
    .trim();
}

export function parseCityList(cities) {
  if (!cities) return [];
  return String(cities)
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

export function capitalize(str) {
  return str
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function buildTitle({ metaTitle, category, category2, country, cities, days }) {
  if (!country && !metaTitle) return '';

  const mainCountry = (country || '').split(',')[0].trim();
  const cat = (category || '').toLowerCase();
  const cityList = (cities || '').split(',').map((c) => c.trim()).filter(Boolean);
  const d = days ? `${days} días` : '';

  const allText = `${cat} ${(category2 || '').toLowerCase()} ${(metaTitle || '').toLowerCase()}`;
  const isCarRental = /a tu aire.*coche|en coche|fly.*drive|drive.*fly|autocar|self[- ]?drive/i.test(allText);
  const isCruise = /crucero/i.test(allText);
  const isCombo = /combinado/i.test(allText);
  const isGrandTour = /gran viaje/i.test(allText);
  const isArchaeological = /arque[oó]l/i.test(allText);
  const isClassic = /cl[aá]sico/i.test(cat);
  const isExpress = /express|exprés/i.test(allText);
  const isComplete = /completo/i.test(allText);
  const isNature = /naturaleza|natural/i.test(allText);
  const isCultural = /cultural/i.test(allText);

  let typeLabel = '';
  if (isCarRental && /fly.*drive|drive.*fly/i.test(allText)) typeLabel = 'Fly and Drive por';
  else if (isCarRental) typeLabel = 'Ruta en Coche por';
  else if (isCruise && isArchaeological) typeLabel = 'Crucero arqueológico por';
  else if (isCruise) typeLabel = 'Crucero por';
  else if (isCombo) typeLabel = 'Viaje combinado a';
  else if (isGrandTour) typeLabel = 'Gran viaje a';
  else if (isArchaeological) typeLabel = 'Ruta arqueológica por';
  else if (isExpress) typeLabel = 'Circuito express por';
  else if (isComplete) typeLabel = 'Circuito completo por';
  else if (isNature) typeLabel = 'Ruta natural por';
  else if (isCultural) typeLabel = 'Ruta cultural por';
  else if (isClassic) typeLabel = 'Circuito clásico por';
  else typeLabel = 'Viaje a';

  if (!mainCountry) return metaTitle ? metaTitle.substring(0, 100) : '';

  let title = `${typeLabel} ${mainCountry}`;

  if (cityList.length > 0) {
    for (let n = Math.min(3, cityList.length); n >= 1; n--) {
      const citiesPart = cityList.slice(0, n).join(', ');
      const candidate = `${title}: ${citiesPart}`;
      const withDays = d ? `${candidate} | ${d}` : candidate;
      if (withDays.length <= 100) {
        title = candidate;
        break;
      }
    }
  }

  if (d) {
    const withDays = `${title} | ${d}`;
    if (withDays.length <= 100) title = withDays;
  }

  if (title.length > 100) title = title.substring(0, 97) + '...';
  return title;
}

export function buildDateText(dates) {
  if (!dates) return '';
  return `Salidas desde ${dates.replace(/\s*-\s*/, ' hasta ')}`;
}
