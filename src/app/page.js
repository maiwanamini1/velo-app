"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import TinderCard from "react-tinder-card";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";

// Afstand berekenen
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

const CARD_STACK = 3;

export default function Home() {
  const [stations, setStations] = useState([]);
  const [current, setCurrent] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [search, setSearch] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState("distance");
  const [highlightX, setHighlightX] = useState(0);
  const [highlightW, setHighlightW] = useState(0);
  const filterRefs = [useRef(), useRef(), useRef()];
  const searchInputRef = useRef(null);

  const router = useRouter();
  const distanceRef = useRef(null);
  const [distanceWidth, setDistanceWidth] = useState(0);
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

  // Filter & sort
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
  }

  useEffect(() => {
    if (showSearchModal) setDisplayCount(15);
  }, [search, showSearchModal, showFavoritesOnly]);

  // Voor filter highlight bar animatie
  useEffect(() => {
    const idx = ["distance", "name", "favorites"].indexOf(sortBy);
    const ref = filterRefs[idx].current;
    if (ref) {
      setHighlightX(ref.offsetLeft);
      setHighlightW(ref.offsetWidth);
    }
  }, [sortBy, showSearchModal]);

  // Card Stack (fix jump: render nooit meer kaarten dan unieke stations!)
  const cardCount = Math.min(CARD_STACK, filteredStations.length);
  const cards = [];
  for (let i = 0; i < cardCount; i++) {
    cards.push(filteredStations[(current + i) % filteredStations.length]);
  }
  const [swipeKey, setSwipeKey] = useState(0);

  function doSwipe(direction) {
    if (direction === "right") {
      const top = cards[0];
      if (top) {
        router.push(`/navigate?lat=${top.latitude || top.lat}&lng=${top.longitude || top.lng}&name=${encodeURIComponent(top.name)}`);
        setCurrent((prev) => (prev + 1) % filteredStations.length);
        setSwipeKey(swipeKey + 1);
        return;
      }
    }
    setCurrent((prev) => (prev + 1) % filteredStations.length);
    setSwipeKey(swipeKey + 1);
  }
  const handleDislike = () => doSwipe("left");
  const handleNavigate = () => {
    const top = cards[0];
    if (!top) return;
    router.push(`/navigate?lat=${top.latitude || top.lat}&lng=${top.longitude || top.lng}&name=${encodeURIComponent(top.name)}`);
  };
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
    if (showSearchModal) setTimeout(() => searchInputRef.current?.focus(), 120);
  }, [showSearchModal]);

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

  function openSearchModal(favoritesOnly = false) {
    setShowFavoritesOnly(favoritesOnly);
    setShowSearchModal(true);
    setSortBy(favoritesOnly ? "favorites" : "distance");
    setTimeout(() => searchInputRef.current?.focus(), 120);
  }
  function closeModal() {
    setShowSearchModal(false);
    setShowFavoritesOnly(false);
    setSortBy("distance");
    setSearch("");
  }
  function handleListNavigation(station) {
    setShowSearchModal(false);
    setShowFavoritesOnly(false);
    setSortBy("distance");
    setTimeout(() => {
      router.push(`/navigate?lat=${station.latitude || station.lat}&lng=${station.longitude || station.lng}&name=${encodeURIComponent(station.name)}`);
    }, 100);
  }

  // BUTTON ANIMATIONS
  const buttonSpring = { type: "spring", stiffness: 440, damping: 18 };
  const buttonMotion = {
    whileHover: { scale: 1.11, rotate: -3 },
    whileTap: { scale: 0.92, rotate: 2 },
    transition: buttonSpring
  };

  // Modal dropdown animatie
  const modalVariants = {
    hidden: { y: -50, opacity: 0, scaleY: 0.95, pointerEvents: "none" },
    visible: { y: 0, opacity: 1, scaleY: 1, pointerEvents: "auto", transition: { type: "spring", stiffness: 280, damping: 30 } }
  };

  // ---- RENDER ----
  return (
    <div className="flex flex-col items-center min-h-screen bg-white font-tt px-4 pb-8">
      {/* Searchbar */}
      <div className="pt-6 mb-2 w-full flex flex-col items-center">
        <div className="flex items-center w-full max-w-md gap-3 bg-transparent">
          <div
            className="flex flex-1 items-center bg-[#F5F5F5] rounded-full shadow px-4 h-12 cursor-text"
            onClick={() => openSearchModal(false)}
            style={{ minHeight: 48 }}
          >
            <Icon icon="material-symbols:search" width={22} className="text-gray-500 mr-2" />
            <input
              type="text"
              ref={searchInputRef}
              placeholder="Zoek een Velo-station of adres"
              className="bg-transparent outline-none flex-1 text-base"
              value={search}
              readOnly
              style={{ height: 32 }}
            />
          </div>
          <motion.button
            {...buttonMotion}
            className="ml-2 bg-[#F5F5F5] rounded-full shadow w-12 h-12 flex items-center justify-center transition hover:bg-gray-200"
            onClick={() => openSearchModal(true)}
            aria-label="Toon favorieten"
            style={{ minWidth: 48, minHeight: 48 }}
          >
            <Icon
              icon="material-symbols:favorite-rounded"
              width={28}
              className={"text-[#CF0039]"}
              style={{ fill: "#CF0039" }}
            />
          </motion.button>
        </div>
      </div>
      {/* Titel */}
      <div className="w-full max-w-md mb-2 mt-2 text-xl font-semibold text-black">
        Velo-stations in de buurt
      </div>

      {/* Card Stack */}
      <div className="relative w-[340px] h-[420px] mb-8">
        {filteredStations.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
            Geen stations gevonden
          </div>
        ) : (
          <div className="absolute w-full h-full">
            {cards.map((station, i) => {
              const stackPos = i;
              return (
                <motion.div
                  layout // zorgt voor vloeiende overgang
                  key={station.id || station.name}
                  initial={{
                    scale: 0.95 + 0.025 * (CARD_STACK - 1 - stackPos),
                    y: 36 * (CARD_STACK - 1 - stackPos),
                    zIndex: 10 + (CARD_STACK - stackPos),
                    opacity: stackPos === 0 ? 1 : 0.96
                  }}
                  animate={{
                    scale: 1 - 0.04 * stackPos,
                    y: 24 * stackPos,
                    zIndex: 10 + (CARD_STACK - stackPos),
                    opacity: 1
                  }}
                  exit={{
                    scale: 0.93,
                    y: -60,
                    opacity: 0
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 270,
                    damping: 28,
                    opacity: { duration: 0.2 }
                  }}
                  className={`absolute w-full h-full select-none`}
                  style={{ left: 0, top: 0, pointerEvents: stackPos === 0 ? "auto" : "none" }}
                >
                  <TinderCard
                    onSwipe={stackPos === 0 ? doSwipe : undefined}
                    preventSwipe={["up", "down"]}
                    className="w-full h-full"
                  >
                    <CardInner
                      station={station}
                      isTop={stackPos === 0}
                      distanceRef={stackPos === 0 ? distanceRef : null}
                      distanceWidth={distanceWidth}
                      isCardFavorite={isCardFavorite}
                    />
                  </TinderCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* BUTTONS onderaan */}
      <div className="flex justify-center items-center gap-10 mt-32 mb-10">
        <motion.button {...buttonMotion}
          className="bg-[#CF0039] text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg text-3xl select-none"
          tabIndex={-1}
          onClick={handleDislike}
          aria-label="Volgende station"
        >
          <Icon icon="material-symbols:close-small-outline-rounded" width={38} height={38} />
        </motion.button>
        <motion.button {...buttonMotion}
          className="bg-[#CF0039] text-white rounded-full w-20 h-20 flex items-center justify-center shadow-xl text-4xl select-none"
          tabIndex={-1}
          onClick={handleNavigate}
          aria-label="Navigatie"
        >
          <Icon icon="material-symbols:directions" width={48} height={48} />
        </motion.button>
        <motion.button {...buttonMotion}
          className="bg-[#CF0039] text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg text-3xl select-none"
          tabIndex={-1}
          onClick={handleFavorite}
          aria-label="Favoriet"
        >
          <Icon icon="material-symbols:favorite-rounded" width={32} height={32} />
        </motion.button>
      </div>

      {/* MODAL (Zoek & Favorieten) */}
      <AnimatePresence>
        {showSearchModal && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.17 } }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="w-full max-w-md bg-white rounded-b-2xl shadow-xl p-0 min-h-[80vh] relative animate-slide-up px-4"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={modalVariants}
            >
              {/* Searchbar in modal */}
              <div className="pt-6 mb-2 w-full flex flex-col items-center">
                <div className="flex items-center w-full max-w-md gap-3 bg-transparent">
                  <div className="flex flex-1 items-center bg-[#F5F5F5] rounded-full shadow px-4 h-12">
                    <Icon icon="material-symbols:search" width={22} className="text-gray-500 mr-2" />
                    <input
                      type="text"
                      ref={searchInputRef}
                      placeholder="Zoek een Velo-station of adres"
                      className="bg-transparent outline-none flex-1 text-base"
                      value={search}
                      autoFocus
                      onChange={e => setSearch(e.target.value)}
                      style={{ height: 32 }}
                    />
                  </div>
                  <motion.button
                    {...buttonMotion}
                    className="ml-2 bg-[#F5F5F5] rounded-full shadow w-12 h-12 flex items-center justify-center transition hover:bg-gray-200"
                    onClick={closeModal}
                    aria-label="Sluit"
                    style={{ minWidth: 48, minHeight: 48 }}
                  >
                    <Icon icon="material-symbols:close-rounded" width={28} className="text-gray-700" />
                  </motion.button>
                </div>
              </div>
              {/* FILTER BUTTONS */}
              <div className="relative w-full mb-3">
                <div className="flex items-center bg-gray-100 rounded-full p-1 shadow-sm relative">
                  {["distance", "name", "favorites"].map((f, idx) => (
                    <button
                      key={f}
                      ref={filterRefs[idx]}
                      onClick={() => {
                        if (f === "favorites") {
                          setShowFavoritesOnly(true);
                          setSortBy("favorites");
                        } else {
                          setShowFavoritesOnly(false);
                          setSortBy(f);
                        }
                      }}
                      className={`
                        flex-1 relative z-10 rounded-full px-2 py-1 font-semibold text-base
                        transition-all
                        ${sortBy === f
                          ? "text-white"
                          : "text-gray-800"}
                      `}
                      style={{
                        background: "transparent",
                        fontWeight: sortBy === f ? 700 : 600,
                        zIndex: 3
                      }}
                    >
                      {f === "distance"
                        ? "Afstand"
                        : f === "name"
                        ? "Naam"
                        : "Favorieten"}
                    </button>
                  ))}
                  {/* Sliding highlight bar */}
                  <motion.div
                    className="absolute top-1 left-0 h-[calc(100%-8px)] bg-[#CF0039] rounded-full z-0 shadow"
                    animate={{ x: highlightX, width: highlightW }}
                    transition={{ type: "spring", stiffness: 350, damping: 32 }}
                    style={{ y: 0 }}
                  />
                </div>
              </div>
              {/* LIJST */}
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
                          {station.extra?.address || station.extra?.description || ""}
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// CardInner component
function CardInner({ station, isTop, distanceRef, distanceWidth, isCardFavorite }) {
  return (
    <div
      className={`
        rounded-2xl shadow-xl bg-white flex flex-col items-center
        transition-all duration-300 select-none w-full h-full
      `}
    >
      {/* Afbeelding */}
      <img
        src={`https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${station.latitude || station.lat},${station.longitude || station.lng}&key=${process.env.NEXT_PUBLIC_STREETVIEW_API_KEY}`}
        onError={e => (e.target.src = "/no-streetview.jpg")}
        alt={`Street view van ${station.name}`}
        className="rounded-t-2xl object-cover w-full"
        style={{ height: 400, pointerEvents: "none" }}
        draggable={false}
      />
      {/* Rode Cardzone */}
      <div className="bg-[#CF0039] w-full flex flex-col items-center pt-4 pb-4 px-2 rounded-b-2xl shadow mt-auto">
        {/* Naam */}
        <div className="text-white font-bold text-lg tracking-tight mb-1 w-full text-center flex items-center justify-center relative">
          <span>{station.name}</span>
          {isCardFavorite(station) && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2">
              <Icon
                icon="material-symbols:favorite-rounded"
                width={20}
                height={20}
                className="text-[#F18A00]"
                style={{ fill: "#F18A00" }}
              />
            </span>
          )}
        </div>
        {/* Afstand */}
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
        {/* Parking & Fiets */}
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
  );
}
