import { getAntwerpStations } from "./lib/velo";


export default async function Home() {
  const stations = await getAntwerpStations();

  return (
    <div>
      <h1>Antwerp Velo stations: {stations.length}</h1>
    </div>
  );
}
