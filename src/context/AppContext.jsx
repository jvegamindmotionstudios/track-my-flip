import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // States
  const [budget, setBudget] = useState(() => {
    const saved = localStorage.getItem('tmf_budget');
    return saved ? JSON.parse(saved) : 200;
  });
  const [mileage, setMileage] = useState(() => {
    const saved = localStorage.getItem('tmf_mileage');
    return saved ? JSON.parse(saved) : 0;
  });
  const [startOdo, setStartOdo] = useState(() => {
    const saved = localStorage.getItem('tmf_startOdo');
    return saved ? JSON.parse(saved) : '';
  });
  const [endOdo, setEndOdo] = useState(() => {
    const saved = localStorage.getItem('tmf_endOdo');
    return saved ? JSON.parse(saved) : '';
  });
  
  const [inventory, setInventory] = useState([]);
  const [stops, setStops] = useState([]);
  const [trackedDrives, setTrackedDrives] = useState([]);
  const [history, setHistory] = useState([]);
  const [userProfile, setUserProfile] = useState({ companyName: '', address: '', phone: '', email: '' });
  const [isPro, setIsPro] = useState(false);

  const [isDriveTracking, setIsDriveTracking] = useState(false);
  const [activeDrive, setActiveDrive] = useState(null);
  const [pendingDrivePrompt, setPendingDrivePrompt] = useState(null);

  // Trial Enforcements
  const [isTrialing, setIsTrialing] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);

  // 1. Fetch Auth & Cloud Data on Mount
  useEffect(() => {
    const fetchUserAndData = async () => {
      if (!isSupabaseConfigured || !supabase) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        // Trial calculation
        const createdAt = new Date(session.user.created_at).getTime();
        const now = Date.now();
        const daysActive = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
        const remainingTrialDays = 7 - daysActive;
        // Don't set state yet until we know if they are Pro, but initialize the values
        let trialActive = remainingTrialDays > 0;
        
        // Fetch inventory
        const { data: invData, error: err1 } = await supabase
          .from('inventory')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        
        if (invData) {
          setInventory(invData.map(d => ({
             ...d,
             soldPrice: Number(d.sold_price || 0),
             platformFees: Number(d.platform_fees || 0),
             price: Number(d.price || 0)
          })));
        }

        // Fetch stops
        const { data: stopsData } = await supabase
          .from('stops')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        if (stopsData) setStops(stopsData);

        // Fetch tracked drives
        const { data: drivesData } = await supabase
          .from('tracked_drives')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        if (drivesData) {
          setTrackedDrives(drivesData.map(d => ({
             id: d.id,
             startTime: Number(d.start_time),
             endTime: Number(d.end_time),
             distanceMiles: Number(d.distance_miles),
             purpose: d.purpose
          })));
        }
        // Fetch user profile & pro status
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
          
        if (profileData) {
          const isUserPro = profileData.is_pro === true;
          setIsPro(isUserPro);
          setIsTrialing(!isUserPro && trialActive);
          setTrialDaysLeft(trialActive ? remainingTrialDays : 0);
          
          setUserProfile({
            companyName: profileData.company_name || '',
            address: profileData.address || '',
            phone: profileData.phone || '',
            email: profileData.email || ''
          });
        } else {
          setIsPro(false);
          setIsTrialing(trialActive);
          setTrialDaysLeft(trialActive ? remainingTrialDays : 0);
        }

      }
    };

    fetchUserAndData();
  }, []);

  // 2. Keep local storage for non-cloud keys so forms don't reset weirdly during dev
  useEffect(() => { localStorage.setItem('tmf_budget', JSON.stringify(budget)); }, [budget]);
  useEffect(() => { localStorage.setItem('tmf_mileage', JSON.stringify(mileage)); }, [mileage]);
  useEffect(() => { localStorage.setItem('tmf_startOdo', JSON.stringify(startOdo)); }, [startOdo]);
  useEffect(() => { localStorage.setItem('tmf_endOdo', JSON.stringify(endOdo)); }, [endOdo]);

  const calculateDistanceMiles = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  };

  useEffect(() => {
    let watchId;
    if (isDriveTracking) {
      if (!activeDrive) {
        setActiveDrive({
          id: Date.now(),
          startTime: Date.now(),
          lastPingTime: Date.now(),
          distanceMiles: 0,
          path: []
        });
      }
      
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setActiveDrive(prev => {
            if (!prev) return prev;
            const now = Date.now();
            let newDrive = { ...prev };
            
            const STOP_THRESHOLD_MS = 5 * 60 * 1000; 
            
            if (prev.path.length > 0) {
                 const timeDiff = now - prev.lastPingTime;
                 if (timeDiff > STOP_THRESHOLD_MS) {
                     const finishedDrive = {
                         id: prev.id,
                         startTime: prev.startTime,
                         endTime: prev.lastPingTime,
                         distanceMiles: prev.distanceMiles,
                         purpose: 'unclassified'
                     };
                     if (finishedDrive.distanceMiles > 0.1) {
                         setTrackedDrives(logs => [finishedDrive, ...logs]);
                         setPendingDrivePrompt(finishedDrive);
                         // Cloud sync
                         if (user && isSupabaseConfigured) {
                            supabase.from('tracked_drives').insert([{
                                id: finishedDrive.id,
                                user_id: user.id,
                                start_time: finishedDrive.startTime,
                                end_time: finishedDrive.endTime,
                                distance_miles: finishedDrive.distanceMiles,
                                purpose: finishedDrive.purpose
                            }]).then();
                         }
                     }
                     newDrive = { id: now, startTime: now, distanceMiles: 0, path: [] };
                 } else {
                     const lastCoord = prev.path[prev.path.length - 1];
                     const dist = calculateDistanceMiles(lastCoord.lat, lastCoord.lng, latitude, longitude);
                     newDrive.distanceMiles += dist;
                 }
            }
            newDrive.lastPingTime = now;
            newDrive.path = [...newDrive.path, {lat: latitude, lng: longitude}];
            return newDrive;
          });
        },
        (error) => console.error("GPS Tracking Error:", error),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    } else {
       if (activeDrive) {
          const finishedDrive = {
             id: activeDrive.id,
             startTime: activeDrive.startTime,
             endTime: activeDrive.lastPingTime,
             distanceMiles: activeDrive.distanceMiles,
             purpose: 'unclassified'
          };
          if (finishedDrive.distanceMiles > 0.05) {
             setTrackedDrives(logs => [finishedDrive, ...logs]);
             setPendingDrivePrompt(finishedDrive);
             // Cloud sync
             if (user && isSupabaseConfigured) {
                supabase.from('tracked_drives').insert([{
                    id: finishedDrive.id,
                    user_id: user.id,
                    start_time: finishedDrive.startTime,
                    end_time: finishedDrive.endTime,
                    distance_miles: finishedDrive.distanceMiles,
                    purpose: finishedDrive.purpose
                }]).then();
             }
          }
          setActiveDrive(null);
       }
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [isDriveTracking, user]);

  const classifyDrive = async (id, purpose) => {
    setTrackedDrives(prev => prev.map(d => d.id === id ? { ...d, purpose } : d));
    if (user && isSupabaseConfigured) {
       await supabase.from('tracked_drives').update({ purpose }).eq('id', id);
    }
  };

  const addInventoryItem = async (item) => {
    if (!isPro && inventory.filter(i => i.status === 'active').length >= 15) {
      alert("You've hit the Free tier limit of 15 active items! Please upgrade to Pro for unlimited tracking.");
      // In a real app we might trigger a modal, for now alert works.
      return false;
    }

    const colors = ['#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#3b82f6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const id = Date.now();
    
    const newItem = {
      ...item,
      id,
      status: 'active',
      bg: randomColor
    };
    
    setInventory(prev => [newItem, ...prev]);

    if (user && isSupabaseConfigured) {
      await supabase.from('inventory').insert([{
        id,
        user_id: user.id,
        name: item.name || '',
        price: Number(item.price) || 0,
        status: 'active',
        bg: randomColor
      }]);
    }
  };

  const updateInventoryItem = async (id, updates) => {
    setInventory(inventory.map(item => item.id === id ? { ...item, ...updates } : item));
    
    if (user && isSupabaseConfigured) {
      const dbUpdates = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.price !== undefined) dbUpdates.price = Number(updates.price);
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.soldPrice !== undefined) dbUpdates.sold_price = Number(updates.soldPrice);
      if (updates.platformFees !== undefined) dbUpdates.platform_fees = Number(updates.platformFees);
      
      await supabase.from('inventory').update(dbUpdates).eq('id', id);
    }
  };

  const addStop = async (stop, priority = 'standard') => {
    if (!isPro && !isTrialing && stops.filter(s => s.status === 'pending' || !s.status).length >= 2) {
       return { success: false, reason: 'limit' };
    }

    const timeString = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const id = Date.now();
    
    const newStop = {
      id,
      address: stop.address,
      items: stop.items,
      lat: stop.lat || (40.7128 + (Math.random() - 0.5) * 0.05),
      lng: stop.lng || (-74.0060 + (Math.random() - 0.5) * 0.05),
      status: 'pending',
      priority,
      time: timeString
    };
    
    // Explicit optimistic UI Update so it always works immediately
    setStops(prev => [newStop, ...prev]);

    if (user && isSupabaseConfigured) {
        // Use the proper legacy schema names (title, notes)
        await supabase.from('stops').insert([{
            id,
            user_id: user.id,
            lat: newStop.lat,
            lng: newStop.lng,
            time: timeString,
            status: 'pending',
            priority,
            title: stop.items || '',
            notes: stop.address || ''
        }]);
    }
    
    return { success: true };
  };

  const updateStopStatus = async (id, newStatus) => {
    setStops(stops.map(s => s.id === id ? { ...s, status: newStatus } : s));
    
    if (user && isSupabaseConfigured) {
       await supabase.from('stops').update({ status: newStatus }).eq('id', id);
    }
  };

  const resetDay = () => {
    if (window.confirm("Are you sure you want to completely reset for a new day? Local data will clear.")) {
       setInventory([]);
       setStops([]);
       setTrackedDrives([]);
       setMileage(0);
       setStartOdo('');
       setEndOdo('');
       setBudget(200);
    }
  };

  const spent = inventory.reduce((total, item) => total + (Number(item.price) || 0), 0);
  const revenue = inventory.reduce((total, item) => total + (item.status === 'sold' ? (Number(item.soldPrice) || 0) : 0), 0);
  const fees = inventory.reduce((total, item) => total + (item.status === 'sold' ? (Number(item.platformFees) || 0) : 0), 0);

  return (
    <AppContext.Provider value={{ 
      budget, setBudget, 
      inventory, addInventoryItem, updateInventoryItem,
      spent, revenue, fees,
      stops, addStop, updateStopStatus,
      mileage, setMileage,
      startOdo, setStartOdo,
      endOdo, setEndOdo,
      history, setHistory,
      isDriveTracking, setIsDriveTracking,
      trackedDrives, setTrackedDrives,
      activeDrive, setActiveDrive,
      classifyDrive,
      pendingDrivePrompt, setPendingDrivePrompt,
      resetDay,
      userProfile, setUserProfile,
      isPro, setIsPro,
      isTrialing, trialDaysLeft
    }}>
      {children}
    </AppContext.Provider>
  );
};
