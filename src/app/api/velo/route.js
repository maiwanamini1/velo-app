// src/app/api/velo/route.js

export async function GET() {
  const res = await fetch('https://api.citybik.es/v2/networks/velo-antwerpen');
  const data = await res.json();
  return Response.json(data.network.stations);
}
