"use client";

import { useEffect, useState } from "react";
import SwipeCard from "./components/SwipeCard";

export default function Home() {
  const [stations, setStations] = useState([]);

useEffect(() => {
  fetch("/api/velo")
    .then(res => res.json())
    .then(setStations);
}, []);

  // Toon alleen de eerste station als voorbeeld
  const station = stations[0];
  
console.log("stations:", stations, "station:", station);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {station && (
        <SwipeCard
          station={station}
          onSwipeLeft={() => alert("Volgend station")}
          onSwipeRight={() => alert("Navigatie!")}
        />
      )}
    </div>
  );
}
