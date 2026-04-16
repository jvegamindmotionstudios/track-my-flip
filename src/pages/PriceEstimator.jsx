import React, { useState, useRef } from 'react';
import { Search, Sparkles, Camera, Maximize, ExternalLink, Image as ImageIcon, Loader2 } from 'lucide-react';
import ProfitCalculator from './ProfitCalculator';
import { supabase } from '../config/supabaseClient';

export default function PriceEstimator() {
  const [activeTab, setActiveTab] = useState('estimator'); // 'estimator' or 'calculator'
  const [query, setQuery] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [estimationQuery, setEstimationQuery] = useState('');
  const [estimateData, setEstimateData] = useState(null);
  const cameraRef = useRef(null);

  const triggerEstimate = async (searchQuery = query) => {
    if (!searchQuery) return;
    setIsEstimating(true);
    setHasResult(false);
    setEstimationQuery(searchQuery);
    
    try {
      const { data, error } = await supabase.functions.invoke('ebay-comps', {
        body: { query: searchQuery }
      });
      
      if (error) throw new Error("Edge function invocation failed.");
      if (data.error) throw new Error(data.error);
      
      setEstimateData(data);
    } catch (err) {
      console.log("Live API fetch failed:", err.message);
      setEstimateData({
         price: 'Search Failed',
         reason: "We couldn't connect to eBay. Make sure you have network access.",
         tags: ['Offline'],
         items: []
      });
    }

    setIsEstimating(false);
    setHasResult(true);
  };

  const handleEstimate = (e) => {
    if (e) e.preventDefault();
    triggerEstimate(query);
  };

  const handleNativeEstimationCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsEstimating(true);
    setHasResult(false);
    setEstimationQuery('Visual Item Photo');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Compress image down to eBay-friendly max width
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Output compressed JPEG base64
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

        try {
          const { data, error } = await supabase.functions.invoke('ebay-comps', {
            body: { imageBase64: compressedBase64 }
          });
          
          if (error) throw new Error("Edge function invocation failed.");
          if (data.error) throw new Error(data.error);
          
          setEstimateData(data);
        } catch (err) {
          console.log("Image search failed:", err.message);
          setEstimateData({
             price: 'No Visual Match',
             reason: "eBay visual search couldn't confidently identify this item. Try snapping it from a different angle or typing the brand.",
             tags: ['Try Text Search'],
             items: []
          });
        }
        setIsEstimating(false);
        setHasResult(true);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--bg-card)', padding: '0.25rem', borderRadius: '12px' }}>
         <button onClick={() => setActiveTab('estimator')} style={{ flex: 1, padding: '0.5rem', border: 'none', background: activeTab === 'estimator' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'estimator' ? '#fff' : 'var(--text-secondary)', borderRadius: '8px', fontWeight: 600 }}>🔍 Visual Comps</button>
         <button onClick={() => setActiveTab('calculator')} style={{ flex: 1, padding: '0.5rem', border: 'none', background: activeTab === 'calculator' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'calculator' ? '#fff' : 'var(--text-secondary)', borderRadius: '8px', fontWeight: 600 }}>🧮 Profit Calc</button>
      </div>

      {activeTab === 'estimator' ? (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.25rem', fontSize: '1.75rem' }}>
              Comp It <Sparkles size={24} className="text-accent" />
            </h1>
            <p className="text-secondary" style={{ margin: 0, fontSize: '0.9rem' }}>Instant live market valuations</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Massive Visual Search Lead Action */}
            <div 
              onClick={(e) => {
                if (isEstimating) e.preventDefault();
                else cameraRef.current.click();
              }}
              style={{
                background: 'linear-gradient(135deg, var(--accent-color) 0%, #a78bfa 100%)',
                borderRadius: '16px',
                padding: '2rem 1.5rem',
                color: '#fff',
                textAlign: 'center',
                cursor: isEstimating ? 'wait' : 'pointer',
                boxShadow: '0 8px 30px var(--accent-glow)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                ...(isEstimating ? { opacity: 0.8, transform: 'scale(0.98)' } : {})
              }}
            >
              <input type="file" ref={cameraRef} accept="image/*" capture="environment" style={{display: 'none'}} onChange={handleNativeEstimationCapture} disabled={isEstimating} />
              
              {isEstimating && estimationQuery === 'Visual Item Photo' ? (
                <>
                  <Loader2 size={48} style={{ animation: 'spin 1s linear infinite' }} />
                  <div>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: 700 }}>Processing Image...</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>Matching pixels against live eBay listings</p>
                  </div>
                </>
              ) : (
                <>
                  <Camera size={48} />
                  <div>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: 700 }}>Tap to Identify</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>Snap a photo to automatically pull back value</p>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
               <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
               <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>or manually type</span>
               <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
            </div>

            {/* Clean Text Fallback */}
            <div className="card glass" style={{ margin: 0, padding: '1rem', border: '1px solid var(--border-color)' }}>
              <form onSubmit={handleEstimate}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--accent-color)' }} />
                  <input
                    type="text"
                    className="input-field"
                    style={{ paddingLeft: '2.75rem', paddingRight: '6rem', width: '100%', height: '54px', fontSize: '1.1rem', background: 'var(--bg-primary)', border: '1px solid transparent', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                    placeholder="e.g. Sony Walkman"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={isEstimating}
                  />
                  <button 
                    type="submit" 
                    disabled={isEstimating || !query}
                    style={{ position: 'absolute', right: '0.5rem', background: query ? 'var(--accent-color)' : 'var(--bg-color)', border: 'none', color: query ? '#fff' : 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', opacity: isEstimating ? 0.7 : 1 }}
                  >
                    {isEstimating && estimationQuery !== 'Visual Item Photo' ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Comp'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {!isEstimating && hasResult && (
            <div className="card" style={{ marginTop: '2rem', animation: 'fadeIn 0.4s ease-out', borderTop: '4px solid var(--accent-color)', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
              
              <div style={{ paddingBottom: '1rem', borderBottom: '1px dashed var(--border-color)', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px' }}>Query Context</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {estimationQuery === 'Visual Item Photo' ? <ImageIcon size={16} className="text-accent" /> : <Search size={16} className="text-secondary" />}
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{estimationQuery}</span>
                </div>
              </div>

              <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Market Value</h3>
                  <span style={{ fontSize: estimateData?.price === 'No Comps Found' || estimateData?.price === 'No Visual Match' ? '1.25rem' : '2.25rem', fontWeight: 800, color: estimateData?.price === 'No Comps Found' || estimateData?.price === 'No Visual Match' ? 'var(--danger-color)' : 'var(--success-color)', letterSpacing: '-0.5px' }}>
                    {estimateData?.price}
                  </span>
                </div>
              </div>
              
              <p style={{ fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.25rem 0', color: 'var(--text-secondary)' }}>
                {estimateData?.reason}
              </p>
              
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                {estimateData?.tags.map((tag, i) => (
                  <span key={i} style={{ padding: '0.35rem 0.6rem', background: tag === 'High Demand' ? 'rgba(16, 185, 129, 0.1)' : ((tag === 'No Data' || tag === 'Try Refining Search' || tag === 'Try Text Search') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(139, 92, 246, 0.1)'), color: tag === 'High Demand' ? '#10b981' : ((tag === 'No Data' || tag === 'Try Refining Search' || tag === 'Try Text Search') ? '#ef4444' : 'var(--accent-color)'), borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${tag === 'High Demand' ? 'rgba(16, 185, 129, 0.2)' : ((tag === 'No Data' || tag === 'Try Refining Search') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.2)')}` }}>
                    {tag}
                  </span>
                ))}
              </div>
              
              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <p className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 0.75rem 0' }}>Manual Verifications</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <a 
                    href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(estimationQuery === 'Visual Item Photo' ? '' : estimationQuery)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn" 
                    style={{ justifyContent: 'space-between', background: 'rgba(0, 100, 210, 0.08)', borderColor: 'rgba(0, 100, 210, 0.2)', color: '#0064d2', fontSize: '0.9rem', padding: '0.75rem 1rem' }}
                  >
                    Open Live eBay Search <ExternalLink size={16} />
                  </a>
                  <a 
                    href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(estimationQuery === 'Visual Item Photo' ? '' : estimationQuery)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn" 
                    style={{ justifyContent: 'space-between', background: 'rgba(52, 168, 83, 0.08)', borderColor: 'rgba(52, 168, 83, 0.2)', color: '#0f9d58', fontSize: '0.9rem', padding: '0.75rem 1rem' }}
                  >
                    Check Google Shopping <ExternalLink size={16} />
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
