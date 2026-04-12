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
   const { isPro, isTrialing, isDriveTracking, setIsDriveTracking, trackedDrives, classifyDrive, setTrackedDrives, activeDrive } = useAppContext();
   const [viewingMapPath, setViewingMapPath] = useState(null);

   const toggleTracking = () => {
      setIsDriveTracking(!isDriveTracking);
   };

   // State for queue tabs
   const [activeTab, setActiveTab] = useState('unclassified');

   // Calculate Total Potential Business Deduction
   const businessMiles = trackedDrives
       .filter(d => d.purpose === 'business')
       .reduce((acc, curr) => acc + Number(curr.distanceMiles), 0);
   const totalDeductionValue = (businessMiles * 0.67).toFixed(2);

   const unclassifiedDrives = trackedDrives.filter(d => d.purpose === 'unclassified');
   const classifiedDrives = trackedDrives.filter(d => d.purpose !== 'unclassified');

   const exportLog = () => {
      if (!isPro && !isTrialing) {
          alert('Trial Ended: Exporting tax reports is a Premium feature. Upgrade to Pro in the top-right menu to unlock exports!');
          return;
      }
      const businessDrives = trackedDrives.filter(d => d.purpose === 'business');
      if (businessDrives.length === 0) return alert("No Business drives to export for IRS report!");
      
      const worksheet = XLSX.utils.json_to_sheet(businessDrives.map(d => ({
         "Date": new Date(d.startTime).toLocaleDateString(),
         "Start Time": new Date(d.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
         "End Time": d.endTime ? new Date(d.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Ongoing',
         "Business Distance (Miles)": Number(d.distanceMiles).toFixed(2),
         "Classification": d.purpose.toUpperCase(),
         "IRS Tax Value ($0.67/mi)": `$${(d.distanceMiles * 0.67).toFixed(2)}`
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Mileage Log");
      XLSX.writeFile(workbook, "AutoMileageLog.xlsx");
   };

   return (
     <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
       
       {/* Hero Banner: Total Savings */}
       <div className="card glass" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', textAlign: 'center', padding: '2rem 1rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}><MapPin size={100} /></div>
          <h3 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Total Business Tax Deduction</h3>
          <h1 style={{ fontSize: '3.5rem', margin: '0.25rem 0', fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            <span style={{ fontSize: '2rem', opacity: 0.8 }}>$</span>{totalDeductionValue}
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>Based on {businessMiles.toFixed(1)} IRS-eligible miles</p>
       </div>

       {/* Big Tracking Toggle */}
       <div className="card glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isDriveTracking ? '#ef4444' : '#10b981', animation: isDriveTracking ? 'pulse 1.5s infinite' : 'none' }} />
              Auto Tracker
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {isDriveTracking ? `Recording • ${activeDrive ? Number(activeDrive.distanceMiles).toFixed(2) : '0.00'} mi` : 'Ready when you drive'}
            </p>
          </div>
          <button 
             onClick={toggleTracking}
             style={{
                width: '60px', height: '60px', borderRadius: '50%', border: 'none',
                background: isDriveTracking ? 'var(--danger-color)' : 'var(--accent-color)',
                color: '#fff', cursor: 'pointer',
                boxShadow: `0 4px 15px ${isDriveTracking ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s'
             }}
          >
             {isDriveTracking ? <Square size={24} fill="#fff" /> : <Play size={24} fill="#fff" style={{ marginLeft: '4px' }} />}
          </button>
       </div>

       {/* Sub actions */}
       <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '0.25rem' }}>
           <button className="btn" onClick={exportLog} style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.03)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}><Download size={14}/> Download IRS Log</button>
       </div>

       {/* Drives Queue Tabs */}
       <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
          <button 
            onClick={() => setActiveTab('unclassified')}
            style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', borderBottom: activeTab === 'unclassified' ? '2px solid var(--accent-color)' : '2px solid transparent', color: activeTab === 'unclassified' ? 'var(--accent-color)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            Unclassified {unclassifiedDrives.length > 0 && <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '10px' }}>{unclassifiedDrives.length}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('all')}
            style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', borderBottom: activeTab === 'all' ? '2px solid var(--accent-color)' : '2px solid transparent', color: activeTab === 'all' ? 'var(--accent-color)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            All Drives
          </button>
       </div>

       {/* Drives List */}
       <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           {(activeTab === 'unclassified' ? unclassifiedDrives : classifiedDrives).length === 0 && (
               <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-card)', borderRadius: '16px', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)' }}>
                  <MapPin size={48} opacity={0.2} style={{ marginBottom: '1rem' }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>No {activeTab === 'unclassified' ? 'unclassified' : 'classified'} drives.</p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem' }}>Turn on Auto Tracker before driving.</p>
               </div>
           )}

           {(activeTab === 'unclassified' ? unclassifiedDrives : classifiedDrives).map(drive => {
              const isBusiness = drive.purpose === 'business';
              const isPersonal = drive.purpose === 'personal';
              const taxValue = (drive.distanceMiles * 0.67).toFixed(2);
              
              return (
              <div key={drive.id} className="card glass" style={{ 
                  padding: 0, 
                  overflow: 'hidden',
                  border: isBusiness ? '1px solid rgba(16, 185, 129, 0.3)' : isPersonal ? '1px solid var(--border-color)' : '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: drive.purpose === 'unclassified' ? '0 8px 30px rgba(0,0,0,0.06)' : 'none'
              }}>
                 {/* Top Map preview bar if available */}
                 <div style={{ background: 'var(--bg-color)', padding: '1rem 1rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                       <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, display: 'flex', gap: '6px', alignItems: 'center' }}>
                         <Clock size={12} />
                         {new Date(drive.startTime).toLocaleDateString()} at {new Date(drive.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </div>
                       <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', letterSpacing: '-0.5px' }}>
                          {Number(drive.distanceMiles).toFixed(1)} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>mi</span>
                       </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                       <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Potential Value</div>
                       <div style={{ fontSize: '1.25rem', fontWeight: 700, color: drive.purpose === 'personal' ? 'var(--text-secondary)' : 'var(--success-color)', textDecoration: drive.purpose === 'personal' ? 'line-through' : 'none' }}>
                          ${taxValue}
                       </div>
                    </div>
                 </div>

                 {drive.path && drive.path.length > 0 && (
                    <div style={{ padding: '0 1rem 0.5rem' }}>
                       <button 
                         onClick={() => setViewingMapPath(drive)}
                         style={{ background: 'rgba(0,0,0,0.03)', borderRadius: '8px', padding: '0.5rem', width: '100%', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600 }}
                       >
                         <MapIcon size={14} /> Review GPS Path
                       </button>
                    </div>
                 )}
                 
                 {/* Swipe-like Actions */}
                 {drive.purpose === 'unclassified' ? (
                     <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)' }}>
                         <button 
                            onClick={() => classifyDrive(drive.id, 'personal')}
                            style={{ flex: 1, padding: '1.25rem', border: 'none', borderRight: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, transition: 'all 0.2s' }}
                         >
                            Personal
                         </button>
                         <button 
                            onClick={() => classifyDrive(drive.id, 'business')}
                            style={{ flex: 1, padding: '1.25rem', border: 'none', background: 'var(--success-color)', color: '#fff', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                         >
                            Business <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>+${taxValue}</span>
                         </button>
                     </div>
                 ) : (
                     <div style={{ background: isBusiness ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.03)', padding: '0.75rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: isBusiness ? 'var(--success-color)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderTop: '1px solid var(--border-color)' }}>
                        {isBusiness ? '✓ Logged as IRS Business' : 'Logged as Personal Drive'}
                     </div>
                 )}
              </div>
           )})}
       </div>

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
