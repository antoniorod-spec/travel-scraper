import * as cheerio from 'cheerio';
import { extractMetaTitle, extractMetaDescription } from './extractors/meta.js';
import { extractCountries, extractCities, extractOrigins } from './extractors/geography.js';
import { extractDaysNights, extractDates } from './extractors/dates.js';
import { extractImages } from './extractors/images.js';
import { extractCategory1, normalizeCategory1, extractTagCategories } from './extractors/categories.js';
import { extractSection, extractHotels, extractPriceFooter, extractPrice } from './extractors/content.js';
import { extractItineraryDays, extractItineraryTexts } from './extractors/itinerary.js';
import { buildTitle, buildDateText } from './utils.js';

/**
 * Main parser: receives raw HTML + original URL, returns structured data.
 */
export function parseCircuitPage(html, url) {
  const $ = cheerio.load(html);
  const data = {};

  data.url = url;
  data.metaTitle = extractMetaTitle($);
  data.metaDescription = extractMetaDescription($);
  data.cities = extractCities($, data.metaTitle);
  data.countries = extractCountries($, url, data.cities);

  const dn = extractDaysNights($, url, data.metaTitle);
  data.days = dn.days;
  data.nights = dn.nights;

  data.travelDates = extractDates($);

  const imgs = extractImages($, url);
  data.imageBanner = imgs.banner;
  data.imageSmall = imgs.small;

  data.origins = extractOrigins($);

  const cat1Info = extractCategory1($);
  data.category1 = normalizeCategory1(cat1Info.raw, cat1Info.subtitlePrefix, data.metaTitle);

  const tagCats = extractTagCategories($);
  data.category2 = tagCats[0] || '';
  data.category3 = tagCats[1] || '';
  data.extraCategories = tagCats.slice(2);

  data.title = buildTitle({
    metaTitle: data.metaTitle,
    category: data.category1,
    category2: data.category2,
    country: data.countries,
    cities: data.cities,
    days: data.days,
  });

  data.dateText = buildDateText(data.travelDates);
  data.circuitType = 8;

  data.tripIncludes = extractSection($, [
    'el viaje incluye', 'el precio incluye', 'incluye', 'servicios incluidos',
  ]);

  data.excursionsIncluded = extractSection($, [
    'excursiones incluidas', 'visitas incluidas',
  ]);

  data.excursionsOptional = extractSection($, [
    'excursiones opcionales', 'visitas opcionales', 'facultativas',
  ]);

  data.hotels = extractHotels($);
  data.priceFooter = extractPriceFooter($);
  data.shortDescription = data.metaDescription || `Descubre ${data.metaTitle || 'este circuito'} en un viaje organizado.`;
  data.price = extractPrice($);

  data.regionalConfig = 1;
  data.promotions = 1;
  data.provider = 14;
  data.catalogOrigins = 593;

  data.itineraryDays = extractItineraryDays($);
  data.itineraryTexts = extractItineraryTexts($);

  return data;
}
