import React, { useState, useEffect } from 'react';
import { Search, Map as MapIcon, Crosshair, X, Store, Home } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../config/supabaseClient';

// Simple component to update map center dynamically
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function MapInteractionListener({ onMoved }) {
  useMapEvents({
    dragend: (e) => onMoved(e.target.getCenter()),
    zoomend: (e) => onMoved(e.target.getCenter())
  });
  return null;
}

const wazeLocationIcon = L.divIcon({
  className: 'custom-user-location-icon',
  html: `<div style="
    width: 24px;
    height: 24px;
    background-color: #3b82f6; 
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.6), inset 0 0 5px rgba(255,255,255,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  ">
    <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 10px solid white; transform: translateY(-2px);"></div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

function LiveLocationMarker() {
  const [position, setPosition] = useState(null);
  
  useEffect(() => {
      let watchId;
      if ('geolocation' in navigator) {
          watchId = navigator.geolocation.watchPosition((pos) => {
              setPosition([pos.coords.latitude, pos.coords.longitude]);
          }, null, { enableHighAccuracy: true });
      }
      return () => {
          if (watchId) navigator.geolocation.clearWatch(watchId);
      };
  }, []);

  return position === null ? null : (
      <Marker position={position} icon={wazeLocationIcon} zIndexOffset={1000}>
          <Popup className="dark-popup">
              <div style={{ fontWeight: 'bold' }}>You are here</div>
          </Popup>
      </Marker>
  );
}

const AVAILABLE_SOURCES = ["Yard Sales", "Estate Sales", "Thrift Stores", "Auctions", "Flea Markets"];

const createPinIcon = (type, highlighted) => {
  let color = '#3b82f6'; // default
  if (type === 'Thrift Store' || type === 'Flea Market' || type === 'Antique/Auction') color = '#f59e0b'; // Permanent businesses
  if (type === 'Yard Sale' || type === 'Estate Sale') color = '#ef4444'; // Yard Sales

  if (highlighted) color = '#10b981';

  const size = highlighted ? 36 : 28;
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="
      background-color: ${color};
      width: ${size}px; 
      height: ${size}px; 
      border-radius: 50%;
      border: 3px solid #fff;
      box-shadow: ${highlighted ? '0 0 15px #10b981, 0 0 30px #10b981' : '0 4px 10px rgba(0,0,0,0.5)'};
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 10px;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size],
    popupAnchor: [0, -size]
  });
};

export default function FindSales() {
  const { addStop } = useAppContext();
  const [center, setCenter] = useState([40.7128, -74.0060]);
  const [sales, setSales] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [viewedStreet, setViewedStreet] = useState(null);
  const [activeSources, setActiveSources] = useState([...AVAILABLE_SOURCES]);
  
  const [showSearchHere, setShowSearchHere] = useState(false);
  const [scrolledLocation, setScrolledLocation] = useState(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log("Could not get initial location, using default:", error);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  const handleMapMoved = (newCenter) => {
      setScrolledLocation([newCenter.lat, newCenter.lng]);
      setShowSearchHere(true);
  };

  const searchThisArea = async () => {
      setShowSearchHere(false);
      setIsLocating(true);
      setCenter(scrolledLocation);
      
      try {
         const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${scrolledLocation[0]}&lon=${scrolledLocation[1]}`);
         const geoData = await geoRes.json();
         const city = geoData?.address?.city || geoData?.address?.town || geoData?.address?.county || 'sfbay';
         await executeLiveSearch(scrolledLocation[0], scrolledLocation[1], city);
      } catch(e) {
         await executeLiveSearch(scrolledLocation[0], scrolledLocation[1], 'sfbay');
      }
      
      setIsLocating(false);
  };
  
  const toggleSource = (source) => {
     setActiveSources(prev => {
       if (prev.length === AVAILABLE_SOURCES.length) return [source];
       if (prev.length === 1 && prev[0] === source) return [...AVAILABLE_SOURCES];
       if (prev.includes(source)) {
          if (prev.length === 1) return [...AVAILABLE_SOURCES];
          return prev.filter(s => s !== source);
       } else {
          return [...prev, source];
       }
     });
  };

  const fetchOverpassData = async (lat, lng) => {
    let queryTags = [];
    if (activeSources.includes('Thrift Stores')) queryTags.push(`node(around:10000,${lat},${lng})["shop"~"second_hand|charity"];`);
    if (activeSources.includes('Flea Markets')) queryTags.push(`node(around:10000,${lat},${lng})["amenity"="marketplace"];`);
    if (activeSources.includes('Auctions')) queryTags.push(`node(around:10000,${lat},${lng})["shop"="antiques"];`);

    if (queryTags.length === 0) return [];

    const query = `[out:json];(${queryTags.join('')});out;`;
    try {
        const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        return data.elements.map(el => ({
            id: el.id.toString(),
            lat: el.lat,
            lng: el.lon,
            type: el.tags?.shop?.includes('second_hand') ? 'Thrift Store' : (el.tags?.amenity === 'marketplace' ? 'Flea Market' : 'Antique/Auction'),
            address: el.tags?.name || 'Local Store',
            items: 'Assorted Inventory, Decor, Clothing',
            time: el.tags?.opening_hours || 'Check local hours',
            source: 'osm'
        }));
    } catch (e) {
        console.error("OSM Error:", e);
        return [];
    }
  };

  const executeLiveSearch = async (lat, lng, cityName = 'sfbay') => {
      // 1. Fetch Permanent Businesses (OSM)
      const osmResults = await fetchOverpassData(lat, lng);

      // 2. Fetch Live Local Yard Sales via Supabase proxy
      let activeYardSales = [];
      try {
         if (activeSources.includes('Yard Sales') || activeSources.includes('Estate Sales')) {
             const { data, error } = await supabase.functions.invoke('find-sales', {
                 body: { lat, lng, radius: 25, city: cityName } // 25 mile search distance
             });
             
             if (data && data.sales) {
                 activeYardSales = data.sales.map(s => ({
                     ...s,
                     type: s.title.toLowerCase().includes('estate') ? 'Estate Sale' : 'Yard Sale',
                     address: s.title, // Craigslist titles often have the city or street
                     items: s.description || 'Assorted Items',
                     time: 'Active Listing',
                     source: 'edge'
                 }));
             }
             if (data && data.error) console.error("Proxy Error:", data.error);
             if (error) console.error("Edge Function Error:", error);
         }
      } catch (err) {
         console.error("Failed executing find-sales proxy", err);
      }

      setSales([...osmResults, ...activeYardSales]);
  };

  const scanArea = async () => {
    setIsLocating(true);

    if (locationQuery.trim()) {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}&countrycodes=us`);
            const data = await res.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                
                let foundCity = 'sfbay'; // default
                if (data[0].display_name) {
                    // Extract city name from CSV string (e.g., "Los Angeles, California...")
                    foundCity = data[0].display_name.split(',')[0].trim();
                }
                
                setCenter([lat, lng]);
                await executeLiveSearch(lat, lng, foundCity);
            } else {
                alert("Location not found. Please try a different City or Zip Code.");
            }
        } catch (err) {
            alert("Network error. Could not find location.");
        }
        setIsLocating(false);
        return;
    }

    // Fallback to auto GPS if manual query is empty
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCenter([lat, lng]);
          
          try {
             const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
             const geoData = await geoRes.json();
             const city = geoData?.address?.city || geoData?.address?.town || geoData?.address?.county || 'sfbay';
             await executeLiveSearch(lat, lng, city);
          } catch(e) {
             await executeLiveSearch(lat, lng, 'sfbay');
          }
          
          setIsLocating(false);
        },
        async () => {
          await executeLiveSearch(center[0], center[1], 'sfbay');
          setIsLocating(false);
        },
        { timeout: 3000, enableHighAccuracy: true }
      );
    } else {
      await executeLiveSearch(center[0], center[1], 'sfbay');
      setIsLocating(false);
    }
  };

  const handleAddStop = async (sale, priority) => {
    const result = await addStop({
        address: sale.address,
        items: sale.items,
        lat: sale.lat,
        lng: sale.lng
    }, priority);
    
    if (result && !result.success && result.reason === 'limit') {
        alert('Trial Ended: You can only map 2 stops per day on the free tier. Upgrade to Pro in the top-right to unlock unlimited routing!');
        return;
    }
    
    // Visually remove routed items from map
    setSales(sales.filter(s => s.id !== sale.id));
  };
  
  const useCurrentLocation = () => {
    setLocationQuery('');
    setTimeout(() => scanArea(), 50);
  };

  return (
    <div style={{ paddingBottom: '1rem' }}>
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Live Radar <Crosshair size={24} className="text-accent" />
          </h1>
          <p>Scan real databases for stores and pop-ups.</p>
        </div>
      </div>

      <div className="card glass" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapIcon size={14}/> Location Center</label>
            <input 
               type="text" 
               className="input-field" 
               placeholder="Current GPS or City" 
               value={locationQuery}
               onChange={(e) => setLocationQuery(e.target.value)}
            />
          </div>
          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="input-label" style={{ color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Search size={14}/> Filter Highlights</label>
            <input 
               type="text" 
               className="input-field" 
               placeholder="e.g. vintage, games" 
               value={keyword}
               onChange={(e) => setKeyword(e.target.value)}
               style={{ border: keyword ? '1px solid var(--success-color)' : '1px solid var(--border-color)'}}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginTop: '0.75rem', scrollbarWidth: 'none' }}>
          {AVAILABLE_SOURCES.map(source => (
            <button 
              key={source} 
              onClick={() => toggleSource(source)}
              style={{ 
                padding: '0.35rem 0.75rem', 
                borderRadius: '16px', 
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                fontWeight: 600,
                border: activeSources.includes(source) ? '1px solid var(--accent-color)' : '1px solid rgba(0,0,0,0.06)',
                background: activeSources.includes(source) ? 'rgba(139, 92, 246, 0.2)' : 'rgba(0,0,0,0.03)',
                color: activeSources.includes(source) ? 'var(--accent-color)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {source}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button onClick={useCurrentLocation} className="btn" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
             <Crosshair size={18} style={{marginRight: '6px'}} /> Find My Location
          </button>
          <button onClick={scanArea} className="btn btn-primary" style={{ flex: 2 }}>
              {isLocating ? 'Scanning Regions...' : 'Scan Map'}
          </button>
        </div>
      </div>

      <div style={{ 
        width: '100%', height: '350px', borderRadius: '16px', 
        overflow: 'hidden', marginBottom: '1rem', border: '1px solid var(--border-color)', position: 'relative'
      }}>
        {showSearchHere && (
             <div style={{ position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' }}>
                 <button onClick={searchThisArea} className="btn" style={{ background: '#fff', color: 'var(--accent-color)', borderRadius: '24px', padding: '0.5rem 1.5rem', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Search size={16} /> Search this area
                 </button>
             </div>
        )}
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <ZoomControl position="bottomright" />
          <MapUpdater center={center} />
          <MapInteractionListener onMoved={handleMapMoved} />
          <LiveLocationMarker />
          
          {sales.map((sale) => {
             const isHighlighted = keyword && sale.items.toLowerCase().includes(keyword.toLowerCase());
             return (
              <Marker key={sale.id} position={[sale.lat, sale.lng]} icon={createPinIcon(sale.type, isHighlighted)}>
                <Popup className="dark-popup">
                  <div style={{ minWidth: '180px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <h4 style={{ margin: 0, color: sale.source === 'osm' ? '#f59e0b' : '#ef4444' }}>{sale.type}</h4>
                      {sale.source === 'osm' ? <Store size={14} color="#f59e0b" /> : <Home size={14} color="#ef4444" />}
                    </div>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#555' }}>
                       {sale.address || 'Reported Location'}
                       <br/><span style={{ fontSize: '0.65rem' }}>{sale.time}</span>
                    </p>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: 'bold', color: isHighlighted ? '#10b981' : '#000' }}>{sale.items}</p>
                    
                    <button className="btn" style={{ width: '100%', marginBottom: '0.5rem', background: '#e5e7eb', color: '#374151', padding: '0.25rem', fontSize: '0.75rem' }} onClick={() => setViewedStreet(sale)}>
                        👁️ Glance Street View
                    </button>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <button className="btn" onClick={() => handleAddStop(sale, 'high')} style={{ background: '#ef4444', color: 'var(--text-inverse)', fontSize: '0.75rem', padding: '0.5rem' }}>🔥 Route Immediately</button>
                        <button className="btn" onClick={() => handleAddStop(sale, 'standard')} style={{ background: '#3b82f6', color: 'var(--text-inverse)', fontSize: '0.75rem', padding: '0.5rem' }}>📌 Save Stop</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
             )
          })}
        </MapContainer>
        
        {sales.length === 0 && !isLocating && (
             <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', zIndex: 10, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '0.5rem', borderRadius: '8px', fontSize: '0.8rem', textAlign: 'center' }}>
                 No locations found in this scan. Increase your zoom or check other sources.
             </div>
        )}
      </div>

      {viewedStreet && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }} onClick={() => setViewedStreet(null)}>
              <div className="card glass" style={{ width: '100%', height: '50%', display: 'flex', flexDirection: 'column', padding: '1rem', background: 'var(--bg-card)', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                  <div className="flex-between" style={{ marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Street View Glance</h3>
                      <button onClick={() => setViewedStreet(null)} style={{ background: 'rgba(0,0,0,0.1)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.4rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={24} />
                      </button>
                  </div>
                  {/* Live Google Street View (Secured via Vercel Environment Variables) */}
                  <div style={{ flex: 1, backgroundImage: import.meta.env.VITE_GOOGLE_MAPS_KEY ? `url(https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${viewedStreet.lat},${viewedStreet.lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_KEY})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '8px', position: 'relative' }}>
                      {!import.meta.env.VITE_GOOGLE_MAPS_KEY && (
                         <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '1rem', textAlign: 'center', borderRadius: '8px' }}>
                             <p>API Key Secured.<br/>Please add <strong>VITE_GOOGLE_MAPS_KEY</strong> to your Vercel Environment Variables.</p>
                         </div>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
