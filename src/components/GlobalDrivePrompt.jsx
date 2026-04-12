import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Clock, Map as MapIcon } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

// Helper for map bounding
const MapBounds = ({ path }) => {
  const map = useMap();
  useEffect(() => {
    if (path && path.length > 0) {
      const bounds = L.latLngBounds(path.map(p => [p.lat, p.lng]));
      // Add slight delay to allow container layout calculation before fitting bounds
      setTimeout(() => {
         map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
      }, 100);
    }
  }, [map, path]);
  return null;
};

export default function GlobalDrivePrompt() {
  const { pendingDrivePrompt, setPendingDrivePrompt, classifyDrive } = useAppContext();

  if (!pendingDrivePrompt) return null;
  
  const drive = pendingDrivePrompt;
  const taxValue = (drive.distanceMiles * 0.67).toFixed(2);

  const handleClassify = (purpose) => {
     classifyDrive(drive.id, purpose);
     setPendingDrivePrompt(null);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.3s ease-out' }}>
      <div className="card glass" style={{ width: '100%', maxWidth: '400px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
        
        {/* Header Header */}
        <div style={{ background: 'var(--danger-color)', color: 'white', padding: '1rem', textAlign: 'center' }}>
           <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>New Drive Detected</h3>
           <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>Classify your recent trip for IRS logging.</p>
        </div>

        {/* Map Preview */}
        {drive.path && drive.path.length > 0 ? (
          <div style={{ height: '200px', width: '100%', background: '#eee', position: 'relative' }}>
             <MapContainer 
               center={[drive.path[0].lat, drive.path[0].lng]} 
               zoom={13} 
               style={{ height: '100%', width: '100%' }}
               zoomControl={false}
               attributionControl={false}
             >
               <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
               <MapBounds path={drive.path} />
               <Polyline positions={drive.path.map(p => [p.lat, p.lng])} color="var(--accent-color)" weight={6} opacity={0.8} />
               <Marker position={[drive.path[0].lat, drive.path[0].lng]} />
               <Marker position={[drive.path[drive.path.length-1].lat, drive.path[drive.path.length-1].lng]} />
             </MapContainer>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
             <MapIcon size={32} opacity={0.3} style={{ marginBottom: '0.5rem' }} />
             <p style={{ margin: 0 }}>No GPS Path Data Found for this Drive</p>
          </div>
        )}

        {/* Drive Info */}
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
           <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
             <Clock size={14} />
             {new Date(drive.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
             {drive.endTime && ` to ${new Date(drive.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
           </div>
           <div style={{ fontSize: '3rem', fontWeight: 800, margin: '0.5rem 0', letterSpacing: '-1px', color: 'var(--text-primary)' }}>
              {Number(drive.distanceMiles).toFixed(1)} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>mi</span>
           </div>
        </div>

        {/* Action Blocks */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)' }}>
            <button 
               onClick={() => handleClassify('personal')}
               style={{ flex: 1, padding: '1.25rem', border: 'none', borderRight: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, transition: 'all 0.2s' }}
            >
               Personal
            </button>
            <button 
               onClick={() => handleClassify('business')}
               style={{ flex: 1, padding: '1.25rem', border: 'none', background: 'var(--success-color)', color: '#fff', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700, transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            >
               <span>Business</span>
               <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>+${taxValue}</span>
            </button>
        </div>
      </div>
    </div>
  );
}
