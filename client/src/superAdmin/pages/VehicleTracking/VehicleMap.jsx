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
<MapContainer
center={center}
zoom={13}
style={{
height: "500px",
width: "100%",
borderRadius: "12px",
}}
> <TileLayer
     attribution="OpenStreetMap"
     url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
   />

 
  {vehicles.map((vehicle) => {
    const loc = vehicle.location;

    if (!loc?.latitude || !loc?.longitude) return null;

    return (
      <Marker
        key={vehicle.id}
        position={[
          Number(loc.latitude),
          Number(loc.longitude),
        ]}
        icon={getVehicleIcon(vehicle.vehicleType)}
      >
        <Popup>
          <div>
            <strong>{vehicle.regNo}</strong>
            <br />
            {vehicle.vehicleName}
            <br />
            Type: {vehicle.vehicleType}
            <br />
            Speed: {loc.speed || 0} km/h
          </div>
        </Popup>
      </Marker>
    );
  })}
</MapContainer>
 

);
}
