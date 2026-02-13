export function extractCategory1($) {
  const subtitle = $('.header-summary__info-subtitle').first();
  let raw = '';
  let subtitlePrefix = '';
  if (subtitle.length) {
    const t = subtitle.text().trim();
    const afterDot = t.match(/\d+\s*[Dd][ií]as?\s*[·•]\s*(.+)/);
    if (afterDot) {
      raw = afterDot[1].trim();
    }
    const prefixMatch = t.match(/^(.+?),?\s*\d+\s*[Dd][ií]as/);
    if (prefixMatch) {
      subtitlePrefix = prefixMatch[1].trim();
    }
  }

  if (!raw) {
    const bodyText = $('body').text();
    const m = bodyText.match(/\d+\s*[Dd][ií]as?\s*[·•]\s*([^\n\r<]{3,40})/);
    if (m) raw = m[1].trim();
  }

  return { raw, subtitlePrefix };
}

export function normalizeCategory1(raw, subtitlePrefix, metaTitle) {
  const t = (raw || '').toLowerCase();
  const prefix = (subtitlePrefix || '').toLowerCase();
  const title = (metaTitle || '').toLowerCase();
  const all = `${t} ${prefix} ${title}`;

  if (/coche|fly.*drive|drive.*fly|self[- ]?drive/i.test(t)) return 'Ruta en coche';
  if (/a tu aire/i.test(t) && /flexible/i.test(t)) return 'Viajes Flexibles';
  if (/a tu aire/i.test(t)) return 'A tu aire';
  if (/terrestre|s[oó]lo circuito/i.test(t)) return 'Sólo Circuito';
  if (/cl[aá]sico/i.test(t)) return 'Circuito clásico';
  if (/privado/i.test(t)) return 'Circuito privado';
  if (/combinado/i.test(t)) return 'Combinados';
  if (/crucero/i.test(t)) return 'Viajes con crucero';
  if (/safari/i.test(t)) return 'Safaris';
  if (/gran viaje/i.test(t)) return 'Grandes Viajes';
  if (/cultural/i.test(t)) return 'Viajes Culturales';
  if (/tren/i.test(t)) return 'Viajes en Tren';
  if (/todo incluido/i.test(t)) return 'Todo incluido';
  if (/isla.*(paradis|ex[oó]tic)|ex[oó]tic.*isla|paradis.*isla/i.test(all)) return 'Islas Exóticas y Playas';
  if (/playa/i.test(t)) return 'Viajes de playa';
  if (/novios/i.test(t)) return 'Viaje de Novios';
  if (/singles/i.test(t)) return 'Viajes Singles';
  if (/\bbus\b|autob[uú]s/i.test(t)) return 'Circuitos en bus';
  if (/escapada/i.test(t)) return 'Escapadas';
  if (/gu[ií]as?|con gu[ií]a/i.test(t)) return 'Con guías';
  if (/familiar/i.test(t)) return 'Viajes con Niños';
  if (/^exploratravel$/i.test(t)) return 'ExploraTravel';
  if (/mayores?\s+de\s+55/i.test(t)) return 'Viajes para Mayores de 55 años';
  if (/mayores|seniors?/i.test(t)) return 'Viajes para Mayores';
  if (/j[oó]venes/i.test(t)) return 'Viajes para Jóvenes';

  if (/vuelta al mundo/i.test(prefix)) return 'Vuelta al mundo';
  if (/disney|legoland|port\s*aventura/i.test(title)) return 'Parques Temáticos';

  if (/semana santa/i.test(all)) return 'Viajes Semana Santa';
  if (/puente de mayo/i.test(all)) return 'Viajes Puente de Mayo';
  if (/puente.*andaluc/i.test(all)) return 'Viajes Puente de Andalucía';
  if (/nochevieja/i.test(all)) return 'Nochevieja';
  if (/fin de a[ñn]o/i.test(all)) return 'Viajes Fin de Año';
  if (/mercadillo.*navidad|navidad/i.test(all)) return 'Viajes Navidad';
  if (/d[ií]a de corpus|corpus/i.test(all)) return 'Viajes Día de Corpus';
  if (/puente/i.test(all)) return 'Puentes';

  return raw || '';
}

export function extractTagCategories($) {
  const tags = [];
  $('.summary-product__box-tag').each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 2 && t.length < 60) tags.push(t);
  });
  return tags;
}
