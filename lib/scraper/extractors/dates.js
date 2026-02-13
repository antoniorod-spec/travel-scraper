export function extractDaysNights($, url, title) {
  const bodyText = $('body').text();

  let m = bodyText.match(/(\d+)\s*d[ií]as?\s*[\/·,\-]\s*(\d+)\s*noches/i);
  if (m) return { days: parseInt(m[1]), nights: parseInt(m[2]) };

  m = bodyText.match(/(\d+)\s*d[ií]as/i);
  if (m) {
    const d = parseInt(m[1]);
    return { days: d, nights: d - 1 };
  }

  const urlMatch = url.match(/(\d+)[_-]?dias/i);
  if (urlMatch) {
    const d = parseInt(urlMatch[1]);
    return { days: d, nights: d - 1 };
  }

  const titleMatch = (title || '').match(/(\d+)\s*d[ií]as/i);
  if (titleMatch) {
    const d = parseInt(titleMatch[1]);
    return { days: d, nights: d - 1 };
  }

  return { days: '', nights: '' };
}

export function extractDates($) {
  const departureContents = $('.summary-product__box-departure-content');
  if (departureContents.length > 0) {
    const dateText = $(departureContents[0]).text().trim();
    const months =
      'Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre';
    const fromUntil = new RegExp(
      `(${months})\\s+(\\d{4})\\s+hasta\\s+(${months})\\s+(\\d{4})`,
      'i'
    );
    const m = dateText.match(fromUntil);
    if (m) return `${m[1]} ${m[2]} - ${m[3]} ${m[4]}`;

    const re = new RegExp(
      `(${months})\\s+(\\d{4})\\s*[-–a]\\s*(${months})\\s+(\\d{4})`,
      'i'
    );
    const m2 = dateText.match(re);
    if (m2) return `${m2[1]} ${m2[2]} - ${m2[3]} ${m2[4]}`;

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
