"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/shared/utils/cn";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ROMANIA_CENTER: [number, number] = [45.9432, 24.9668];
const DEFAULT_ZOOM = 7;
const PIN_ZOOM = 14;
const FOCUS_ZOOM = 9;

interface Props {
  lat: number | null;
  lng: number | null;
  onChange?: (lat: number, lng: number) => void;
  /** Pan/zoom target (e.g. the selected county's coordinates) that does not place a pin. */
  focus?: [number, number] | null;
  readOnly?: boolean;
  className?: string;
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterOnPin({ lat, lng }: { lat: number; lng: number }) {
  const map = useMapEvents({});
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), PIN_ZOOM));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);
  return null;
}

function FocusView({ focus }: { focus: [number, number] }) {
  const map = useMapEvents({});
  useEffect(() => {
    map.setView(focus, FOCUS_ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);
  return null;
}

function InvalidateSizeOnMount() {
  const map = useMapEvents({});
  useEffect(() => {
    // The map can mount while its dialog is still animating in, so Leaflet
    // measures a stale (often larger) container size and renders tiles past
    // the intended box. Re-measure once the popup has finished opening.
    const timeout = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(timeout);
  }, [map]);

  useEffect(() => {
    // A dialog opening elsewhere on the page scroll-locks <html>/<body>,
    // resizing them to compensate for the hidden scrollbar. Leaflet's panes
    // are positioned from the container size at last measurement, so an
    // always-visible map (e.g. the read-only overview map) desyncs and its
    // tiles/markers appear to jump unless we re-measure on every resize.
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

export function LocationPickerMap({ lat, lng, onChange, focus, readOnly = false, className }: Props) {
  const hasPin = lat != null && lng != null;
  const center: [number, number] = hasPin ? [lat, lng] : ROMANIA_CENTER;

  return (
    <div
      className={cn(
        // isolate confines Leaflet's internal panes (z-index up to 700) to
        // this stacking context — without it they can render above a
        // dialog's backdrop/popup (which sit much lower, at z-40/z-50).
        "relative isolate",
        className ?? "h-56 w-full overflow-hidden rounded-lg border border-border",
      )}
    >
      <MapContainer
        center={center}
        zoom={hasPin ? PIN_ZOOM : DEFAULT_ZOOM}
        scrollWheelZoom={!readOnly}
        dragging={!readOnly}
        doubleClickZoom={!readOnly}
        touchZoom={!readOnly}
        className="h-full w-full rounded-[inherit]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <InvalidateSizeOnMount />
        {!readOnly && onChange && <ClickHandler onChange={onChange} />}
        {hasPin && (
          <Marker
            position={[lat, lng]}
            draggable={!readOnly}
            eventHandlers={
              !readOnly && onChange
                ? {
                    dragend: (e) => {
                      const marker = e.target as L.Marker;
                      const pos = marker.getLatLng();
                      onChange(pos.lat, pos.lng);
                    },
                  }
                : undefined
            }
          />
        )}
        {focus && <FocusView focus={focus} />}
        {hasPin && <RecenterOnPin lat={lat} lng={lng} />}
      </MapContainer>
    </div>
  );
}
