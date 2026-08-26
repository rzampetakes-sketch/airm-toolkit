// Converts raw Amadeus flight-offer payloads into the compact shape the
// frontend renders — including the premium-cabin details (baggage,
// amenities) this platform is built around — and attaches a Travelpayouts
// affiliate booking link to each offer.
const travelpayouts = require('./travelpayouts');

// "PT2H35M" -> 155 (minutes)
function isoDurationToMinutes(iso) {
  if (!iso) return 0;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(iso);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  return hours * 60 + minutes;
}

function describeBaggage(fareDetail) {
  const bags = fareDetail?.includedCheckedBags;
  if (!bags) return 'Checked bag allowance not specified by fare';
  if (bags.weight) return `${bags.weight}${bags.weightUnit || 'KG'} checked baggage included`;
  if (typeof bags.quantity === 'number') {
    return bags.quantity > 0
      ? `${bags.quantity} checked bag${bags.quantity > 1 ? 's' : ''} included`
      : 'No checked bags included in this fare';
  }
  return 'Checked bag allowance not specified by fare';
}

function extractAmenities(fareDetail) {
  const amenities = fareDetail?.amenities || [];
  const seen = new Set();
  return amenities
    .filter((a) => {
      if (seen.has(a.description)) return false;
      seen.add(a.description);
      return true;
    })
    .map((a) => ({
      description: a.description,
      isChargeable: Boolean(a.isChargeable),
      category: a.amenityType || 'OTHER',
    }));
}

/**
 * @param {object} amadeusResponse  raw { data, dictionaries } from
 *   POST /v2/shopping/flight-offers
 * @param {object} searchContext  { legs, adults, cabinClass } — the original
 *   search params, needed to build the Travelpayouts booking link
 */
function transformFlightOffers(amadeusResponse, searchContext) {
  const offers = amadeusResponse.data || [];
  const carriers = amadeusResponse.dictionaries?.carriers || {};

  return offers.map((offer) => {
    const itineraries = (offer.itineraries || []).map((itinerary) => {
      const segments = itinerary.segments || [];
      const first = segments[0];
      const last = segments[segments.length - 1];
      return {
        origin: first?.departure?.iataCode,
        destination: last?.arrival?.iataCode,
        departureTime: first?.departure?.at,
        arrivalTime: last?.arrival?.at,
        durationMinutes: isoDurationToMinutes(itinerary.duration),
        stops: Math.max(segments.length - 1, 0),
        segments: segments.map((seg) => ({
          carrierCode: seg.carrierCode,
          carrierName: carriers[seg.carrierCode] || seg.carrierCode,
          flightNumber: `${seg.carrierCode}${seg.number}`,
          departureAirport: seg.departure?.iataCode,
          arrivalAirport: seg.arrival?.iataCode,
          departureTime: seg.departure?.at,
          arrivalTime: seg.arrival?.at,
        })),
      };
    });

    const firstTravelerFareDetails = offer.travelerPricings?.[0]?.fareDetailsBySegment || [];
    const primaryFareDetail = firstTravelerFareDetails[0] || {};
    const firstSegment = itineraries[0]?.segments?.[0];

    return {
      id: offer.id,
      cabinClass: primaryFareDetail.cabin || searchContext.cabinClass,
      airlineCode: firstSegment?.carrierCode || offer.validatingAirlineCodes?.[0] || '',
      airlineName: firstSegment?.carrierName || offer.validatingAirlineCodes?.[0] || '',
      itineraries,
      totalDurationMinutes: itineraries.reduce((sum, it) => sum + it.durationMinutes, 0),
      totalStops: itineraries.reduce((sum, it) => sum + it.stops, 0),
      baggageAllowance: describeBaggage(primaryFareDetail),
      amenities: extractAmenities(primaryFareDetail),
      price: Number(offer.price?.grandTotal ?? offer.price?.total ?? 0),
      pricePerTraveler: Number(offer.travelerPricings?.[0]?.price?.total ?? 0),
      currency: offer.price?.currency || 'USD',
      seatsAvailable: offer.numberOfBookableSeats ?? null,
      bookingUrl: travelpayouts.buildFlightBookingUrl(searchContext.legs, searchContext.adults),
    };
  });
}

module.exports = { transformFlightOffers, isoDurationToMinutes };
