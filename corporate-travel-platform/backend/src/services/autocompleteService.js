// City/airport autocomplete backed by Travelpayouts' free, public
// autocomplete endpoint. It requires no API key at all, so it works
// out-of-the-box even before Amadeus/Travelpayouts credentials are set up.
const logger = require('../utils/logger');

async function fetchLocations(term) {
  const url = new URL('https://autocomplete.travelpayouts.com/places2');
  url.searchParams.set('term', term);
  url.searchParams.set('locale', 'en');
  url.searchParams.set('types[]', 'city');

  const response = await fetch(url);
  if (!response.ok) {
    logger.warn(`Autocomplete upstream returned ${response.status}`);
    return [];
  }

  const raw = await response.json().catch(() => []);

  return raw
    .filter((item) => item.code)
    .map((item) => ({
      code: item.code, // IATA city (or airport) code
      name: item.name,
      cityName: item.city_name || item.name,
      countryName: item.country_name || '',
      type: item.type === 'airport' ? 'airport' : 'city',
      label: item.country_name
        ? `${item.name}, ${item.country_name} (${item.code})`
        : `${item.name} (${item.code})`,
    }));
}

module.exports = { fetchLocations };
