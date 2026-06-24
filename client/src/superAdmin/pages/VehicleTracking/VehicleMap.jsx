import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const getVehicleIcon = (type) => {
  let iconUrl = "/vehicles/bike.png";

  switch ((type || "").toUpperCase()) {
    case "BUS":
      iconUrl = "/vehicles/bus.png";
      break;
    case "SCOOTY":
    case "BIKE":
      iconUrl = "/vehicles/bike.png";
      break;
    default:
      iconUrl = "/vehicles/bike.png";
  }

  return L.icon({
    iconUrl,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -35],
  });
};

export default function VehicleMap({ vehicles = [] }) {
  const firstVehicle = vehicles.find(
    (v) => v.location?.latitude && v.location?.longitude
  );

  const center = firstVehicle
    ? [
        Number(firstVehicle.location.latitude),
        Number(firstVehicle.location.longitude),
      ]
    : [12.9716, 77.5946];

  return (
    <>
      <style>{`
        .leaflet-pane,
        .leaflet-tile,
        .leaflet-marker-icon,
        .leaflet-marker-shadow,
        .leaflet-tile-container,
        .leaflet-map-pane svg,
        .leaflet-map-pane canvas,
        .leaflet-zoom-box,
        .leaflet-image-layer,
        .leaflet-layer {
          z-index: auto !important;
        }
        .leaflet-control-container .leaflet-top,
        .leaflet-control-container .leaflet-bottom {
          z-index: 400 !important;
        }
      `}</style>

      <div style={{ position: "relative", zIndex: 0, borderRadius: "12px", overflow: "hidden" }}>
        <MapContainer
          center={center}
          zoom={13}
          style={{
            height: "clamp(300px, 50vw, 600px)",
            width: "100%",
            borderRadius: "12px",
          }}
        >
          <TileLayer
            attribution="OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {vehicles.map((vehicle) => {
            const loc = vehicle.location;

            if (!loc?.latitude || !loc?.longitude) return null;

            return (
              <Marker
                key={vehicle.id}
                position={[Number(loc.latitude), Number(loc.longitude)]}
                icon={getVehicleIcon(vehicle.vehicleType)}
              >
                <Popup>
                  <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, lineHeight: 1.6 }}>
                    <strong style={{ fontSize: 14 }}>{vehicle.regNo}</strong>
                    {vehicle.vehicleName && (
                      <div style={{ color: "#6B7280" }}>{vehicle.vehicleName}</div>
                    )}
                    <div>Type: <b>{vehicle.vehicleType}</b></div>
                    <div>Speed: <b>{loc.speed || 0} km/h</b></div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </>
  );
}