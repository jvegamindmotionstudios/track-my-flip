import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Camera, X, Maximize, ExternalLink, ScanLine } from 'lucide-react';
import ProfitCalculator from './ProfitCalculator';
import { Html5Qrcode } from 'html5-qrcode';

export default function PriceEstimator() {
  const [activeTab, setActiveTab] = useState('estimator'); // 'estimator' or 'calculator'
  const [query, setQuery] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [estimationQuery, setEstimationQuery] = useState('');

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);

  // Photo Comp state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const mockCameraFeeds = [
    'https://images.unsplash.com/photo-1549646452-fddfa31ec2af?w=400&q=80',
    'https://images.unsplash.com/photo-1594957367852-aa006fc519bf?w=400&q=80',
  ];
  const [currentFeed, setCurrentFeed] = useState(mockCameraFeeds[0]);

  useEffect(() => {
    let scanner;
    if (isScanning) {
      setTimeout(() => {
        try {
          if (!document.getElementById("barcode-reader")) return;
          scanner = new Html5Qrcode("barcode-reader");
          scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 300, height: 150 } },
            (decodedText) => {
              // Success!
              scanner.stop().then(() => {
                scanner.clear();
                setIsScanning(false);
                setQuery(decodedText);
                triggerEstimate(decodedText);
              }).catch(console.error);
            },
            (error) => { /* ignore frame errors */ }
          ).catch((err) => {
            console.error("Camera start failed.", err);
          });
        } catch(e) {
            console.error("Initialization Failed:", e);
        }
      }, 150);
    }

    return () => {
      if (scanner && scanner.isScanning) {
        scanner.stop().then(() => scanner.clear()).catch(console.error);
      }
    };
  }, [isScanning]);

  const triggerEstimate = (searchQuery = query) => {
    if (!searchQuery) return;
    setIsEstimating(true);
    setHasResult(false);
    setTimeout(() => {
      setIsEstimating(false);
      setEstimationQuery(searchQuery);
      setHasResult(true);
    }, 1500);
  };

  const handleEstimate = (e) => {
    if (e) e.preventDefault();
    triggerEstimate(query);
  };

  const openCamera = () => {
    setCurrentFeed(mockCameraFeeds[Math.floor(Math.random() * mockCameraFeeds.length)]);
    setIsCameraActive(true);
  };

  const handleCapture = () => {
    setFlashActive(true);
    setTimeout(() => {
      setFlashActive(false);
      setIsCameraActive(false);
      const mockItem = "Vintage Polaroid SX-70 Camera";
      setQuery(mockItem);
      triggerEstimate(mockItem);
    }, 400);
  };

  if (isCameraActive) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column'
      }}>
        {flashActive && (
          <div style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 10, animation: 'fadeOut 0.4s ease-out forwards' }} />
        )}
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', zIndex: 5 }}>
          <button className="btn" style={{ background: 'rgba(0,0,0,0.5)', border: 'none' }} onClick={() => setIsCameraActive(false)}>
            <X size={24} color="#fff" />
          </button>
          <div style={{ color: 'var(--text-inverse)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} className="text-accent" /> Visual Search
          </div>
        </div>
        
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={currentFeed} alt="Camera Feed" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
          <div style={{ position: 'absolute', border: '2px solid var(--accent-color)', width: '70%', height: '40%', borderRadius: '16px', boxShadow: '0 0 0 4000px rgba(0,0,0,0.5)' }}>
             <Maximize size={48} color="rgba(255,255,255,0.6)" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          </div>
        </div>

        <div style={{ height: '120px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <button onClick={handleCapture} style={{
            width: '70px', height: '70px', borderRadius: '50%', border: '4px solid #fff',
            background: 'rgba(0,0,0,0.12)', cursor: 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#fff' }} />
          </button>
        </div>
        <style>{`@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }`}</style>
      </div>
    );
  }

  if (isScanning) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: '#0a0a0a', zIndex: 9999, display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', zIndex: 5 }}>
          <button className="btn" style={{ background: 'rgba(0,0,0,0.06)', border: 'none' }} onClick={() => setIsScanning(false)}>
            <X size={24} color="#fff" />
          </button>
          <div style={{ color: 'var(--text-inverse)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ScanLine size={18} className="text-accent" /> Scan UPC / Barcode
          </div>
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div id="barcode-reader" style={{ width: '100%', maxWidth: '500px', borderRadius: '16px', overflow: 'hidden' }}></div>
          <p className="text-secondary" style={{ marginTop: '1.5rem', textAlign: 'center', padding: '0 1rem' }}>
            Point camera at any barcode or ISBN to instantly pull comp data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--bg-card)', padding: '0.25rem', borderRadius: '12px' }}>
         <button onClick={() => setActiveTab('estimator')} style={{ flex: 1, padding: '0.5rem', border: 'none', background: activeTab === 'estimator' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'estimator' ? '#fff' : 'var(--text-secondary)', borderRadius: '8px' }}>🔍 Visual Comps</button>
         <button onClick={() => setActiveTab('calculator')} style={{ flex: 1, padding: '0.5rem', border: 'none', background: activeTab === 'calculator' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'calculator' ? '#fff' : 'var(--text-secondary)', borderRadius: '8px' }}>🧮 Profit Calc</button>
      </div>

      {activeTab === 'estimator' ? (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Comp It <Sparkles size={24} className="text-accent" />
            </h1>
            <p>Check potential resale value</p>
          </div>

          <div className="card glass">
            <form onSubmit={handleEstimate}>
              <div className="input-group">
                <label className="input-label">Item Description</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    className="input-field"
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                    placeholder="e.g. Polaroid SX-70 Camera"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <button 
                    type="button" 
                    onClick={openCamera}
                    style={{ position: 'absolute', right: '0.5rem', background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: '0.25rem' }}>
                    <Camera size={20} />
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={isEstimating}>
                    <Search size={18} style={{ marginRight: '0.25rem' }} /> {isEstimating ? 'Analyzing...' : 'Search'}
                </button>
                <button type="button" className="btn" onClick={() => setIsScanning(true)} style={{ flex: 1.5, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    <ScanLine size={18} style={{ marginRight: '0.25rem' }} /> Scan UPC
                </button>
              </div>
            </form>
          </div>

          {!isEstimating && hasResult && (
            <div className="card" style={{ marginTop: '1.5rem', animation: 'fadeIn 0.5s ease-out' }}>
              <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Estimated Value</h3>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success-color)' }}>$120 - $150</span>
              </div>
              <h4 style={{ margin: 0 }}>{estimationQuery}</h4>
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Based on recent online marketplace data. High demand for functional vintage models.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
                <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  High Demand
                </span>
                <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-color)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  Vintage
                </span>
              </div>
              
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Verify current listings:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <a 
                    href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(estimationQuery)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn" 
                    style={{ justifyContent: 'space-between', background: 'rgba(0, 100, 210, 0.1)', borderColor: 'rgba(0, 100, 210, 0.3)', color: '#0064d2' }}
                  >
                    Search on eBay <ExternalLink size={16} />
                  </a>
                  <a 
                    href={`https://www.mercari.com/search/?keyword=${encodeURIComponent(estimationQuery)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn" 
                    style={{ justifyContent: 'space-between', background: 'rgba(230, 0, 18, 0.1)', borderColor: 'rgba(230, 0, 18, 0.3)', color: '#e60012' }}
                  >
                    Search on Mercari <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <ProfitCalculator />
      )}
    </div>
  );
}
