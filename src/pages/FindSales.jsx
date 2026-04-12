import React, { useState, useEffect } from 'react';
import { Search, Map as MapIcon, Crosshair, Plus, X, Users, Store } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAppContext } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';

// Simple component to update map center dynamically
function MapUpdater({ center }) {
  const map = useMap();
  map.setView(center, map.getZoom());
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
  if (type === 'Yard Sale' || type === 'Estate Sale' || type === 'community') color = '#ef4444'; // Live popups

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
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({ title: '', description: '', type: 'Yard Sale' });

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
    if (activeSources.includes('Auctions')) queryTags.push(`node(around:10000,${lat},${lng})["shop"="antiques"];`); // Antique shops proxied

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

  const fetchCommunitySales = async (lat, lng) => {
    if (!isSupabaseConfigured || (!activeSources.includes('Yard Sales') && !activeSources.includes('Estate Sales'))) return [];
    
    // Fetch from supabase 'community_sales' table
    try {
      const { data, error } = await supabase
         .from('community_sales')
         .select('*')
         // In production use GeoSpatial PostGIS via edge func, for now pull 50 recents
         .order('created_at', { ascending: false })
         .limit(50);
         
      if (error) throw error;
      
      return (data || []).map(d => ({
          id: d.id.toString(),
          lat: Number(d.lat),
          lng: Number(d.lng),
          type: d.sale_type || 'Yard Sale',
          address: d.title || 'Community Reported Sale',
          items: d.description || 'Assorted Items',
          time: d.time || 'Live Now',
          source: 'community'
      })).filter(d => {
          // Simple visual boundary filter (approx 20 miles)
          return Math.abs(d.lat - lat) < 0.3 && Math.abs(d.lng - lng) < 0.3;
      });
    } catch (err) {
       console.error("Supabase Community Error:", err);
       return [];
    }
  };

  const executeLiveSearch = async (lat, lng) => {
      // 1. Fetch Permanent Businesses (OSM)
      const osmResults = await fetchOverpassData(lat, lng);
      // 2. Fetch Pop Up Sales (Supabase Crowdsourced)
      const commResults = await fetchCommunitySales(lat, lng);

      setSales([...osmResults, ...commResults]);
  };

  const scanArea = async () => {
    setIsLocating(true);

    if (locationQuery.trim()) {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}`);
            const data = await res.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                setCenter([lat, lng]);
                await executeLiveSearch(lat, lng);
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
          await executeLiveSearch(lat, lng);
          setIsLocating(false);
        },
        async () => {
          await executeLiveSearch(center[0], center[1]);
          setIsLocating(false);
        },
        { timeout: 3000, enableHighAccuracy: true }
      );
    } else {
      await executeLiveSearch(center[0], center[1]);
      setIsLocating(false);
    }
  };

  const handleAddStop = (sale, priority) => {
    addStop({
        address: sale.address,
        items: sale.items,
        lat: sale.lat,
        lng: sale.lng
    }, priority);
    
    // Remove it from visually cluttered feed
    setSales(sales.filter(s => s.id !== sale.id));
  };

  const submitReport = async () => {
     if (!isSupabaseConfigured) {
        alert("Supabase forms backend not active.");
        return;
     }

     if (!reportData.title.trim()) return alert("Please provide a brief title or cross streets.");
     
     // Get user location for the pin
     navigator.geolocation.getCurrentPosition(async (pos) => {
         const payload = {
             lat: pos.coords.latitude,
             lng: pos.coords.longitude,
             title: reportData.title,
             description: reportData.description,
             sale_type: reportData.type,
             time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
         };

         const { error } = await supabase.from('community_sales').insert([payload]);
         if (error) {
             alert(error.message);
         } else {
             alert("Sale reported live to the community map!");
             setShowReportModal(false);
             setReportData({ title: '', description: '', type: 'Yard Sale' });
             scanArea(); // Refresh
         }
     }, () => alert("We need location access to drop a pin."), { enableHighAccuracy: true });
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
        <button onClick={() => setShowReportModal(true)} className="btn" style={{ background: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
           <Plus size={16} /> Report Sale
        </button>
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
        <button onClick={scanArea} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            {isLocating ? 'Scanning Live Networks...' : 'Fetch Live Maps Data'}
        </button>
      </div>

      <div style={{ 
        width: '100%', height: '350px', borderRadius: '16px', 
        overflow: 'hidden', marginBottom: '1rem', border: '1px solid var(--border-color)', position: 'relative'
      }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <MapUpdater center={center} />
          <LiveLocationMarker />
          
          {sales.map((sale) => {
             const isHighlighted = keyword && sale.items.toLowerCase().includes(keyword.toLowerCase());
             return (
              <Marker key={sale.id} position={[sale.lat, sale.lng]} icon={createPinIcon(sale.type, isHighlighted)}>
                <Popup className="dark-popup">
                  <div style={{ minWidth: '180px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <h4 style={{ margin: 0, color: sale.source === 'osm' ? '#f59e0b' : '#ef4444' }}>{sale.type}</h4>
                      {sale.source === 'osm' ? <Store size={14} color="#f59e0b" /> : <Users size={14} color="#ef4444" />}
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
                 No live businesses or community sales found in this scan. Increase your zoom or check other sources.
             </div>
        )}
      </div>

      {viewedStreet && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
              <div className="card glass" style={{ width: '100%', height: '50%', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
                  <div className="flex-between" style={{ marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0 }}>Street View Glance</h3>
                      <button onClick={() => setViewedStreet(null)} style={{ background: 'none', border: 'none', color: 'var(--text-inverse)', cursor: 'pointer' }}><X size={24} /></button>
                  </div>
                  {/* Notice: A real API key would replace this mock static visual */}
                  <div style={{ flex: 1, backgroundImage: 'url(https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80)', backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '8px' }}>
                  </div>
              </div>
          </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
              <div className="card glass" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', background: '#fff' }}>
                  <div className="flex-between" style={{ marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Plus size={20} color="#ef4444" /> Community Report</h3>
                      <button onClick={() => setShowReportModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
                  </div>
                  
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                     Spotted a local yard sale while driving? Drop a pin where you are standing to alert the community map!
                  </p>

                  <div className="input-group">
                     <label className="input-label">Cross Streets / Area Title</label>
                     <input type="text" className="input-field" placeholder="e.g., 42nd St & Thomas Rd" value={reportData.title} onChange={e => setReportData({...reportData, title: e.target.value})} />
                  </div>

                  <div className="input-group">
                     <label className="input-label">Items Spotted (Optional)</label>
                     <input type="text" className="input-field" placeholder="e.g., Video Games, Furniture" value={reportData.description} onChange={e => setReportData({...reportData, description: e.target.value})} />
                  </div>

                  <div className="input-group">
                     <label className="input-label">Sale Type</label>
                     <select className="input-field" value={reportData.type} onChange={e => setReportData({...reportData, type: e.target.value})}>
                         <option>Yard Sale</option>
                         <option>Estate Sale</option>
                         <option>Moving Sale</option>
                     </select>
                  </div>

                  <button className="btn" onClick={submitReport} style={{ width: '100%', background: '#0f3a8b', color: 'white', fontWeight: 'bold', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      📍 Drop GPS Pin Now
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}
