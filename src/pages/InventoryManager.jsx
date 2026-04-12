import React, { useState } from 'react';
import { Camera, Package, Plus, X, Maximize, ArrowUp, ArrowDown, Receipt } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { useAppContext } from '../context/AppContext';

export default function InventoryManager() {
  const { isPro, isTrialing, inventory, addInventoryItem, updateInventoryItem, budget, spent, revenue, fees, setBudget } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [soldPrice, setSoldPrice] = useState('');
  const [platformFees, setPlatformFees] = useState('');
  
  // OCR State
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  
  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cat, setCat] = useState('');
  const [imgUrls, setImgUrls] = useState([]);
  const [paymentMode, setPaymentMode] = useState('Cash');

  const exportCSV = () => {
    if (!isPro && !isTrialing) {
        alert('Trial Ended: Exporting inventory reports is a Premium feature. Upgrade to Pro in the top-right menu to unlock spreadsheet exports!');
        return;
    }
    const headers = ['Item Name', 'Purchased For', 'Status'];
  };

  // Example placeholders to simulate what the camera "sees"
  const mockCameraFeeds = [
    'https://images.unsplash.com/photo-1549646452-fddfa31ec2af?w=400&q=80', // vintage camera
    'https://images.unsplash.com/photo-1594957367852-aa006fc519bf?w=400&q=80', // clock
    'https://images.unsplash.com/photo-1582216654228-56920efec569?w=400&q=80' // typewriter
  ];
  
  const [currentFeed, setCurrentFeed] = useState(mockCameraFeeds[0]);

  const openCamera = () => {
    setCurrentFeed(mockCameraFeeds[Math.floor(Math.random() * mockCameraFeeds.length)]);
    setIsCameraActive(true);
  };

  const handleCapture = () => {
    setFlashActive(true);
    setTimeout(() => {
      setFlashActive(false);
      setImgUrls(prev => [...prev, currentFeed]);
      setCurrentFeed(mockCameraFeeds[Math.floor(Math.random() * mockCameraFeeds.length)]);
    }, 400); // Wait for flash
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !price) return;
    
    addInventoryItem({
      name,
      price: parseFloat(price) || 0,
      cat: cat || 'Misc',
      imageUrls: imgUrls,
      paymentMode
    });
    
    setName('');
    setPrice('');
    setCat('');
    setImgUrls([]);
    setPaymentMode('Cash');
    setIsAdding(false);
  };

  const handleSell = (e) => {
    e.preventDefault();
    updateInventoryItem(activeItem.id, {
      status: 'sold',
      soldPrice: parseFloat(soldPrice) || 0,
      platformFees: parseFloat(platformFees) || 0
    });
    setActiveItem(null);
    setSoldPrice('');
    setPlatformFees('');
  };

  const handleReceiptScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsScanningReceipt(true);
    setScanProgress(0);
    
    try {
        const { data: { text } } = await Tesseract.recognize(
            file,
            'eng',
            { logger: m => { if(m.status === 'recognizing text') setScanProgress(Math.round(m.progress * 100)); } }
        );
        
        const regex = /\$?\s*\d+\.\d{2}/g;
        const matches = text.match(regex);
        
        if (matches && matches.length > 0) {
            const values = matches.map(m => parseFloat(m.replace(/[^\d.]/g, '')));
            const maxVal = Math.max(...values);
            
            if (maxVal > 0) {
                setPrice(maxVal.toString());
                setName("Sourced Receipt Lot");
            }
        } else {
            alert("Oops! Couldn't automatically read a total value from that receipt. Please enter it manually.");
        }
    } catch (err) {
        console.error("OCR Error:", err);
        alert("Failed to process receipt image.");
    }
    
    setIsScanningReceipt(false);
    e.target.value = null; // reset input
  };

  // --- CAMERA VIEW ---
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
        </div>
        
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={currentFeed} alt="Camera Feed" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
          <div style={{ position: 'absolute', border: '2px solid rgba(255,255,255,0.4)', width: '80%', height: '50%', borderRadius: '16px' }}>
             <Maximize size={48} color="rgba(0,0,0,0.12)" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          </div>
        </div>

        <div style={{ height: '120px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div style={{ width: '60px' }}></div>
          <button onClick={handleCapture} style={{
            width: '70px', height: '70px', borderRadius: '50%', border: '4px solid #fff',
            background: 'rgba(0,0,0,0.12)', cursor: 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#fff' }} />
          </button>
          <button onClick={() => { setIsCameraActive(false); setIsAdding(true); }} className="text-secondary" style={{ width: '60px', background: 'none', border: 'none', outline: 'none' }}>
            Done {imgUrls.length > 0 ? `(${imgUrls.length})` : ''}
          </button>
        </div>

        <style>{`
          @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  // --- ADD FORM VIEW ---
  if (isAdding) {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease-out', paddingBottom: '1rem' }}>
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Log Find</h2>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>Save to your inventory</p>
          </div>
          <button className="btn" onClick={() => setIsAdding(false)} style={{ padding: '0.5rem', borderRadius: '50%' }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="card glass">
          
          <input type="file" id="receipt-upload" accept="image/*" capture="environment" style={{display: 'none'}} onChange={handleReceiptScan} />
          <button 
             type="button" 
             className="btn" 
             onClick={() => document.getElementById('receipt-upload').click()} 
             disabled={isScanningReceipt}
             style={{ 
                 width: '100%', marginBottom: '1.5rem', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)',
                 background: 'rgba(16, 185, 129, 0.05)', color: 'var(--success-color)', display: 'flex', justifyContent: 'center', gap: '0.5rem', fontWeight: 600, transition: 'all 0.2s'
             }}
          >
             <Receipt size={20} /> 
             {isScanningReceipt ? `Analyzing Receipt... (${scanProgress}%)` : 'Scan Receipt (Auto-Extract Total)'}
          </button>
          {imgUrls.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
              {imgUrls.map((url, idx) => (
                <div key={idx} style={{ flexShrink: 0, width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src={url} alt={`Captured ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Item Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Vintage Lamp" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus={imgUrls.length === 0} // only autofocus if we didn't just come from camera
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Purchase Price ($)</label>
            <input 
              type="number" 
              className="input-field" 
              placeholder="0.00" 
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Category (Optional)</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Decor, Electronics" 
              value={cat}
              onChange={(e) => setCat(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Payment Method</label>
            <select 
              className="input-field" 
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              style={{ appearance: 'auto', background: 'rgba(0,0,0,0.03)', color: 'var(--text-primary)' }}
            >
              <option value="Cash" style={{ color: 'var(--text-primary)' }}>Cash</option>
              <option value="Credit / Debit" style={{ color: 'var(--text-primary)' }}>Credit / Debit</option>
              <option value="Zelle" style={{ color: 'var(--text-primary)' }}>Zelle</option>
              <option value="Venmo" style={{ color: 'var(--text-primary)' }}>Venmo</option>
              <option value="CashApp" style={{ color: 'var(--text-primary)' }}>CashApp</option>
              <option value="PayPal" style={{ color: 'var(--text-primary)' }}>PayPal</option>
              <option value="Trade" style={{ color: 'var(--text-primary)' }}>Trade / Barter</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            <Plus size={18} /> Save Item
          </button>
        </form>
      </div>
    );
  }

  // --- SELL MODAL ---
  if (activeItem) {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease-out', paddingBottom: '1rem' }}>
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Mark as Sold</h2>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>{activeItem.name}</p>
          </div>
          <button className="btn" onClick={() => setActiveItem(null)} style={{ padding: '0.5rem', borderRadius: '50%' }}>
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSell} className="card glass">
          <div className="input-group">
            <label className="input-label">Final Gross Sold Price ($)</label>
            <input type="number" className="input-field" placeholder="0.00" value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} required autoFocus />
          </div>
          <div className="input-group">
            <label className="input-label">Platform Fees ($)</label>
            <input type="number" className="input-field" placeholder="e.g. 1.25" value={platformFees} onChange={(e) => setPlatformFees(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', background: 'var(--success-color)' }}>
            Confirm Sale
          </button>
        </form>
      </div>
    );
  }

  // --- MAIN INVENTORY GRID ---
  return (
    <div>
      <div className="card glass" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <p className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.25rem 0' }}>
            Liquid Capital (Budget + Post-Sale Profile)
          </p>
          <h2 style={{ fontSize: '2.5rem', margin: 0, color: 'var(--success-color)' }}>
            ${(budget - spent + revenue - fees).toFixed(2)}
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.03)', padding: '0.75rem', borderRadius: '12px', textAlign: 'center' }}>
            <ArrowUp size={16} className="text-secondary" style={{ marginBottom: '0.25rem' }} />
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1rem', fontWeight: 600 }}>
              $
              <input 
                type="number" 
                value={budget} 
                onChange={(e) => setBudget(Number(e.target.value))}
                style={{ width: '50px', background: 'transparent', border: 'none', borderBottom: '1px dashed var(--text-secondary)', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600, textAlign: 'center', outline: 'none' }}
              />
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Total</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.03)', padding: '0.75rem', borderRadius: '12px', textAlign: 'center' }}>
            <ArrowDown size={16} className="text-danger" style={{ marginBottom: '0.25rem' }} />
            <div style={{ fontSize: '1rem', fontWeight: 600 }}>${spent}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Spent</div>
          </div>
        </div>
      </div>

      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Inventory Hub</h2>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Your active hauls ({inventory.length})</p>
        </div>
        <button className="btn btn-primary" onClick={openCamera} style={{ padding: '0.5rem', borderRadius: '50%', boxShadow: '0 4px 14px var(--accent-glow)' }}>
          <Camera size={24} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div 
          className="card glass" 
          style={{
            padding: 0, overflow: 'hidden', aspectRatio: '1', display: 'flex', flexDirection: 'column', margin: 0, 
            borderStyle: 'dashed', cursor: 'pointer', borderColor: 'var(--text-secondary)'
          }}
          onClick={() => { setImgUrls([]); setIsAdding(true); }}
        >
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={32} className="text-secondary" />
          </div>
          <div style={{ padding: '0.75rem', background: 'var(--bg-card)', textAlign: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Add Manual</h4>
          </div>
        </div>

        {inventory.map((item) => (
          <div key={item.id} className="card glass" onClick={() => item.status !== 'sold' && setActiveItem(item)} style={{
            padding: 0, overflow: 'hidden', aspectRatio: '1', display: 'flex', flexDirection: 'column', margin: 0, position: 'relative',
            cursor: item.status === 'sold' ? 'default' : 'pointer'
          }}>
            {item.status === 'sold' && (
              <div style={{ position: 'absolute', top: 8, right: 8, background: '#22c55e', color: 'var(--text-inverse)', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', zIndex: 10, fontWeight: 'bold' }}>
                SOLD
              </div>
            )}
            {(item.imageUrls && item.imageUrls.length > 0) ? (
              <div style={{ flex: 1, backgroundImage: `url(${item.imageUrls[0]})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: item.status === 'sold' ? 0.3 : 1 }} />
            ) : item.imageUrl ? (
              <div style={{ flex: 1, backgroundImage: `url(${item.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: item.status === 'sold' ? 0.3 : 1 }} />
            ) : (
              <div style={{ flex: 1, background: item.bg || 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: item.status === 'sold' ? 0.2 : 0.8 }}>
                <Package size={32} color="rgba(255,255,255,0.7)" />
              </div>
            )}
            <div style={{ padding: '0.75rem', background: 'var(--bg-card)' }}>
              <h4 style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: item.status === 'sold' ? 'var(--text-secondary)' : '#fff' }}>
                {item.name}
              </h4>
              <div className="flex-between">
                <span className="text-accent" style={{ fontSize: '0.75rem', fontWeight: 600 }}>${item.price.toFixed(2)}</span>
                {item.status === 'sold' && <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 600 }}>+${(item.soldPrice - item.platformFees - item.price).toFixed(2)}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
