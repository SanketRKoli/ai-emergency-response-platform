import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Leaflet's default marker images break with bundlers, so we point to them explicitly.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const DEFAULT_CENTER = [12.9716, 77.5946]; // Bengaluru, used only until the user picks a point

function ClickToPlace({ onPick }) {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) });
  return null;
}

// Click or tap the map to place the marker, drag it to adjust, then confirm.
export default function LocationPicker({ initial, onConfirm, onCancel }) {
  const [point, setPoint] = useState(initial || null);

  return (
    <div className="border rounded p-2 bg-white">
      <MapContainer center={point || DEFAULT_CENTER} zoom={point ? 17 : 13} style={{ height: 320, width: '100%' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickToPlace onPick={setPoint} />
        {point && (
          <Marker
            position={point}
            draggable
            eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); setPoint([p.lat, p.lng]); } }}
          />
        )}
      </MapContainer>
      <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
        <span className="small text-secondary flex-grow-1">
          {point ? `Selected: ${point[0].toFixed(5)}, ${point[1].toFixed(5)}` : 'Tap the map to place the marker'}
        </span>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn-primary btn-sm" disabled={!point} onClick={() => onConfirm({ lat: point[0], lng: point[1] })}>Confirm location</button>
      </div>
    </div>
  );
}
