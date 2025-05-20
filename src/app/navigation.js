"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

function toRad(deg) { return deg * Math.PI / 180; }
function toDeg(rad) { return rad * 180 / Math.PI; }
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // meters
}
function getBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(toRad(lon2-lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1))*Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(toRad(lon2-lon1));
  let brng = Math.atan2(y, x);
  brng = toDeg(brng);
  return (brng + 360) % 360;
}

export default function Navigate() {
  const params = useSearchParams();
  const router = useRouter();
  const destLat = parseFloat(params.get("lat"));
  const destLng = parseFloat(params.get("lng"));
  const [distance, setDistance] = useState(null);
  const [bearing, setBearing] = useState(null);
  const [streetName, setStreetName] = useState("");
  const [imageError, setImageError] = useState(false);

  // Haal de straatnaam op via reverse geocoding
  useEffect(() => {
    if (!destLat || !destLng) return;
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${destLat}&lon=${destLng}&format=json`)
      .then(res => res.json())
      .then(data => {
        setStreetName(
          data.address?.road || 
          data.display_name?.split(",")[0] || 
          "Straatnaam niet gevonden"
        );
      })
      .catch(() => setStreetName("Straatnaam niet gevonden"));
  }, [destLat, destLng]);

  // Locatie watching
  useEffect(() => {
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setDistance(getDistance(latitude, longitude, destLat, destLng));
        setBearing(getBearing(latitude, longitude, destLat, destLng));
      },
      (err) => alert("Locatie niet beschikbaar"),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [destLat, destLng]);

  // Streetview image URL
  const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${destLat},${destLng}&key=${process.env.NEXT_PUBLIC_STREETVIEW_API_KEY}`;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center pt-4 relative">
      {/* Return knop */}
      <button
        className="absolute top-4 left-4 z-10 bg-white rounded-full shadow p-2 flex items-center"
        onClick={() => router.back()}
        aria-label="Terug"
      >
        <Icon icon="material-symbols:arrow-back-rounded" width={32} height={32} />
      </button>
      
      <h1 className="text-2xl font-bold mb-3 mt-2">Navigatie</h1>

      {/* Streetview Afbeelding */}
      <div className="w-52 h-52 mb-4 rounded-2xl overflow-hidden shadow">
        {!imageError ? (
          <img
            src={streetViewUrl}
            alt={`Street view van het station`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <img
            src="/no-streetview.jpg"
            alt="Geen Street View"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Straatnaam */}
      <div className="text-lg text-gray-800 font-semibold mb-5">{streetName}</div>

      {distance && (
        <div className="mb-8 text-center">
          <div className="text-5xl font-bold text-[#CF0039]">{Math.round(distance)} m</div>
          <div className="text-gray-700 mt-2">Tot het station</div>
        </div>
      )}

      {/* Kompas-pijl */}
      <div className="flex flex-col items-center">
        <div
          style={{ transform: `rotate(${bearing ?? 0}deg)`, transition: "0.3s" }}
          className="w-28 h-28 flex items-center justify-center"
        >
          <svg width="60" height="60" viewBox="0 0 60 60">
            <polygon points="30,5 55,50 30,40 5,50" fill="#CF0039" />
          </svg>
        </div>
        <div className="text-lg text-gray-700 mt-4">Loop in de richting van de pijl</div>
      </div>
    </div>
  );
}
