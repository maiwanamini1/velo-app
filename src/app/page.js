"use client";

import { useEffect, useState } from "react";
import SwipeCard from "./components/SwipeCard";

export default function Home() {
  const [stations, setStations] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch("/api/velo")
      .then((res) => res.json())
      .then(setStations);
  }, []);

  const station = stations[current];

  // Swipe left = volgende station (volgende kaart)
  const handleSwipeLeft = () => {
    setCurrent((i) => (i + 1) % stations.length);
  };

  // Swipe right = navigatie (nu even alert, later je navigatie logica)
  const handleSwipeRight = () => {
    alert("Navigatie naar " + station?.name);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      {station && (
        <SwipeCard
          station={station}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
        />
      )}
      <button
        onClick={handleSwipeLeft}
        className="mt-8 px-6 py-2 bg-red-500 text-white rounded-xl shadow-lg"
      >
        Volgend station
      </button>
    </div>
  );
}
