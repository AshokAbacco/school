import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// ✅ FIX 1: Import Leaflet CSS — without this, markers are invisible
import "leaflet/dist/leaflet.css";

// ✅ FIX 2: Fix broken default icon paths in Vite (Webpack-style imports don't work)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const API_URL = import.meta.env.VITE_API_URL;

// ✅ FIX 5: Auto-recenter map when devices load
const MapAutoCenter = ({ devices }) => {
  const map = useMap();

  useEffect(() => {
    // ✅ Find first device with valid non-zero coords
    const validDevice = devices.find(
      (d) =>
        d.latitude &&
        d.longitude &&
        d.latitude !== 0 &&
        d.longitude !== 0
    );

    if (validDevice) {
      map.setView(
        [validDevice.latitude, validDevice.longitude],
        14 // zoom in closer for a single bus
      );
    }
  }, [devices, map]);

  return null;
};

const TrackingMap = () => {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState(null);

  const fetchLocations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tracking/all`);
      const result = await response.json();

      console.log("API response:", result); // ✅ Debug log

      if (result.success) {
        setDevices(result.data || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    // ✅ FIX 4: Explicit height in pixels, not just h-full
    <div style={{ width: "100%", height: "100%" }}>
      <MapContainer
        center={[12.9716, 77.5946]}
        zoom={12}
        // ✅ FIX 4: inline style guarantees height is applied
       style={{
        width: "100%",
        height: "100%",
        minHeight: "400px",
        zIndex: 1,
      }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ✅ FIX 5: Auto-recenter helper */}
        <MapAutoCenter devices={devices} />

      {devices.map((device) => {
        const latitude = parseFloat(device.latitude);
        const longitude = parseFloat(device.longitude);

        // ✅ Skip null, NaN, AND zero coordinates
        if (
          isNaN(latitude) ||
          isNaN(longitude) ||
          latitude === 0 ||
          longitude === 0
        ) {
          return null;
        }

        return (
          <Marker key={String(device.id)} position={[latitude, longitude]}>
            <Popup>
              <div style={{ fontSize: 13 }}>
                <strong>Device:</strong> {device.deviceId}<br />
                <strong>Lat:</strong> {latitude.toFixed(6)}<br />
                <strong>Lng:</strong> {longitude.toFixed(6)}<br />
                {device.speed != null && <><strong>Speed:</strong> {device.speed} km/h<br /></>}
                {device.battery != null && <><strong>Battery:</strong> {device.battery}%<br /></>}
              </div>
            </Popup>
          </Marker>
        );
      })}
      </MapContainer>

      {/* ✅ Debug overlay — remove after confirming markers show */}
      {error && (
        <div className="absolute top-2 left-2 bg-red-500 text-white p-2 rounded text-xs z-50">
          Error: {error}
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-black/60 text-white p-2 rounded text-xs z-50">
        Devices loaded: {devices.length}
      </div>
    </div>
  );
};

export default TrackingMap;