// components/SwipeCard.jsx
export default function SwipeCard({ station, onSwipeLeft, onSwipeRight }) {
  return (
    <div className="bg-white shadow-lg rounded-xl p-8 flex flex-col items-center min-w-[300px]">
      <h3 className="text-xl font-bold mb-2">{station.name}</h3>
      <p>🚲 {station.free_bikes} fietsen beschikbaar</p>
      <p>🅿️ {station.empty_slots} vrije plaatsen</p>
      <div className="flex gap-4 mt-6">
        <button
          className="bg-gray-300 rounded-full p-3 text-xl"
          onClick={onSwipeLeft}
          aria-label="Volgende"
        >
          ⬅️
        </button>
        <button
          className="bg-blue-500 rounded-full p-3 text-xl text-white"
          onClick={onSwipeRight}
          aria-label="Navigatie"
        >
          ➡️
        </button>
      </div>
    </div>
  );
}
