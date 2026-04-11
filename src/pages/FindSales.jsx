import React, { useState } from 'react';
import { Search, Map as MapIcon, Crosshair, Plus, Navigation, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAppContext } from '../context/AppContext';

// Simple component to update map center dynamically
function MapUpdater({ center }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

const AVAILABLE_SOURCES = ["Yard Sales", "Estate Sales", "Thrift Stores", "Auctions", "Flea Markets"];

const createMockIcon = (priority, highlighted) => {
  const color = highlighted ? '#10b981' : (priority === 'high' ? '#ef4444' : '#3b82f6');
  const size = highlighted ? 36 : 24;
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

  const toggleSource = (source) => {
     setActiveSources(prev => {
       // If everything is selected, clicking one should ONLY select that one (focus mode)
       if (prev.length === AVAILABLE_SOURCES.length) {
         return [source];
       }
       // If only this one is selected, clicking it again should select EVERYTHING (reset mode)
       if (prev.length === 1 && prev[0] === source) {
         return [...AVAILABLE_SOURCES];
       }
       // Standard toggle
       if (prev.includes(source)) {
          // If unselecting the very last active chip, reset to all
          if (prev.length === 1) return [...AVAILABLE_SOURCES];
          return prev.filter(s => s !== source);
       } else {
          return [...prev, source];
       }
     });
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
                generateMockSales(lat, lng);
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
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCenter([lat, lng]);
          generateMockSales(lat, lng);
          setIsLocating(false);
        },
        () => {
          generateMockSales(center[0], center[1]);
          setIsLocating(false);
        },
        { timeout: 3000, enableHighAccuracy: true }
      );
    } else {
      generateMockSales(center[0], center[1]);
      setIsLocating(false);
    }
  };

  const generateMockSales = (baseLat, baseLng) => {
    const mockData = [];
    const itemPool = ["Video games, Consoles", "Vintage electronics, Cameras", "Clothes, Shoes", "Furniture, Decor", "Tools, Hardware", "Toys, Collectibles, Comics"];
    const typePool = activeSources.length > 0 ? activeSources : ["Yard Sales"];
    
    // Generate fewer results if they filter heavily
    const count = Math.max(2, Math.floor(activeSources.length * 2.5));

    for (let i = 0; i < count; i++) {
        mockData.push({
            id: Date.now() + i,
            lat: baseLat + (Math.random() - 0.5) * 0.08,
            lng: baseLng + (Math.random() - 0.5) * 0.08,
            type: typePool[Math.floor(Math.random() * typePool.length)],
            time: '8:00 AM',
            items: itemPool[Math.floor(Math.random() * itemPool.length)],
            address: `${Math.floor(Math.random() * 9000) + 100} Main Mock St`
        });
    }
    setSales(mockData);
  };

  const handleAddStop = (sale, priority) => {
    addStop({
        address: sale.address,
        items: sale.items,
        lat: sale.lat,
        lng: sale.lng
    }, priority);
    
    // Remove it from the live discovery feed so it feels native
    setSales(sales.filter(s => s.id !== sale.id));
  };

  return (
    <div style={{ paddingBottom: '1rem' }}>
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Find Sales <Search size={24} className="text-accent" />
          </h1>
          <p>Scan for local hidden treasure</p>
        </div>
      </div>

      <div className="card glass" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapIcon size={14}/> Location Search</label>
            <input 
               type="text" 
               className="input-field" 
               placeholder="City or Zip Code" 
               value={locationQuery}
               onChange={(e) => setLocationQuery(e.target.value)}
            />
          </div>
          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="input-label" style={{ color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Crosshair size={14}/> Target Keyword</label>
            <input 
               type="text" 
               className="input-field" 
               placeholder="e.g. games" 
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
            <Crosshair size={18} /> {isLocating ? 'Locating...' : 'Scan Map For Sales'}
        </button>
      </div>

      <div style={{ 
        width: '100%', height: '350px', borderRadius: '16px', 
        overflow: 'hidden', marginBottom: '1rem', border: '1px solid var(--border-color)', position: 'relative'
      }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <MapUpdater center={center} />
          
          {sales.map((sale) => {
             const isHighlighted = keyword && sale.items.toLowerCase().includes(keyword.toLowerCase());
             return (
              <Marker key={sale.id} position={[sale.lat, sale.lng]} icon={createMockIcon('standard', isHighlighted)}>
                <Popup className="dark-popup">
                  <div style={{ minWidth: '180px' }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>{sale.type}</h4>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#555' }}>{sale.address}</p>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: 'bold', color: isHighlighted ? '#10b981' : '#000' }}>{sale.items}</p>
                    
                    <button className="btn" style={{ width: '100%', marginBottom: '0.5rem', background: '#e5e7eb', color: '#374151', padding: '0.25rem', fontSize: '0.75rem' }} onClick={() => setViewedStreet(sale)}>
                        👁️ Glance Street View
                    </button>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <button className="btn" onClick={() => handleAddStop(sale, 'high')} style={{ background: '#ef4444', color: 'var(--text-inverse)', fontSize: '0.75rem', padding: '0.5rem' }}>🔥 Add High Priority</button>
                        <button className="btn" onClick={() => handleAddStop(sale, 'standard')} style={{ background: '#3b82f6', color: 'var(--text-inverse)', fontSize: '0.75rem', padding: '0.5rem' }}>📌 Add Standard</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
             )
          })}
        </MapContainer>
        
        <button onClick={scanArea} className="btn btn-primary" style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
            <Crosshair size={18} /> {isLocating ? 'Locating...' : 'Scan Local Area'}
        </button>
      </div>

      {viewedStreet && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
              <div className="card glass" style={{ width: '100%', height: '50%', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
                  <div className="flex-between" style={{ marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0 }}>Street View Glance</h3>
                      <button onClick={() => setViewedStreet(null)} style={{ background: 'none', border: 'none', color: 'var(--text-inverse)', cursor: 'pointer' }}><X size={24} /></button>
                  </div>
                  <div style={{ flex: 1, backgroundImage: 'url(https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80)', backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '8px' }}>
                     {/* Mock Street View Image embedded with CSS */}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
