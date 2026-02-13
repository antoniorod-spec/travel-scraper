export function extractItineraryDays($) {
  const days = [];

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

export function extractItineraryTexts($) {
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

      const clone = $(el).clone();
      clone.find('h3, h4, h5, .day-title, .title, .accordion-title').remove();
      const body = clone.text().trim().replace(/\s+/g, ' ');

      if (title || body) {
        const combined = title + (body ? ': ' + body : '');
        texts.push('{' + combined);
      }
    });
  }

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
