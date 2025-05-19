import { getAntwerpStations } from "./lib/velo";

export default async function Home() {
  const stations = await getAntwerpStations();
  const firstThree = stations.slice(0, 3);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Velo-stations in de buurt</h1>
      <ul>
        {firstThree.map(station => (
          <li key={station.id} className="mb-2 p-4 bg-white rounded shadow">
            <div className="font-semibold">{station.name}</div>
            <div>Bikes: {station.free_bikes} | Places: {station.empty_slots}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
