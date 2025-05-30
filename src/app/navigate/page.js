"use client";
export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

// Helpers
function toRad(deg) { return deg * Math.PI / 180; }
function toDeg(rad) { return rad * 180 / Math.PI; }
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // meters
}
function getBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  let brng = Math.atan2(y, x);
  brng = toDeg(brng);
  return (brng + 360) % 360;
}

// Compass hook (buffer smoothing & permission handling)
function useCompass(desiredBearing) {
  const [heading, setHeading] = useState(0); // gemiddelde heading
  const [compassAvailable, setCompassAvailable] = useState(false);
  const [permissionRequestVisible, setPermissionRequestVisible] = useState(false);
  const buffer = useRef([]);
  const isIOS = typeof window !== "undefined" && /iP(hone|ad|od)/.test(navigator.userAgent);

  useEffect(() => {
    let handler;
    let permissionRequested = false;
    let cleanUp;

    function handleOrientation(e) {
      let compass;
      if (e.webkitCompassHeading != null) {
        compass = e.webkitCompassHeading; // iOS
      } else if (e.alpha != null) {
        compass = 360 - e.alpha; // Android
      } else {
        compass = 0;
      }
      // Smoothing (buffer average)
      buffer.current.push(compass);
      if (buffer.current.length > 8) buffer.current.shift();
      const avg = buffer.current.reduce((a, b) => a + b, 0) / buffer.current.length;
      setHeading(avg);
      setCompassAvailable(true);
    }

    function startCompass() {
      if (isIOS && typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) {
        setPermissionRequestVisible(true);
        // User must tap to request permission!
        cleanUp = () => window.removeEventListener("deviceorientation", handleOrientation, true);
      } else {
        window.addEventListener("deviceorientationabsolute", handleOrientation, true);
        cleanUp = () => window.removeEventListener("deviceorientationabsolute", handleOrientation, true);
      }
    }
    startCompass();

    return () => {
      if (cleanUp) cleanUp();
    };
    // eslint-disable-next-line
  }, []);

  // iOS permission handler
  function requestIOSPermission() {
    if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) {
      DeviceOrientationEvent.requestPermission().then((res) => {
        if (res === "granted") {
          window.addEventListener("deviceorientation", (e) => {
            let compass = e.webkitCompassHeading ?? (360 - e.alpha) ?? 0;
            buffer.current.push(compass);
            if (buffer.current.length > 8) buffer.current.shift();
            const avg = buffer.current.reduce((a, b) => a + b, 0) / buffer.current.length;
            setHeading(avg);
            setCompassAvailable(true);
          }, true);
          setPermissionRequestVisible(false);
        }
      });
    }
  }

  return { heading, compassAvailable, permissionRequestVisible, requestIOSPermission };
}

function NavigateContent() {
  const params = useSearchParams();
  const router = useRouter();
  const destLat = parseFloat(params.get("lat"));
  const destLng = parseFloat(params.get("lng"));
  const stationName = params.get("name") || "Onbekend station";
  const [distance, setDistance] = useState(null);
  const [bearing, setBearing] = useState(null);
  const [imageError, setImageError] = useState(false);

  // Ref + state voor oranje lijn onder afstand
  const distanceRef = useRef(null);
  const [distanceWidth, setDistanceWidth] = useState(0);

  // Compass!
  const { heading, compassAvailable, permissionRequestVisible, requestIOSPermission } = useCompass(bearing);

  // Smoothed rotation for arrow
  const [smoothRotation, setSmoothRotation] = useState(0);

  useEffect(() => {
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setDistance(getDistance(latitude, longitude, destLat, destLng));
        setBearing(getBearing(latitude, longitude, destLat, destLng));
      },
      (err) => alert("Locatie niet beschikbaar"),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [destLat, destLng]);

  // Meet breedte van afstandstekst na update
  useEffect(() => {
    if (distanceRef.current) {
      setDistanceWidth(distanceRef.current.offsetWidth);
    }
  }, [distance]);

  // Smoothen/clamp de pijlrotatie
  useEffect(() => {
    let target;
    if (compassAvailable && heading !== null && bearing !== null) {
      // True rotation = difference between bearing and compass heading
      target = (bearing - heading + 360) % 360;
    } else if (bearing !== null) {
      target = bearing;
    } else {
      target = 0;
    }
    setSmoothRotation(prev => {
      let diff = target - prev;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      return prev + Math.max(Math.min(diff, 8), -8);
    });
  }, [bearing, heading, compassAvailable]);

  const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${destLat},${destLng}&key=${process.env.NEXT_PUBLIC_STREETVIEW_API_KEY}`;

  return (
    <div className="min-h-screen bg-[#CF0039] flex flex-col items-center relative pt-0 px-6">
      {/* iOS Permission prompt */}
      {permissionRequestVisible && (
        <div className="fixed z-50 top-0 left-0 w-full h-full flex flex-col justify-center items-center bg-black/60">
          <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
            <div className="text-lg mb-4 text-[#CF0039] font-semibold">Kompas-permissie nodig</div>
            <div className="mb-4 text-gray-800">Om de richtingaanwijzer te gebruiken moet je toestemming geven voor het kompas.</div>
            <button
              className="bg-[#CF0039] text-white rounded-full px-8 py-3 font-bold"
              onClick={requestIOSPermission}
            >
              Geef toestemming
            </button>
          </div>
        </div>
      )}

      <button
        className="absolute top-5 left-5 z-10 bg-white hover:bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center shadow"
        onClick={() => router.back()}
        aria-label="Terug"
      >
        <Icon icon="material-symbols:arrow-back-rounded" width={36} height={36} color="#CF0039" />
      </button>
      <div className="w-full flex justify-center items-center mt-8 mb-10">
        <span className="text-white font-bold text-xl">{stationName}</span>
      </div>
      <div className="w-64 h-full rounded-3xl overflow-hidden shadow mb-5 bg-white flex items-center justify-center">
        {!imageError ? (
          <img
            src={streetViewUrl}
            alt={`Street view van het station`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <img
            src="/no-streetview.jpeg"
            alt="Geen Street View"
            className="w-full h-full object-cover"
          />
        )}
      </div>
      {distance !== null && (
        <div className="mb-3 text-center flex flex-col items-center">
          <span
            ref={distanceRef}
            className="text-5xl font-extrabold text-white"
          >
            {Math.round(distance)}<span className="text-2xl font-bold">m</span>
          </span>
          {/* Oranje lijn */}
          <span
            className="block mt-2 rounded-full"
            style={{
              width: distanceWidth || 60,
              height: 5,
              background: "#F18A00",
              transition: "width 0.3s",
            }}
          />
          <div className="text-white mt-2 text-base font-medium">Tot het station</div>
        </div>
      )}
      <div className="flex flex-col items-center mt-6">
        <div className="rounded-full bg-white w-32 h-32 flex items-center justify-center shadow">
          <div
            style={{ transform: `rotate(${smoothRotation}deg)`, transition: "0.15s" }}
            className="flex items-center justify-center"
          >
            <svg width="84" height="84" viewBox="0 0 60 60">
              <polygon points="30,8 50,46 30,36 10,46" fill="#CF0039" />
            </svg>
          </div>
        </div>
        <div className="text-white text-base mt-4 font-medium">Loop in de richting van de pijl</div>
      </div>
    </div>
  );
}

export default function NavigatePage() {
  return (
    <Suspense fallback={<div className="text-center text-white p-12">Laden…</div>}>
      <NavigateContent />
    </Suspense>
  );
}
