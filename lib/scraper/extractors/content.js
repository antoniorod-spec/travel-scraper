export function extractSection($, keywords) {
  const headings = $('h2, h3, h4, h5, .section-title, .accordion-title, .tab-title');
  for (let i = 0; i < headings.length; i++) {
    const hText = $(headings[i]).text().toLowerCase().trim();
    if (keywords.some((k) => hText.includes(k))) {
      let container = $(headings[i]).next();
      if (!container.length) container = $(headings[i]).parent();

      const items = [];
      container.find('li, p').each((_, el) => {
        const t = $(el).text().trim();
        if (t.length > 3) items.push(t);
      });
      if (items.length > 0) return items.join('\n');

      const directText = container.text().trim();
      if (directText.length > 10) return directText;
    }
  }

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

export function extractHotels($) {
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

export function extractPriceFooter($) {
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

export function extractPrice($) {
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
