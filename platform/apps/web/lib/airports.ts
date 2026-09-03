/**
 * Coordinates for the airports that appear in mock/demo empty-leg
 * listings, plus common major airports a user might type into search.
 * Not exhaustive — an unrecognized IATA code just means no route map
 * renders for that listing (see RouteMap's fallback).
 */
export const AIRPORT_COORDINATES: Record<string, [number, number]> = {
  TEB: [40.8501, -74.0608],
  PBI: [26.6832, -80.0956],
  LAX: [33.9416, -118.4085],
  ASE: [39.2232, -106.8687],
  MIA: [25.7959, -80.2871],
  JFK: [40.6413, -73.7781],
  LHR: [51.47, -0.4543],
  ORD: [41.9742, -87.9073],
  LAS: [36.084, -115.1537],
  SFO: [37.6213, -122.379],
  DEN: [39.8561, -104.6737],
  ATL: [33.6407, -84.4277],
  DFW: [32.8998, -97.0403],
  BOS: [42.3656, -71.0096],
  IAH: [29.9902, -95.3368],
  SEA: [47.4502, -122.3088],
  MCO: [28.4312, -81.3081],
  EWR: [40.6895, -74.1745],
  IAD: [38.9531, -77.4565],
  VNY: [34.2098, -118.49],
  HPN: [41.0670, -73.7076],
  OPF: [25.9070, -80.2784],
};

export function getAirportCoordinates(iataCode: string): [number, number] | null {
  return AIRPORT_COORDINATES[iataCode.toUpperCase()] ?? null;
}
