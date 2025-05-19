import React from 'react';
import { FixedSizeList as List } from 'react-window';

export default function StationsList({ stations }) {
  // Zorg dat stations een array is (kan leeg zijn)
  if (!stations || stations.length === 0) {
    return <div>Geen stations gevonden.</div>;
  }

  return (
    <List
      height={500} // Hoogte van je lijst in pixels
      itemCount={stations.length}
      itemSize={70} // Hoogte van elk lijstitem
      width={'100%'} // Of bv. '360' afhankelijk van je layout
    >
      {({ index, style }) => (
        <div style={style} key={stations[index].id}>
          {/* Render je station-info */}
          <div>
            <strong>{stations[index].name}</strong><br />
            {stations[index].free_bikes} fietsen vrij<br />
            {stations[index].empty_slots} plaatsen vrij
          </div>
        </div>
      )}
    </List>
  );
}
