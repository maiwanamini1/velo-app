import { getAntwerpStations } from "./lib/velo";
import SwipeCard from "./components/SwipeCard";

export default async function Home() {
  const stations = await getAntwerpStations();
  // Je kan nu alvast alleen het eerste station als test tonen
  const [station] = stations;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <SwipeCard
        station={station}
        onSwipeLeft={() => alert("Volgend station")}
        onSwipeRight={() => alert("Navigatie!")}
      />
    </div>
  );
}
