"use client";
export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

// helpers
function toRad(deg) { return deg * Math.PI / 180; }
function toDeg(rad) { return rad * 180 / Math.PI; }
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return {
    meters: R * c * 1000,
    directionInDegrees: getBearing(lat1, lon1, lat2, lon2)
  };
}
function getBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(toRad(lon2-lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1))*Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(toRad(lon2-lon1));
  let brng = Math.atan2(y, x);
  brng = toDeg(brng);
  return (brng + 360) % 360;
}

function useCompass(desiredBearing) {
  const [heading, setHeading] = useState(0);
  const [compassAvailable, setCompassAvailable] = useState(false);
  const [permissionRequestVisible, setPermissionRequestVisible] = useState(false);

  useEffect(() => {
    let compassStarted = false;
    let compassStartedViaClick = false;

    function handleOrientation(e) {
      let compass;
      if (e.webkitCompassHeading != null) {
        compass = e.webkitCompassHeading; // iOS: 0 = north
      } else if (e.alpha != null) {
        compass = 360 - e.alpha; // Android/Chrome
      } else {
        compass = 0;
      }
      setHeading(compass);
      setCompassAvailable(true);
    }

    function startCompass() {
      if (!compassStarted) {
        compassStarted = true;
        const isIOS = typeof DeviceOrientationEvent !== "undefined" &&
          typeof DeviceOrientationEvent.requestPermission === "function";
        if (!isIOS) {
          window.addEventListener("deviceorientationabsolute", handleOrientation, true);
          window.addEventListener("deviceorientation", handleOrientation, true);
        } else {
          DeviceOrientationEvent.requestPermission()
            .then((response) => {
              if (response === "granted") {
                window.addEventListener("deviceorientation", handleOrientation, true);
                setPermissionRequestVisible(false);
              } else {
                setCompassAvailable(false);
                alert("Zonder kompas wordt het lastig. Richtingaanwijzing via het noorden.");
              }
            })
            .catch(() => {
              if (compassStartedViaClick) {
                setCompassAvailable(false);
                alert("Kompas niet beschikbaar. Richtingaanwijzing via het noorden.");
              } else {
                setPermissionRequestVisible(true);
              }
            });
        }
      }
    }

    // iOS button event for requesting permissions
    if (permissionRequestVisible) {
      const button = document.getElementById("request-permissions-button");
      if (button) {
        button.onclick = () => {
          compassStartedViaClick = true;
          setPermissionRequestVisible(false);
          startCompass();
        };
      }
    } else {
      startCompass();
    }

    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation);
      window.removeEventListener("deviceorientation", handleOrientation);
    };
    // eslint-disable-next-line
  }, [permissionRequestVisible]);

  return { heading, compassAvailable, permissionRequestVisible, setPermissionRequestVisible };
}

// Hoofdcomponent
function NavigateContent() {
  const params = useSearchParams();
  const router = useRouter();
  const destLat = parseFloat(params.get("lat"));
  const destLng = parseFloat(params.get("lng"));
  const stationName = params.get("name") || "Onbekend station";
  const [distance, setDistance] = useState(null);
  const [bearing, setBearing] = useState(null);
  const [imageError, setImageError] = useState(false);
  const distanceRef = useRef(null);
  const [distanceWidth, setDistanceWidth] = useState(0);

  // Locatie & bearing naar het station
  useEffect(() => {
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const { meters, directionInDegrees } = getDistance(latitude, longitude, destLat, destLng);
        setDistance(meters);
        setBearing(directionInDegrees);
      },
      (err) => alert("Locatie niet beschikbaar"),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [destLat, destLng]);

  useEffect(() => {
    if (distanceRef.current) {
      setDistanceWidth(distanceRef.current.offsetWidth);
    }
  }, [distance]);

  // Compass hook (voor arrow rotatie)
  const {
    heading,
    compassAvailable,
    permissionRequestVisible,
    setPermissionRequestVisible
  } = useCompass(bearing);

  // Pijl-rotatie
  let arrowRotation = 0;
  if (bearing !== null) {
    if (compassAvailable) {
      arrowRotation = (bearing - heading + 360) % 360;
    } else {
      arrowRotation = bearing; // als geen kompas, gewoon bearing (noorden)
    }
  }

  const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${destLat},${destLng}&key=${process.env.NEXT_PUBLIC_STREETVIEW_API_KEY}`;

  return (
    <div className="min-h-screen bg-[#CF0039] flex flex-col items-center relative pt-0 px-6">
      <button
        className="absolute top-5 left-5 z-10 bg-white hover:bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center shadow"
        onClick={() => router.back()}
        aria-label="Terug"
      >
        <Icon icon="material-symbols:arrow-back-rounded" width={36} height={36} color="#CF0039" />
      </button>
      {/* Permissie dialoog voor iOS */}
      {permissionRequestVisible && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50"
          style={{ backdropFilter: "blur(3px)" }}
        >
          <div className="bg-white rounded-xl shadow-lg px-6 py-8 flex flex-col items-center max-w-xs">
            <div className="text-[#CF0039] font-bold mb-3 text-lg">Kompas toegang</div>
            <div className="text-[#222] text-center mb-4 text-base">
              Mogen we je kompas gebruiken om je richting aan te wijzen? (Nodig voor iOS)
            </div>
            <button
              id="request-permissions-button"
              className="bg-[#CF0039] text-white px-4 py-2 rounded-full font-bold mt-2"
            >
              Geef goedkeuring
            </button>
          </div>
        </div>
      )}
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
            style={{ transform: `rotate(${arrowRotation}deg)`, transition: "0.3s" }}
            className="flex items-center justify-center"
          >
            <svg width="84" height="84" viewBox="0 0 60 60">
              <polygon points="30,8 50,46 30,36 10,46" fill="#CF0039" />
            </svg>
          </div>
        </div>
        <div className="text-white text-base mt-4 font-medium">Loop in de richting van de pijl</div>
      </div>
      <div className="text-white text-xs mt-6 opacity-60">
        {bearing !== null && compassAvailable && (
          <>Kompas: {Math.round(heading)}°, Bearing: {Math.round(bearing)}°</>
        )}
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
