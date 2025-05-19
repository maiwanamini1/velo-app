"use client";

import { useEffect, useState } from "react";
import TinderCard from "react-tinder-card";

// Haversine afstand helper
function getDistance(lat1, lon1, lat2, lon2) {
  function toRad(x) { return x * Math.PI / 180 }
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Home() {
  const [stations, setStations] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch("/api/velo")
      .then((res) => res.json())
      .then((data) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const stationsMetAfstand = data.map(station => ({
              ...station,
              afstand: getDistance(
                latitude, longitude,
                station.latitude || station.lat, // voor verschillende API's
                station.longitude || station.lng
              ),
            }));
            stationsMetAfstand.sort((a, b) => a.afstand - b.afstand);
            setStations(stationsMetAfstand);
          },
          () => setStations(data)
        );
      });
  }, []);

  const onSwipe = (direction) => {
    if (direction === "right") {
      alert("Navigatie! 🚴‍♂️");
    }
    setCurrent((i) => (i + 1) % stations.length);
  };

  const station = stations[current];

  // Street View URL genereren
  const streetViewUrl =
    station
      ? `https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${station.latitude || station.lat},${station.longitude || station.lng}&key=${process.env.NEXT_PUBLIC_STREETVIEW_API_KEY}`
      : "";
  console.log(streetViewUrl);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {station && (
        <TinderCard
          key={station.name}
          onSwipe={onSwipe}
          preventSwipe={["up", "down"]}
        >
          <div className="bg-white shadow-xl rounded-2xl p-8 flex flex-col items-center">
            <h2 className="font-bold text-xl mb-2">{station.name}</h2>
            {/* VERVANG HIER DEZE IMG */}
            <img
              src={streetViewUrl}
              onError={e => e.target.src = "/no-streetview.jpeg"} // <- Dit is de fallback!
              alt={`Street view van ${station.name}`}
              className="rounded-xl my-4"
              width={320}
              height={320}
            />
            <p>🚲 {station.free_bikes} fietsen beschikbaar</p>
            <p>🅿️ {station.empty_slots} vrije plaatsen</p>
            <p className="text-xs text-gray-500 mt-2">
              {station.afstand && station.afstand.toFixed(1)} km van jou
            </p>
          </div>
        </TinderCard>
      )}

      <button
        onClick={() => setCurrent((i) => (i + 1) % stations.length)}
        className="mt-8 px-6 py-2 bg-red-500 text-white rounded"
      >
        Volgend station
      </button>
    </div>
  );
}
