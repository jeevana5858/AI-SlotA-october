window.EcoSort = window.EcoSort || {};

(function () {
  const { useState, useEffect, useRef } = React;

  const LocatorPage = () => {
    const { api, Icon } = window.EcoSort;
    const [centers, setCenters] = useState([]);
    const [category, setCategory] = useState('All');
    const [coords, setCoords] = useState(null);
    const [loading, setLoading] = useState(true);
    const [geoMsg, setGeoMsg] = useState('');

    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersLayerRef = useRef(null);

    const loadCenters = async (cat = category, loc = coords) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (cat && cat !== 'All') params.append('category', cat);
        if (loc) {
          params.append('lat', loc.lat);
          params.append('lng', loc.lng);
        }
        const res = await api.get(`/api/locator/centers?${params.toString()}`);
        setCenters(res.centers || []);
      } catch {
        setCenters([]);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      loadCenters(category, coords);
    }, [category, coords]);

    useEffect(() => {
      if (!mapContainerRef.current || !window.L) return;

      if (!mapInstanceRef.current) {
        const initialLat = coords?.lat || 12.9716;
        const initialLng = coords?.lng || 77.5946;
        const map = window.L.map(mapContainerRef.current).setView([initialLat, initialLng], 12);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);
        mapInstanceRef.current = map;
        markersLayerRef.current = window.L.layerGroup().addTo(map);
      }

      const map = mapInstanceRef.current;
      const layer = markersLayerRef.current;
      layer.clearLayers();

      if (coords) {
        window.L.circleMarker([coords.lat, coords.lng], {
          radius: 8,
          color: '#15803d',
          fillColor: '#22c55e',
          fillOpacity: 0.9,
        })
          .bindPopup('<strong>Your Current Location</strong>')
          .addTo(layer);
      }

      const bounds = [];
      centers.forEach((c) => {
        bounds.push([c.lat, c.lng]);
        window.L.marker([c.lat, c.lng])
          .bindPopup(
            `<div style="min-width:180px">
              <strong>${c.name}</strong><br/>
              <small>${c.address}</small><br/>
              <small><b>Accepts:</b> ${c.accepts.join(', ')}</small><br/>
              <a href="https://www.openstreetmap.org/directions?to=${c.lat}%2C${c.lng}" target="_blank" rel="noreferrer" style="color:#15803d;font-weight:bold;">Open Directions ↗</a>
            </div>`
          )
          .addTo(layer);
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 13 });
      }
    }, [centers, coords]);

    const handleUseLocation = () => {
      if (!navigator.geolocation) {
        setGeoMsg('Geolocation is not supported by your browser.');
        return;
      }
      setGeoMsg('Detecting location...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGeoMsg('Centered near your current location.');
        },
        () => {
          setGeoMsg('Location permission denied. Showing default city recycling hubs.');
        }
      );
    };

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-eco-100 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold">Recycling Centres Locator</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Interactive OpenStreetMap view of nearby drop-off points, compost hubs, and metal recovery centres.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            >
              <option value="All">All Waste Types</option>
              <option value="Wet Waste">Wet Waste</option>
              <option value="Dry Waste">Dry Waste</option>
              <option value="Metal Waste">Metal Waste</option>
              <option value="E-Waste">E-Waste</option>
            </select>
            <button
              onClick={handleUseLocation}
              className="px-4 py-2 rounded-xl bg-eco-700 hover:bg-eco-800 text-white text-sm font-semibold flex items-center gap-2"
            >
              <Icon name="map" className="w-4 h-4" />
              Use My Location
            </button>
          </div>
        </div>

        {geoMsg && <div className="text-xs text-eco-700 dark:text-eco-400 font-medium px-2">{geoMsg}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-3xl p-3 border border-eco-100 dark:border-slate-800 shadow-sm">
            <div ref={mapContainerRef} className="w-full h-[420px] rounded-2xl bg-slate-100 dark:bg-slate-800" />
          </div>

          <div className="lg:col-span-2 space-y-3 max-h-[450px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading centres...</div>
            ) : (
              centers.map((c) => (
                <div
                  key={c.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-eco-100 dark:border-slate-800 shadow-sm space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</h4>
                    {c.distance_km !== undefined && (
                      <span className="px-2 py-0.5 rounded-full bg-eco-100 dark:bg-eco-900/50 text-eco-800 dark:text-eco-300 text-[11px] font-bold shrink-0">
                        {c.distance_km} km
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{c.address}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.accepts.map((a) => (
                      <span
                        key={a}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-400">{c.hours}</span>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-eco-700 dark:text-eco-400 hover:underline"
                    >
                      Get Directions →
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  window.EcoSort.LocatorPage = LocatorPage;
})();

