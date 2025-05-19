// src/lib/velo.js
export async function getAntwerpStations() {
  const res = await fetch('https://api.citybik.es/v2/networks/velo-antwerpen');
  if (!res.ok) throw new Error("API error");
  const data = await res.json();
  return data.network.stations;
}
