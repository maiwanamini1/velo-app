"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import TinderCard from "react-tinder-card";
import { Icon } from "@iconify/react";

function getDistance(lat1, lon1, lat2, lon2) {
  function toRad(x) { return x * Math.PI / 180 }
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Home() {
  const [stations, setStations] = useState([]);
  const [current, setCurrent] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [search, setSearch] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState("distance");
  const searchInputRef = useRef(null);

  const router = useRouter();
  const distanceRef = useRef(null);
  const [distanceWidth, setDistanceWidth] = useState(0);

  // Infinite scroll state
  const [displayCount, setDisplayCount] = useState(15);
  const scrollListRef = useRef(null);

  // Haal stations op
  useEffect(() => {
    fetch("/api/velo")
      .then((res) => res.json())
      .then((data) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const stationsMetAfstand = data.map((station) => ({
              ...station,
              afstand: getDistance(
                latitude,
                longitude,
                station.latitude || station.lat,
                station.longitude || station.lng
              ),
            }));
            stationsMetAfstand.sort((a, b) => a.afstand - b.afstand);
            setStations(stationsMetAfstand);
          },
          () => setStations(data)
        );
      });
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setDistanceWidth(distanceRef.current?.offsetWidth ?? 0);
    }, 10);
  }, [current, stations]);

  // FILTER & SORT
  let filteredStations = stations.filter(station => {
    const matchesSearch =
      station.name.toLowerCase().includes(search.toLowerCase()) ||
      (station.extra?.address?.toLowerCase().includes(search.toLowerCase()));
    const isFav = favorites.includes(station.id || station.name);
    if (showFavoritesOnly) {
      return matchesSearch && isFav;
    }
    return matchesSearch;
  });
  if (sortBy === "distance") {
    filteredStations.sort((a, b) => (a.afstand ?? 0) - (b.afstand ?? 0));
  } else if (sortBy === "name") {
    filteredStations.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "status") {
    filteredStations.sort((a, b) => (a.status === b.status) ? 0 : a.status === "OPEN" ? -1 : 1);
  }

  // --- Reset visible list count bij nieuwe zoekopdracht/modal ---
  useEffect(() => {
    if (showSearchModal) {
      setDisplayCount(15);
    }
  }, [search, showSearchModal, showFavoritesOnly]);

  // Cards uit gefilterde lijst!
  const VISIBLE_CARDS = 3;
  const cards = [];
  for (let i = 0; i < VISIBLE_CARDS; i++) {
    if (filteredStations.length === 0) break;
    cards.push(filteredStations[(current + i) % filteredStations.length]);
  }

  // Swipe, navigation, favorites
  const onSwipe = (direction) => {
    if (direction === "right") {
      const top = cards[0];
      if (top) {
        router.push(`/navigate?lat=${top.latitude || top.lat}&lng=${top.longitude || top.lng}&name=${encodeURIComponent(top.name)}`);
        return;
      }
    }
    setCurrent((prev) => (prev + 1) % filteredStations.length);
  };

  const handleDislike = () => setCurrent((prev) => (prev + 1) % filteredStations.length);

  const handleNavigate = () => {
    const top = cards[0];
    if (!top) return;
    router.push(`/navigate?lat=${top.latitude || top.lat}&lng=${top.longitude || top.lng}&name=${encodeURIComponent(top.name)}`);
  };

  // Favorite op de kaart!
  const handleFavorite = () => {
    const top = cards[0];
    if (!top) return;
    const favId = top.id || top.name;
    if (favorites.includes(favId)) {
      setFavorites(favorites.filter(f => f !== favId));
    } else {
      setFavorites([...favorites, favId]);
    }
  };

  function isCardFavorite(station) {
    return favorites.includes(station.id || station.name);
  }

  useEffect(() => {
    if (showSearchModal) {
      setTimeout(() => searchInputRef.current?.focus(), 120);
    }
  }, [showSearchModal]);

  // INFINITE SCROLL HANDLER
  const handleScroll = useCallback(() => {
    const el = scrollListRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      setDisplayCount(count => {
        if (count >= filteredStations.length) return count;
        return count + 15;
      });
    }
  }, [filteredStations.length]);

  // === HANDLERS ===
  function openSearchModal(favoritesOnly = false) {
    setShowFavoritesOnly(favoritesOnly);
    setShowSearchModal(true);
    setTimeout(() => searchInputRef.current?.focus(), 120);
  }

  function closeModal() {
    setShowSearchModal(false);
    setShowFavoritesOnly(false);
    setSearch("");
  }

  function handleListNavigation(station) {
    setShowSearchModal(false);
    setShowFavoritesOnly(false);
    setTimeout(() => {
      router.push(`/navigate?lat=${station.latitude || station.lat}&lng=${station.longitude || station.lng}&name=${encodeURIComponent(station.name)}`);
    }, 100);
  }

  // ----- COMPONENT -----
  return (
    <div className="flex flex-col items-center min-h-screen bg-white font-tt px-4 pb-8">
      {/* Searchbar + FAVORIETEN */}
      <div className="flex items-center w-full max-w-md mt-6 mb-3 gap-3">
        <div
          className="flex flex-1 items-center bg-[#F5F5F5] rounded-full shadow px-4 py-2 cursor-text"
          onClick={() => openSearchModal(false)}
        >
          <Icon icon="material-symbols:search" width={22} className="text-gray-500 mr-2" />
          <input
            type="text"
            ref={searchInputRef}
            placeholder="Zoek een Velo-station of adres"
            className="bg-transparent outline-none flex-1 text-base"
            value={search}
            readOnly
          />
        </div>
        {/* Favorieten-knop */}
        <button
          className={`ml-2 bg-white rounded-full shadow w-10 h-10 flex items-center justify-center transition hover:bg-gray-100`}
          onClick={() => openSearchModal(true)}
          aria-label="Toon favorieten"
        >
          <Icon
            icon="material-symbols:favorite-rounded"
            width={28}
            className={"text-[#CF0039]"}
            style={{ fill: "#CF0039" }}
          />
        </button>
      </div>

      {/* Titel */}
      <div className="w-full max-w-md mb-2 mt-2 text-xl font-semibold text-black">
        Velo-stations in de buurt
      </div>

      {/* Swipe Cards */}
      <div className="relative w-[340px] h-[420px] mb-8">
        {cards.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
            Geen stations gevonden
          </div>
        ) : (
          cards
            .slice(0)
            .reverse()
            .map((station, idx) => {
              const isTop = idx === VISIBLE_CARDS - 1;
              return (
                <TinderCard
                  key={`${station.id || station.name}-${idx}`}
                  onSwipe={isTop ? onSwipe : undefined}
                  preventSwipe={["up", "down"]}
                  className={`absolute w-full h-full ${!isTop ? "pointer-events-none" : ""}`}
                >
                  <div
                    className={`
                      rounded-2xl shadow-xl bg-white flex flex-col items-center
                      transition-all duration-300 select-none
                      ${isTop
                        ? "z-30"
                        : idx === VISIBLE_CARDS - 2
                          ? "z-20 scale-95 translate-y-6"
                          : "z-10 scale-90 translate-y-12"
                      }
                    `}
                  >
                    {/* IMAGE */}
                    <img
                      src={`https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${station.latitude || station.lat
                        },${station.longitude || station.lng}&key=${process.env.NEXT_PUBLIC_STREETVIEW_API_KEY
                        }`}
                      onError={(e) => (e.target.src = "/no-streetview.jpeg")}
                      alt={`Street view van ${station.name}`}
                      className="rounded-t-2xl object-cover w-full h-full"
                      draggable={false}
                      style={{ pointerEvents: "none" }}
                    />
                    {/* CARD CONTENT */}
                    <div className="bg-[#CF0039] w-full flex flex-col items-center pt-2 pb-4 px-2 rounded-b-2xl shadow">
                      {/* Naam + favoriet-icoon alleen als favoriet */}
                      <div className="relative w-full flex items-center justify-center mb-1">
                        <span className="text-white font-normal text-lg tracking-tight text-center w-full block">
                          {station.name}
                        </span>
                        {isCardFavorite(station) && (
                          <span className="absolute right-5 top-1/2 -translate-y-1/2">
                            <Icon
                              icon="material-symbols:favorite-rounded"
                              width={22}
                              height={22}
                              className="text-[#F18A00]"
                              style={{ fill: "#F18A00" }}
                            />
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-center mb-2">
                        <span
                          ref={isTop ? distanceRef : null}
                          className="text-white font-extrabold text-4xl leading-tight"
                          style={{ letterSpacing: "0.5px" }}
                        >
                          {(station.afstand * 1000).toFixed(0)}<span className="text-lg font-bold">m</span>
                        </span>
                        <span
                          className="block mt-1 rounded-full"
                          style={{
                            width: isTop ? distanceWidth : 60,
                            height: 5,
                            background: "#F18A00",
                            transition: "width 0.3s",
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center w-full px-6 mt-1 mb-1">
                        <div className="flex items-end gap-3">
                          <span
                            className="rounded-md px-[8px] py-[1px] font-bold flex items-center justify-center"
                            style={{
                              background: "#005DA4",
                              color: "#FFF",
                              fontSize: 22,
                            }}
                          >
                            P
                          </span>
                          <span className="text-white text-xl font-bold">
                            {station.empty_slots}
                          </span>
                        </div>
                        <div className="flex items-end gap-2">
                          <span className="text-white text-xl font-bold">
                            {station.free_bikes}
                          </span>
                          <Icon
                            icon="material-symbols:pedal-bike-outline"
                            width={28}
                            height={28}
                            className="text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TinderCard>
              );
            })
        )}
      </div>

      {/* BUTTONS onderaan (gecentreerd) */}
      <div className="flex justify-center items-center gap-10 mt-32 mb-10">
        <button
          className="bg-[#CF0039] text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg text-3xl select-none"
          tabIndex={-1}
          onClick={handleDislike}
          aria-label="Volgende station"
        >
          <Icon icon="material-symbols:close-small-outline-rounded" width={38} height={38} />
        </button>
        <button
          className="bg-[#CF0039] text-white rounded-full w-20 h-20 flex items-center justify-center shadow-xl text-4xl select-none"
          tabIndex={-1}
          onClick={handleNavigate}
          aria-label="Navigatie"
        >
          <Icon icon="material-symbols:directions" width={48} height={48} />
        </button>
        <button
          className="bg-[#CF0039] text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg text-3xl select-none"
          tabIndex={-1}
          onClick={handleFavorite}
          aria-label="Favoriet"
        >
          <Icon icon="material-symbols:favorite-rounded" width={32} height={32} />
        </button>
      </div>

      {/* ---- SEARCH / FAVORITES MODAL OVERLAY ---- */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center">
          <div className="w-full max-w-md bg-white rounded-b-2xl shadow-xl p-0 min-h-[80vh] relative animate-slide-up">
            {/* ---- SEARCHBAR bovenaan (identiek als home!) ---- */}
            <div className="flex items-center w-full max-w-md mt-6 mb-3 gap-3">
              <div className="flex flex-1 items-center bg-[#F5F5F5] rounded-full shadow px-4 py-2">
                <Icon icon="material-symbols:search" width={22} className="text-gray-500 mr-2" />
                <input
                  type="text"
                  ref={searchInputRef}
                  placeholder="Zoek een Velo-station of adres"
                  className="bg-transparent outline-none flex-1 text-base"
                  value={search}
                  autoFocus
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {/* Alleen sluitknop */}
              <button
                className="ml-2 bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center shadow hover:bg-gray-200 transition"
                onClick={closeModal}
                aria-label="Sluit"
              >
                <Icon icon="material-symbols:close-rounded" width={24} className="text-gray-700" />
              </button>
            </div>
            {/* FILTER BUTTONS */}
            <div className="flex items-center bg-gray-100 rounded-full p-1 mb-3 shadow-sm">
              {["distance", "name", "status"].map(f => (
                <button
                  key={f}
                  onClick={() => setSortBy(f)}
                  className={`
                    flex-1 rounded-full px-2 py-1 font-semibold text-base
                    transition-all
                    ${sortBy === f
                      ? "bg-[#CF0039] text-white shadow"
                      : "bg-transparent text-gray-800"}
                  `}
                >
                  {f === "distance" ? "Afstand" : f === "name" ? "Naam" : "Status"}
                </button>
              ))}
            </div>
            {/* STATIONS LIJST - zwart tekst & scroll + infinite scroll */}
            <div
              className="divide-y max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 pr-1"
              ref={scrollListRef}
              onScroll={handleScroll}
            >
              {filteredStations.length > 0 ? filteredStations.slice(0, displayCount).map(station => (
                <div
                  key={station.id || station.name}
                  className="flex flex-col py-3 cursor-pointer hover:bg-gray-50 rounded-lg px-1 transition"
                  onClick={() => handleListNavigation(station)}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-black font-extrabold text-2xl min-w-[54px]">
                      {Math.round((station.afstand ?? 0) * 1000)}<span className="text-base font-bold">m</span>
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center font-bold text-base text-black">{station.name}</div>
                      <div className="text-black text-sm leading-tight">
                        {station.extra && station.extra.address}
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <span className="bg-[#005DA4] text-white rounded px-2 py-0.5 text-sm font-bold">P</span>
                          <span className="font-semibold text-base text-black">{station.empty_slots}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Icon icon="material-symbols:pedal-bike-outline" width={20} className="text-[#CF0039]" />
                          <span className="font-semibold text-base text-black">{station.free_bikes}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center text-gray-500 py-8">Geen stations gevonden</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
