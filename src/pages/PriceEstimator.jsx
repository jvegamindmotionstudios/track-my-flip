import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, Camera, X, Maximize, ExternalLink, ScanLine } from 'lucide-react';
import ProfitCalculator from './ProfitCalculator';
import { Html5Qrcode } from 'html5-qrcode';

export default function PriceEstimator() {
  const [activeTab, setActiveTab] = useState('estimator'); // 'estimator' or 'calculator'
  const [query, setQuery] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [estimationQuery, setEstimationQuery] = useState('');
  const [estimateData, setEstimateData] = useState(null);
  const cameraRef = useRef(null);

  const generateMockEstimate = (queryStr) => {
    const lower = queryStr.toLowerCase().trim();
    
    // Profanity/Joke filter
    const badWords = ['balls', 'dick', 'ass', 'poop', 'shit', 'fuck', 'crap', 'junk', 'nothing', 'bitch', 'boob', 'testicle'];
    if (badWords.some(word => lower.includes(word) && !word.includes('ass') /* handle "glass" etc. properly if needed, but let's be careful. Actually 'ass' as a standalone word works if split, but includes will catch glass */ ) || lower.match(/\b(ass|balls|dick|poop|shit|fuck|crap|junk|cock)\b/i)) {
      return {
         price: '$0.00',
         reason: "We couldn't find any comps for this. Please enter a valid item for resale.",
         tags: ['No Data']
      };
    }
    
    // Some keyword based mocking
    let base = 15;
    if (lower.includes('vintage') || lower.includes('antique')) base += 45;
    if (lower.includes('camera')) base += 40;
    if (lower.includes('nintendo') || lower.includes('playstation') || lower.includes('xbox')) base += 60;
    if (lower.includes('gold') || lower.includes('silver') || lower.includes('jewelry')) base += 120;
    if (lower.includes('book') || lower.includes('dvd') || lower.includes('cd')) base -= 10;
    if (lower.includes('clothes') || lower.includes('shirt') || lower.includes('shoes')) base += 10;
    if (lower.includes('iphone') || lower.includes('macbook') || lower.includes('ipad') || lower.includes('apple')) base += 150;

    // Use string hash to add a pseudo-random variation based on the exact characters
    let hash = 0;
    for (let i = 0; i < lower.length; i++) {
       hash = ((hash << 5) - hash) + lower.charCodeAt(i);
       hash = hash & hash;
    }
    
    const variation = Math.abs(hash % 40);
    const lowEnd = Math.max(2, base + variation);
    const highEnd = lowEnd + Math.floor(lowEnd * 0.3) + 8;
    
    let reason = "Based on recent online marketplace data.";
    let tags = [];
    
    if (lowEnd > 80) {
       reason += " High demand category.";
       tags.push('High Demand');
    }
    if (lower.includes('vintage') || lower.includes('antique')) tags.push('Vintage');
    if (tags.length === 0) tags.push('Average Sales');
    
    return {
       price: `$${lowEnd} - $${highEnd}`,
       reason,
       tags
    };
  };

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);

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
      setEstimateData(generateMockEstimate(searchQuery));
      setHasResult(true);
    }, 1500);
  };

  const handleEstimate = (e) => {
    if (e) e.preventDefault();
    triggerEstimate(query);
  };

  const handleNativeEstimationCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // In a real production app with AI Vision, you would upload this blob 
    // to Google Cloud Vision or OpenAI Vision for parsing.
    // For MVP demonstration, we will fake the vision extraction:
    const mockItem = "Vintage Polaroid SX-70 Camera";
    setQuery(mockItem);
    triggerEstimate(mockItem);
    e.target.value = '';
  };

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
                  <input type="file" ref={cameraRef} accept="image/*" capture="environment" style={{display: 'none'}} onChange={handleNativeEstimationCapture} />
                  <button 
                    type="button" 
                    onClick={() => cameraRef.current.click()}
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
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: estimateData?.price === '$0.00' ? 'var(--text-secondary)' : 'var(--success-color)' }}>
                  {estimateData?.price}
                </span>
              </div>
              <h4 style={{ margin: 0 }}>{estimationQuery}</h4>
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                {estimateData?.reason}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
                {estimateData?.tags.map((tag, i) => (
                  <span key={i} style={{ padding: '0.25rem 0.5rem', background: tag === 'High Demand' ? 'rgba(16, 185, 129, 0.1)' : (tag === 'No Data' ? 'rgba(0,0,0,0.1)' : 'rgba(139, 92, 246, 0.1)'), color: tag === 'High Demand' ? 'var(--success-color)' : (tag === 'No Data' ? 'var(--text-secondary)' : 'var(--accent-color)'), borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                    {tag}
                  </span>
                ))}
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
