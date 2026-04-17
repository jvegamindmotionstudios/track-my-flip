import React, { useState, useRef } from 'react';
import { Camera, Package, Plus, X, Maximize, ArrowUp, ArrowDown, Receipt, RotateCcw } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { useAppContext } from '../context/AppContext';

export default function InventoryManager() {
  const { isPro, isTrialing, inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, stops, budget, setBudget, spent, revenue, fees, resetDay } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [soldPrice, setSoldPrice] = useState('');
  const [platformFees, setPlatformFees] = useState('');
  
  // OCR State
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  
  // Refs for reliable file input triggering
  const gridCameraRef = useRef(null);
  const formCameraRef = useRef(null);
  const receiptRef = useRef(null);
  
  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cat, setCat] = useState('');
  const [imgUrls, setImgUrls] = useState([]);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [sourcedStop, setSourcedStop] = useState('');

  const exportCSV = () => {
    if (!isPro && !isTrialing) {
        alert('Trial Ended: Exporting inventory reports is a Premium feature. Upgrade to Pro in the top-right menu to unlock spreadsheet exports!');
        return;
    }
    if (inventory.length === 0) return alert("No inventory items to export.");

    const worksheet = XLSX.utils.json_to_sheet(inventory.map(item => {
        let stopLocation = 'Manual Entry';
        let cleanName = item.name;
        
        // Extract the bracketed Stop Name if it exists
        const match = item.name.match(/^\[(.*?)\]\s*(.*)$/);
        if (match) {
            stopLocation = match[1];
            cleanName = match[2];
        }

        return {
           "Purchased At": stopLocation,
           "Item Name": cleanName,
           "Purchase Price ($)": Number(item.price).toFixed(2),
           "Category": item.cat || 'Misc',
           "Payment Method": item.paymentMode || 'Cash',
           "Status": item.status.toUpperCase(),
           "Sold Price ($)": item.soldPrice ? Number(item.soldPrice).toFixed(2) : '',
           "Platform Fees ($)": item.platformFees ? Number(item.platformFees).toFixed(2) : '',
           "Net Profit ($)": (item.soldPrice) ? (Number(item.soldPrice) - Number(item.price) - Number(item.platformFees || 0)).toFixed(2) : ''
        };
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Haul Report");
    XLSX.writeFile(workbook, "TrackMyFlip_Inventory_Log.xlsx");
  };

  const handleNativeCamera = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
          setImgUrls(prev => [...prev, event.target.result]);
          setIsAdding(true);
      };
      reader.readAsDataURL(file);
      
      // Reset input so they can take another
      e.target.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !price) return;
    
    // Embed the Source Location cleanly into the database string
    const finalName = sourcedStop ? `[${sourcedStop}] ${name}` : name;

    addInventoryItem({
      name: finalName,
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
    setSourcedStop('');
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
    e.target.value = ''; // reset input
  };



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
          
          <input type="file" ref={formCameraRef} accept="image/*" capture="environment" style={{display: 'none'}} onChange={handleNativeCamera} />
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <button 
                 type="button" 
                 className="btn" 
                 onClick={() => formCameraRef.current.click()} 
                 style={{ 
                     flex: 1, padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)',
                     background: 'rgba(59, 130, 246, 0.05)', color: '#3b82f6', display: 'flex', justifyContent: 'center', gap: '0.5rem', fontWeight: 600, transition: 'all 0.2s'
                 }}
              >
                 <Camera size={20} /> native snap
              </button>

              <input type="file" ref={receiptRef} accept="image/*" capture="environment" style={{display: 'none'}} onChange={handleReceiptScan} />
              <button 
                 type="button" 
                 className="btn" 
                 onClick={() => receiptRef.current.click()} 
                 disabled={isScanningReceipt}
                 style={{ 
                     flex: 1, padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)',
                     background: 'rgba(16, 185, 129, 0.05)', color: 'var(--success-color)', display: 'flex', justifyContent: 'center', gap: '0.5rem', fontWeight: 600, transition: 'all 0.2s'
                 }}
              >
                 <Receipt size={20} /> 
                 {isScanningReceipt ? 'Scanning...' : 'OCR Receipt'}
              </button>
          </div>
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

          <div className="input-group">
            <label className="input-label">Sourced Location (Optional)</label>
            <select 
              className="input-field" 
              value={sourcedStop}
              onChange={(e) => setSourcedStop(e.target.value)}
              style={{ appearance: 'auto', background: 'rgba(0,0,0,0.03)', color: 'var(--text-primary)' }}
            >
              <option value="" style={{ color: 'var(--text-primary)' }}>Select a planned stop...</option>
              {stops && stops.filter(s => s.address).map(stop => (
                 <option key={stop.id} value={stop.address} style={{ color: 'var(--text-primary)' }}>{stop.address}</option>
              ))}
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
          
          <button 
             type="button" 
             onClick={() => { deleteInventoryItem(activeItem.id); setActiveItem(null); }} 
             className="btn"
             style={{ width: '100%', marginTop: '0.75rem', background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: '12px', fontWeight: 'bold' }}
          >
            Delete Item Record
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
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn" onClick={resetDay} style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', borderRadius: '50%' }} title="Start Fresh Day">
              <RotateCcw size={22} />
            </button>
            <input type="file" ref={gridCameraRef} accept="image/*" capture="environment" style={{display: 'none'}} onChange={handleNativeCamera} />
            <button className="btn btn-primary" onClick={() => gridCameraRef.current.click()} style={{ padding: '0.5rem', borderRadius: '50%', boxShadow: '0 4px 14px var(--accent-glow)' }}>
              <Camera size={22} />
            </button>
        </div>
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
