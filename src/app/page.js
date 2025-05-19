"use client";

import { useEffect, useState } from "react";
import TinderCard from "react-tinder-card";

function getDistance(lat1, lon1, lat2, lon2) {
  function toRad(x) { return x * Math.PI / 180 }
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
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
                station.latitude || station.lat,
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

  // Toon ALTIJD de 3 dichtstbijzijnde, met wrap-around:
  const VISIBLE_CARDS = 3;
  const cards = [];
  for (let i = 0; i < VISIBLE_CARDS; i++) {
    if (stations.length === 0) break;
    cards.push(stations[(current + i) % stations.length]);
  }

  // Swipe mag alleen werken op de bovenste kaart
  const onSwipe = (direction) => {
    setCurrent((prev) => (prev + 1) % stations.length);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <div className="relative w-[340px] h-[430px] mb-8">
        {cards.slice(0).reverse().map((station, idx) => (
          <TinderCard
            key={station.id || station.name}
            onSwipe={idx === VISIBLE_CARDS - 1 ? onSwipe : undefined}
            preventSwipe={["up", "down"]}
            className="absolute w-full h-full"
          >
            <div
              className={`
                rounded-2xl shadow-xl bg-white flex flex-col items-center
                transition-all duration-300
                select-none
                ${idx === VISIBLE_CARDS - 1 ? "z-30" : idx === VISIBLE_CARDS - 2 ? "z-20 scale-95 translate-y-6" : "z-10 scale-90 translate-y-12"}
              `}
              style={{
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                userSelect: "none",
                WebkitUserSelect: "none",
                MozUserSelect: "none",
                msUserSelect: "none",
                pointerEvents: "auto",
              }}
            >
              <img
                src={`https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${station.latitude || station.lat},${station.longitude || station.lng}&key=${process.env.NEXT_PUBLIC_STREETVIEW_API_KEY}`}
                onError={e => e.target.src = "/no-streetview.jpg"}
                alt={`Street view van ${station.name}`}
                className="rounded-t-2xl object-cover w-full h-56"
                draggable={false}
                style={{ pointerEvents: "none" }}
              />
              <div className="bg-red-600 text-white w-full text-center p-4 rounded-b-2xl mt-auto">
                <div className="font-semibold text-lg">{station.name}</div>
                <div className="font-bold text-2xl my-1">
                  {(station.afstand * 1000).toFixed(0)}m
                </div>
                <div className="flex justify-around mt-2 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="bg-blue-500 text-white rounded-full px-2 py-1 text-xs font-bold">P</span> {station.empty_slots}
                  </div>
                  <div className="flex items-center gap-1">
                    <span>🚲</span> {station.free_bikes}
                  </div>
                </div>
              </div>
            </div>
          </TinderCard>
        ))}
      </div>
      {/* Knoppen onderaan */}
      <div className="flex justify-center gap-6 mt-4">
        <button className="bg-white text-red-500 rounded-full w-14 h-14 flex items-center justify-center shadow-lg text-3xl select-none" tabIndex={-1}>✗</button>
        <button className="bg-red-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg text-3xl select-none" tabIndex={-1}>⌂</button>
        <button className="bg-white text-red-500 rounded-full w-14 h-14 flex items-center justify-center shadow-lg text-3xl select-none" tabIndex={-1}>♥</button>
      </div>
    </div>
  );
}
