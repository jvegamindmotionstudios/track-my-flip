import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, Plus, X, Crosshair, Car, FileSpreadsheet } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppContext } from '../context/AppContext';

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

function MapRouteUpdater({ stops }) {
  const map = useMap();
  useEffect(() => {
    if (stops && stops.length > 0) {
      const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lng]));
      // Add a slight delay to ensure Leaflet container is fully loaded
      setTimeout(() => {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }, 100);
    }
  }, [stops, map]);
  return null;
}

const createCustomIcon = (index) => {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="
      background-color: var(--accent-color);
      width: 32px; 
      height: 32px; 
      border-radius: 50%;
      border: 3px solid #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    ">${index}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

export default function RoutePlanner() {
  const { stops, addStop, updateStopStatus, budget, spent, mileage, setMileage, startOdo, setStartOdo, endOdo, setEndOdo, clearRoute } = useAppContext();
  const activeStops = stops
      .filter(s => !s.status || s.status === 'pending')
      .sort((a,b) => (a.priority === 'high' ? -1 : 1));
  const completedStops = stops.filter(s => s.status && s.status !== 'pending');
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [useOdo, setUseOdo] = useState(false);
  const [address, setAddress] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [items, setItems] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleAddStop = async (e) => {
    e.preventDefault();
    if (!address) return;
    
    let fullAddress = address;
    if (stateCode) fullAddress += `, ${stateCode}`;
    if (zipCode) fullAddress += ` ${zipCode}`;
    
    const result = await addStop({
      address: fullAddress,
      items: items || 'Unknown Items',
      lat: lat || undefined,
      lng: lng || undefined
    });
    
    if (result && !result.success && result.reason === 'limit') {
        alert('Trial Ended: You can only map 2 stops per day on the free tier. Upgrade to Pro in the top-right to unlock unlimited routing!');
        return;
    }
    
    setAddress('');
    setStateCode('');
    setZipCode('');
    setItems('');
    setLat(null);
    setLng(null);
    setIsAddingStop(false);
  };

  const useCurrentLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latPos = position.coords.latitude;
          const lngPos = position.coords.longitude;
          setLat(latPos);
          setLng(lngPos);
          
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latPos}&lon=${lngPos}`);
            const data = await response.json();
            
            if (data && data.address) {
              const street = data.address.road || data.address.pedestrian || '';
              const houseNumber = data.address.house_number || '';
              const fallback = data.display_name ? data.display_name.split(',')[0] : 'Unknown Street';
              
              setAddress((houseNumber + ' ' + street).trim() || fallback);
              if (data.address.state) setStateCode(data.address.state);
              if (data.address.postcode) setZipCode(data.address.postcode);
            } else {
              setAddress(`GPS (${latPos.toFixed(4)}, ${lngPos.toFixed(4)})`);
            }
          } catch (e) {
            console.error("Reverse geocode failed", e);
            setAddress(`GPS (${latPos.toFixed(4)}, ${lngPos.toFixed(4)})`);
          }
          setIsLocating(false);
        },
        (error) => {
          console.error("Error obtaining location", error);
          alert("Couldn't get your location. Please check browser permissions.");
          setIsLocating(false);
        },
        { timeout: 3000, enableHighAccuracy: true }
      );
    } else {
      alert("Geolocation is not supported by your browser");
      setIsLocating(false);
    }
  };

  const handleStartNavigation = (specificStop = null) => {
    // Navigate to a specific stop, or the first available stop if none passed
    const targetStop = specificStop || (stops && stops.length > 0 ? stops[0] : null);

    if (!targetStop) {
      alert("No stops to navigate to. Add a stop first!");
      return;
    }

    const { lat, lng } = targetStop;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /android/i.test(navigator.userAgent);
    
    let url;
    if (isIOS) {
      // Force Apple Maps turn-by-turn
      url = `maps://?daddr=${lat},${lng}&dirflg=d`;
    } else if (isAndroid) {
      // Force Google Maps app turn-by-turn
      url = `google.navigation:q=${lat},${lng}&mode=d`;
    } else {
      // Universal fallback for desktop/browser
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    
    window.location.href = url; // Native deep links require direct window navigation, _blank can be blocked
  };

  if (isAddingStop) {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease-out', paddingBottom: '1rem' }}>
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Unplanned Stop</h2>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>Found something on the way?</p>
          </div>
          <button className="btn" onClick={() => setIsAddingStop(false)} style={{ padding: '0.5rem', borderRadius: '50%' }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleAddStop} className="card glass">
          <div className="input-group">
            <label className="input-label">Location / Address</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="input-field" 
                style={{ paddingRight: '3rem' }}
                placeholder="e.g. 123 Main St" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoFocus
                required
              />
              <button 
                type="button" 
                onClick={useCurrentLocation}
                disabled={isLocating}
                title="Use Current GPS Location"
                style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', opacity: isLocating ? 0.5 : 1 }}>
                <Crosshair size={20} />
              </button>
            </div>
            {isLocating && <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--accent-color)' }}>Locating...</p>}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <div className="input-group" style={{ marginBottom: 0, flex: 1 }}>
              <label className="input-label">State (Opt.)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. CA" 
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
              />
            </div>
            <div className="input-group" style={{ marginBottom: 0, flex: 1 }}>
              <label className="input-label">Zip Code (Opt.)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. 90210" 
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Items Spotted (Optional)</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Action figures, Video games" 
              value={items}
              onChange={(e) => setItems(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            <Plus size={18} /> Add to Today's Route
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '1rem' }}>
      <div className="flex-between" style={{ marginBottom: '1rem', alignItems: 'center' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            Route Planner <MapPin size={24} className="text-accent" />
          </h1>
          <p style={{ margin: 0, marginTop: '0.25rem' }}>Optimize your treasure hunt</p>
        </div>
        <button className="btn" onClick={clearRoute} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
          Reset Route
        </button>
      </div>

      <div style={{ 
        width: '100%', 
        height: '250px', 
        borderRadius: '16px', 
        overflow: 'hidden', 
        marginBottom: '1rem',
        border: '1px solid var(--border-color)',
        zIndex: 1, 
        position: 'relative'
      }}>
        <MapContainer 
          center={[40.7128, -74.0060]} 
          zoom={13} 
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <MapRouteUpdater stops={activeStops.length > 0 ? activeStops : stops} />
          <LiveLocationMarker />
          {stops.map((stop, i) => (
            <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={createCustomIcon(i + 1)}>
              <Popup className="dark-popup">
                <div style={{ minWidth: '120px' }}>
                  <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>{stop.address}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#555' }}>
                    <Clock size={12} /> {stop.time}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="card glass" style={{ marginBottom: '1.5rem' }}>
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Car size={20} className="text-secondary" /> Mileage Tracker
          </h3>
          <span className="text-accent" style={{ fontWeight: 600 }}>${(mileage * 0.67).toFixed(2)} Deduction</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button className={`btn ${!useOdo ? 'btn-primary' : ''}`} style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }} onClick={() => setUseOdo(false)}>Quick Entry</button>
          <button className={`btn ${useOdo ? 'btn-primary' : ''}`} style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }} onClick={() => setUseOdo(true)}>Odometer</button>
        </div>

        {useOdo ? (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="input-label">Start</label>
              <input type="number" className="input-field" value={startOdo} onChange={(e) => { setStartOdo(e.target.value); if(e.target.value !== '' && endOdo !== '') setMileage(Math.max(0, Number(endOdo) - Number(e.target.value))); }} />
            </div>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="input-label">End</label>
              <input type="number" className="input-field" value={endOdo} onChange={(e) => { setEndOdo(e.target.value); if(startOdo !== '' && e.target.value !== '') setMileage(Math.max(0, Number(e.target.value) - Number(startOdo))); }} />
            </div>
          </div>
        ) : (
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Total Miles Driven</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="number" className="input-field" value={mileage || ''} onChange={(e) => setMileage(Number(e.target.value))} placeholder="e.g. 45" />
              <span className="text-secondary">mi</span>
            </div>
          </div>
        )}
      </div>

      <div className="card glass">
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Active Route</h3>
          <span className="text-secondary" style={{ fontSize: '0.875rem' }}>{activeStops.length} Stops Left</span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activeStops.length === 0 ? <p className="text-secondary" style={{ fontStyle: 'italic', margin: 0 }}>No active stops.</p> : null}
          {activeStops.map((stop, i) => (
            <div key={stop.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', 
                background: 'var(--bg-card)', 
                border: `2px solid ${stop.priority === 'high' ? '#ef4444' : 'var(--accent-color)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: stop.priority === 'high' ? '#ef4444' : 'var(--accent-color)', 
                fontWeight: 'bold',
                flexShrink: 0,
                boxShadow: stop.priority === 'high' ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none'
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1, paddingBottom: '1rem', borderBottom: i < activeStops.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ margin: 0 }}>{stop.address}</h4>
                  <button onClick={() => handleStartNavigation(stop)} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'var(--accent-color)', color: 'var(--text-inverse)', borderRadius: '8px' }}>
                    <Navigation size={12} style={{ marginRight: '4px' }} /> Go
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', alignItems: 'center' }}>
                  <span className="text-secondary" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {stop.time}
                  </span>
                  <span className="text-accent" style={{ fontSize: '0.875rem' }}>{stop.items}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button onClick={() => updateStopStatus(stop.id, 'sourced')} className="btn" style={{ flex: 1, padding: '0.25rem', fontSize: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' }}>✅ Sourced</button>
                  <button onClick={() => updateStopStatus(stop.id, 'dud')} className="btn" style={{ flex: 1, padding: '0.25rem', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>❌ Dud</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {completedStops.length > 0 && (
        <div className="card" style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Completed Stops</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {completedStops.map((stop) => (
              <div key={stop.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
                <span style={{ textDecoration: stop.status === 'dud' ? 'line-through' : 'none', fontSize: '0.875rem' }}>{stop.address}</span>
                <span style={{ fontWeight: 'bold', fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: stop.status === 'sourced' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: stop.status === 'sourced' ? '#22c55e' : '#ef4444' }}>
                  {stop.status === 'sourced' ? 'SOURCED' : 'DUD'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button className="btn btn-primary" onClick={() => handleStartNavigation()} style={{ flex: 2 }}>
          <Navigation size={18} /> Start Navigation
        </button>
        <button className="btn" onClick={() => setIsAddingStop(true)} style={{ flex: 1, background: 'rgba(0,0,0,0.03)' }}>
          <Plus size={18} /> Add Stop
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .leaflet-popup-content-wrapper { border-radius: 12px !important; box-shadow: 0 4px 14px rgba(0,0,0,0.3) !important; }
        .leaflet-popup-tip { box-shadow: none !important; }
      `}} />
    </div>
  );
}
