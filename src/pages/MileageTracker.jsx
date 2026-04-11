import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Play, Square, MapPin, Download, Plus, Clock, X, Map as MapIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet marker icon issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to auto-fit bounds on the map
const MapBounds = ({ path }) => {
  const map = useMap();
  useEffect(() => {
    if (path && path.length > 0) {
      const bounds = L.latLngBounds(path.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, path]);
  return null;
};

const MileageTracker = () => {
   const { isDriveTracking, setIsDriveTracking, trackedDrives, classifyDrive, setTrackedDrives, activeDrive } = useAppContext();
   const [viewingMapPath, setViewingMapPath] = useState(null);

   const toggleTracking = () => {
      setIsDriveTracking(!isDriveTracking);
   };

   // Mock Simulator for Testing Background Drops without driving 5 miles
   const simulateDrive = () => {
      const now = Date.now();
      const baseLat = 40.7128 + (Math.random() - 0.5) * 0.1;
      const baseLng = -74.0060 + (Math.random() - 0.5) * 0.1;
      
      const mockPath = [
         {lat: baseLat, lng: baseLng},
         {lat: baseLat + (Math.random() * 0.02), lng: baseLng + (Math.random() * 0.02)},
         {lat: baseLat + (Math.random() * 0.04), lng: baseLng - (Math.random() * 0.01)},
         {lat: baseLat + (Math.random() * 0.06), lng: baseLng + (Math.random() * 0.03)}
      ];

      const mockDrive = {
         id: now,
         startTime: now - (1000 * 60 * 25), // 25 mins ago
         endTime: now,
         distanceMiles: Number((Math.random() * 5 + 1).toFixed(1)), // 1 to 6 miles
         purpose: 'unclassified',
         path: mockPath
      };
      setTrackedDrives(prev => [mockDrive, ...prev]);
   };

   const exportLog = () => {
      if (trackedDrives.length === 0) return alert("No drives to export!");
      const worksheet = XLSX.utils.json_to_sheet(trackedDrives.map(d => ({
         "Date": new Date(d.startTime).toLocaleDateString(),
         "Start Time": new Date(d.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
         "End Time": d.endTime ? new Date(d.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Ongoing',
         "Distance (Miles)": Number(d.distanceMiles).toFixed(2),
         "Classification": d.purpose.toUpperCase(),
         "Tax Value ($0.67/mi)": d.purpose === 'business' ? `$${(d.distanceMiles * 0.67).toFixed(2)}` : '$0.00'
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Mileage Log");
      XLSX.writeFile(workbook, "AutoMileageLog.xlsx");
   };

   return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
       {/* Big Tracking Toggle */}
       <div className="card glass" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Auto Mileage Tracker</h2>
          <button 
             onClick={toggleTracking}
             style={{
                width: '120px', height: '120px', borderRadius: '50%', border: 'none',
                background: isDriveTracking ? 'var(--danger-color)' : 'var(--accent-color)',
                color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                boxShadow: `0 0 20px ${isDriveTracking ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                animation: isDriveTracking ? 'pulse 2s infinite' : 'none',
                transition: 'all 0.3s'
             }}
          >
             {isDriveTracking ? <Square size={32} /> : <Play size={32} />}
             <span style={{ marginTop: '0.5rem' }}>{isDriveTracking ? 'STOP' : 'START'}</span>
          </button>
          
          <div style={{ marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
             {isDriveTracking ? (
                 <p style={{ color: 'var(--accent-color)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    Tracking Active • {activeDrive ? Number(activeDrive.distanceMiles).toFixed(2) : '0.00'} mi tracked
                 </p>
             ) : (
                 <p>Ready to track. Turn on before hitting the road.</p>
             )}
          </div>
       </div>

       {/* Sub actions */}
       <div style={{ display: 'flex', gap: '0.5rem' }}>
           <button className="btn" onClick={simulateDrive} style={{ flex: 1, fontSize: '0.8rem', background: 'rgba(0,0,0,0.03)' }}><Plus size={16}/> Mock Drive</button>
           <button className="btn" onClick={exportLog} style={{ flex: 1, fontSize: '0.8rem', background: 'rgba(0,0,0,0.03)' }}><Download size={16}/> Export Excel</button>
       </div>

       {/* Drives List */}
       <h3>Review Drives</h3>
       {trackedDrives.length === 0 && (
           <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(0,0,0,0.03)', borderRadius: '12px', color: 'var(--text-secondary)' }}>
              No drives recorded yet. Tap Start or simulate a drive.
           </div>
       )}
       {trackedDrives.map(drive => {
          const isBusiness = drive.purpose === 'business';
          const isPersonal = drive.purpose === 'personal';
          
          return (
          <div key={drive.id} className="card glass" style={{ 
              padding: '1rem', 
              borderLeft: isBusiness ? '4px solid var(--accent-color)' : isPersonal ? '4px solid var(--text-secondary)' : '4px solid #f59e0b',
              marginBottom: '0.5rem'
          }}>
             <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <Clock size={16} color="var(--text-secondary)"/>
                   {new Date(drive.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>
                   {Number(drive.distanceMiles).toFixed(1)} mi
                </div>
             </div>
             
             <div className="flex-between" style={{ margin: '0 0 1rem 0', fontSize: '0.8rem' }}>
                <p style={{ margin: 0 }}>Value: <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>${(drive.distanceMiles * 0.67).toFixed(2)}</span></p>
                {drive.path && drive.path.length > 0 && (
                   <button 
                     onClick={() => setViewingMapPath(drive)}
                     style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                   >
                     <MapIcon size={14} /> View Map
                   </button>
                )}
             </div>
             
             <div style={{ display: 'flex', gap: '0.5rem' }}>
                 <button 
                    onClick={() => classifyDrive(drive.id, 'business')}
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: isBusiness ? 'var(--accent-color)' : 'rgba(0,0,0,0.05)', color: isBusiness ? '#fff' : 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600 }}
                 >
                    {isBusiness ? '✓ Business' : 'Business'}
                 </button>
                 <button 
                    onClick={() => classifyDrive(drive.id, 'personal')}
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: isPersonal ? '#64748b' : 'rgba(0,0,0,0.05)', color: isPersonal ? '#fff' : 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600 }}
                 >
                    {isPersonal ? '✓ Personal' : 'Personal'}
                 </button>
             </div>
          </div>
       )})}

       {/* Map Modal */}
       {viewingMapPath && (
         <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-color)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
           <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
             <h3 style={{ margin: 0 }}>Route Map</h3>
             <button onClick={() => setViewingMapPath(null)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer' }}>
               <X size={20} />
             </button>
           </div>
           
           <div style={{ flex: 1, position: 'relative' }}>
               <MapContainer 
                 center={[viewingMapPath.path[0].lat, viewingMapPath.path[0].lng]} 
                 zoom={13} 
                 style={{ height: '100%', width: '100%' }}
                 zoomControl={false}
               >
                 <TileLayer
                   url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                   attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
                 />
                 <MapBounds path={viewingMapPath.path} />
                 <Polyline positions={viewingMapPath.path.map(p => [p.lat, p.lng])} color="var(--accent-color)" weight={5} opacity={0.8} />
                 
                 {/* Start/End Markers */}
                 <Marker position={[viewingMapPath.path[0].lat, viewingMapPath.path[0].lng]} />
                 <Marker position={[viewingMapPath.path[viewingMapPath.path.length-1].lat, viewingMapPath.path[viewingMapPath.path.length-1].lng]} />
               </MapContainer>
           </div>
           
           <div style={{ padding: '1.5rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
             <div className="flex-between">
                <div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Distance</div>
                   <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{Number(viewingMapPath.distanceMiles).toFixed(1)} mi</div>
                </div>
                <div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tax Code</div>
                   <div style={{ fontWeight: 600, color: viewingMapPath.purpose === 'business' ? 'var(--accent-color)' : 'var(--text-primary)' }}>
                      {viewingMapPath.purpose.toUpperCase()}
                   </div>
                </div>
             </div>
           </div>
         </div>
       )}
    </div>
   );
};

export default MileageTracker;
