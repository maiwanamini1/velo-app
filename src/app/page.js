"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import TinderCard from "react-tinder-card";
import { Icon } from "@iconify/react";

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
  const [favorites, setFavorites] = useState([]);
  const router = useRouter();

  // Voor de oranje streep onder de afstand (enkel bovenste kaart)
  const distanceRef = useRef(null);
  const [distanceWidth, setDistanceWidth] = useState(0);

  useEffect(() => {
    fetch("/api/velo")
      .then((res) => res.json())
      .then((data) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const stationsMetAfstand = data.map((station) => ({
              ...station,
              afstand: getDistance(
                latitude,
                longitude,
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

  // Na iedere swipe meten we opnieuw de breedte
  useEffect(() => {
    setTimeout(() => {
      setDistanceWidth(distanceRef.current?.offsetWidth ?? 0);
    }, 10);
  }, [current, stations]);

  // Altijd 3 kaarten zichtbaar (wrap-around)
  const VISIBLE_CARDS = 3;
  const cards = [];
  for (let i = 0; i < VISIBLE_CARDS; i++) {
    if (stations.length === 0) break;
    cards.push(stations[(current + i) % stations.length]);
  }

  // Swipe handler (alleen bovenste kaart mag swipen)
  const onSwipe = (direction) => {
    if (direction === "right") {
      // NAVIGATIE!
      const top = cards[VISIBLE_CARDS - 1];
      if (top) {
        router.push(`/navigate?lat=${top.latitude || top.lat}&lng=${top.longitude || top.lng}`);
        return;
      }
    }
    // Anders: gewoon volgende kaart
    setCurrent((prev) => (prev + 1) % stations.length);
  };

  // Knopfuncties:
  const handleDislike = () => setCurrent((prev) => (prev + 1) % stations.length);

  const handleNavigate = () => {
    const top = cards[VISIBLE_CARDS - 1];
    if (!top) return;
    router.push(`/navigate?lat=${top.latitude || top.lat}&lng=${top.longitude || top.lng}`);
  };

  const handleFavorite = () => {
    const top = cards[VISIBLE_CARDS - 1];
    if (!top) return;
    if (!favorites.includes(top.id || top.name)) {
      setFavorites([...favorites, top.id || top.name]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white font-tt">
      <div className="relative w-[340px] h-[460px] mb-8">
        {cards
          .slice(0)
          .reverse()
          .map((station, idx) => {
            const isTop = idx === VISIBLE_CARDS - 1;
            return (
              <TinderCard
                key={station.id || station.name}
                onSwipe={isTop ? onSwipe : undefined}
                preventSwipe={["up", "down"]}
                className={`absolute w-full h-full ${!isTop ? "pointer-events-none" : ""}`}
              >
                <div
                  className={`
                    rounded-2xl shadow-xl bg-white flex flex-col items-center
                    transition-all duration-300 select-none
                    ${
                      isTop
                        ? "z-30"
                        : idx === VISIBLE_CARDS - 2
                        ? "z-20 scale-95 translate-y-6"
                        : "z-10 scale-90 translate-y-12"
                    }
                  `}
                >
                  <img
                    src={`https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${
                      station.latitude || station.lat
                    },${station.longitude || station.lng}&key=${
                      process.env.NEXT_PUBLIC_STREETVIEW_API_KEY
                    }`}
                    onError={(e) => (e.target.src = "/no-streetview.jpg")}
                    alt={`Street view van ${station.name}`}
                    className="rounded-t-2xl object-cover w-full h-full"
                    draggable={false}
                    style={{ pointerEvents: "none" }}
                  />
                  {/* Card Content */}
                  <div className="bg-[#CF0039] w-full flex flex-col items-center pt-4 pb-3 px-2 rounded-b-2xl">
                    {/* Naam */}
                    <div className="text-white font-normal text-lg tracking-tight mb-1">
                      {station.name}
                    </div>
                    {/* Afstand */}
                    <div className="flex flex-col items-center mb-2">
                      <span
                        ref={isTop ? distanceRef : null}
                        className="text-white font-extrabold text-4xl leading-tight"
                        style={{ letterSpacing: "0.5px" }}
                      >
                        {(station.afstand * 1000).toFixed(0)}m
                      </span>
                      <span
                        className="block mt-1 rounded-full"
                        style={{
                          width: isTop ? distanceWidth : 60, // fallback width voor achtergrondkaarten
                          height: 5,
                          background: "#F18A00",
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                    {/* Parking & Fiets */}
                    <div className="flex justify-between items-end w-full px-6 mt-1 mb-1">
                      {/* Parking */}
                      <div className="flex items-end gap-1">
                        <span
                          className="rounded-md px-[8px] py-[1px] font-bold flex items-center justify-center"
                          style={{
                            background: "#005DA4",
                            color: "#FFF",
                            fontSize: 24,
                          }}
                        >
                          P
                        </span>
                        <span className="text-white text-2xl font-semibold">
                          {station.empty_slots}
                        </span>
                      </div>
                      {/* Fiets */}
                      <div className="flex items-end gap-1">
                        <span className="text-white text-2xl font-semibold">
                          {station.free_bikes}
                        </span>
                        <Icon
                          icon="material-symbols:pedal-bike-outline"
                          width={32}
                          height={32}
                          className="text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TinderCard>
            );
          })}
      </div>
      {/* Knoppen onderaan */}
      <div className="flex justify-center items-center gap-8 mt-20 mb-8">
        {/* Dislike */}
        <button
          className="bg-[#CF0039] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg text-3xl select-none"
          tabIndex={-1}
          onClick={handleDislike}
          aria-label="Volgende station"
        >
          <Icon icon="material-symbols:close-small-outline-rounded" width={34} height={34} />
        </button>
        {/* Navigate */}
        <button
          className="bg-[#CF0039] text-white rounded-full w-20 h-20 flex items-center justify-center shadow-xl text-4xl select-none"
          tabIndex={-1}
          onClick={handleNavigate}
          aria-label="Navigatie"
        >
          <Icon icon="material-symbols:directions" width={42} height={42} />
        </button>
        {/* Favorite */}
        <button
          className="bg-[#CF0039] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg text-3xl select-none"
          tabIndex={-1}
          onClick={handleFavorite}
          aria-label="Favoriet"
        >
          <Icon icon="material-symbols:favorite-rounded" width={32} height={32} />
        </button>
      </div>
    </div>
  );
}
