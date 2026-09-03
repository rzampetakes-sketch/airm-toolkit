"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Polyline, TileLayer } from "react-leaflet";
import { getAirportCoordinates } from "../lib/airports";

interface RouteMapProps {
  originCode: string;
  destinationCode: string;
}

/**
 * Real Leaflet + OpenStreetMap tiles (no API key needed for OSM's public
 * tile server at demo volume). Uses CircleMarker instead of the default
 * pin icon — react-leaflet's default marker image paths break under
 * webpack/Next.js bundling unless manually patched, and a plain circle
 * avoids that whole class of bug.
 */
export default function RouteMapInner({ originCode, destinationCode }: RouteMapProps) {
  const origin = getAirportCoordinates(originCode);
  const destination = getAirportCoordinates(destinationCode);

  if (!origin || !destination) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg bg-azure-light text-center text-xs text-charcoal/50">
        Route preview unavailable
      </div>
    );
  }

  const bounds: [[number, number], [number, number]] = [origin, destination];

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [24, 24] }}
      scrollWheelZoom={false}
      dragging={false}
      zoomControl={false}
      attributionControl={false}
      className="h-full w-full rounded-lg"
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline positions={bounds} pathOptions={{ color: "#4d84b8", weight: 2, dashArray: "4 6" }} />
      <CircleMarker center={origin} radius={5} pathOptions={{ color: "#4d84b8", fillColor: "#4d84b8", fillOpacity: 1 }} />
      <CircleMarker center={destination} radius={5} pathOptions={{ color: "#1f2933", fillColor: "#1f2933", fillOpacity: 1 }} />
    </MapContainer>
  );
}
