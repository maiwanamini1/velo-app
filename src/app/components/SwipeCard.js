// src/app/components/SwipeCard.js
"use client";

import { useState } from "react";

export default function SwipeCard({ station, onSwipeLeft, onSwipeRight }) {
  const [dragX, setDragX] = useState(0);

  // Eenvoudige swipe handlers (later kun je een echte library zoals react-swipeable of framer-motion gebruiken)
  function handleDragStart(e) {
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDrag(e) {
    if (e.clientX) setDragX(e.clientX);
  }
  function handleDragEnd(e) {
    if (e.clientX - dragX < -100) {
      onSwipeLeft();
    } else if (e.clientX - dragX > 100) {
      onSwipeRight();
    }
    setDragX(0);
  }

  return (
    <div
      className="bg-white rounded-xl shadow-lg p-6 mx-auto mt-8 select-none"
      draggable
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      style={{ width: 320, maxWidth: "95%" }}
    >
      <h2 className="text-xl font-bold mb-2">{station.name}</h2>
      <div className="text-gray-700 mb-1">Bikes: {station.free_bikes}</div>
      <div className="text-gray-700 mb-1">Places: {station.empty_slots}</div>
    </div>
  );
}
