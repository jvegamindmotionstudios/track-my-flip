import React, { useState, useEffect } from 'react';
import { Calculator, ShoppingBag, Truck, Percent, DollarSign, RefreshCw, Store } from 'lucide-react';

export default function ProfitCalculator() {
  const [platform, setPlatform] = useState('ebay');
  
  // Inputs
  const [itemCost, setItemCost] = useState('');
  const [soldPrice, setSoldPrice] = useState('');
  const [shippingCharge, setShippingCharge] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [promotedRate, setPromotedRate] = useState('');

  // Outputs
  const [results, setResults] = useState({
    platformFee: 0,
    promotedFee: 0,
    totalCosts: 0,
    netProfit: 0,
    roi: 0,
    margin: 0
  });

  const handleCalculate = () => {
    const cost = parseFloat(itemCost) || 0;
    const sold = parseFloat(soldPrice) || 0;
    const shipCharge = parseFloat(shippingCharge) || 0;
    const trueShipCost = parseFloat(shippingCost) || 0;
    const promo = parseFloat(promotedRate) || 0;

    const totalRevenue = sold + shipCharge;
    
    let platFee = 0;
    let promFee = 0;

    if (totalRevenue > 0) {
      if (platform === 'ebay') {
        // Standard eBay fee: 13.25% of total revenue + $0.30 base (2026 standard)
        platFee = (totalRevenue * 0.1325) + 0.30;
        promFee = (totalRevenue * (promo / 100));
      } else if (platform === 'poshmark') {
        // Poshmark takes $2.95 for sales under $15, or 20% over $15
        platFee = sold > 15 ? (sold * 0.20) : 2.95; 
      } else if (platform === 'mercari') {
        // Mercari 2026 update: 10% flat selling fee
        platFee = totalRevenue * 0.10;
      } else if (platform === 'depop') {
        // Depop US 2026 update: 0% selling fee, but 3.3% + $0.45 processing fee
        platFee = (totalRevenue * 0.033) + 0.45;
      } else if (platform === 'facebook') {
        // FB Marketplace: 5% or $0.40 minimum
        const calcFee = totalRevenue * 0.05;
        platFee = calcFee < 0.40 ? 0.40 : calcFee;
      } else if (platform === 'local') {
        // Local Cash Sale: No fees
        platFee = 0;
      }
    }

    const totalFee = platFee + promFee;
    const totalDeductions = cost + trueShipCost + totalFee;
    const net = totalRevenue - totalDeductions;
    
    const exactROI = cost > 0 ? (net / cost) * 100 : (net > 0 ? 100 : 0);
    const exactMargin = totalRevenue > 0 ? (net / totalRevenue) * 100 : 0;

    setResults({
      platformFee: platFee,
      promotedFee: promFee,
      totalCosts: totalDeductions,
      netProfit: net,
      roi: exactROI,
      margin: exactMargin
    });
  };

  useEffect(() => {
    handleCalculate();
  }, [platform, itemCost, soldPrice, shippingCharge, shippingCost, promotedRate]);

  const resetCalc = () => {
    setItemCost('');
    setSoldPrice('');
    setShippingCharge('');
    setShippingCost('');
    setPromotedRate('');
  };

  const platformNames = {
    'ebay': 'eBay (13.25% + $0.30)',
    'poshmark': 'Poshmark (20% or $2.95 min)',
    'mercari': 'Mercari (10% Flat)',
    'depop': 'Depop US (3.3% + $0.45)',
    'facebook': 'FB Marketplace (5%)',
    'local': 'Local Cash (0%)'
  };

  return (
    <div style={{ paddingBottom: '2rem', animation: 'fadeIn 0.3s ease-out' }}>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            Profit Calc <Calculator size={24} className="text-accent" />
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Multi-portal profit analysis</p>
        </div>
        <button className="btn" onClick={resetCalc} style={{ background: 'rgba(0,0,0,0.06)', padding: '0.5rem', border: 'none', borderRadius: '50%' }}>
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="card glass" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
          <Store size={16} className="text-accent"/> Select Marketplace
        </label>
        <select 
          className="input-field" 
          value={platform} 
          onChange={(e) => {
            setPlatform(e.target.value);
            if (e.target.value !== 'ebay') setPromotedRate('');
          }}
          style={{ width: '100%', appearance: 'none', background: 'var(--bg-primary)', fontWeight: 600, fontSize: '1rem', border: '1px solid var(--border-color)' }}
        >
          <option value="ebay">eBay</option>
          <option value="poshmark">Poshmark</option>
          <option value="mercari">Mercari</option>
          <option value="depop">Depop (US)</option>
          <option value="facebook">Facebook Marketplace</option>
          <option value="local">Local Cash / Meetup</option>
        </select>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.5rem' }}>
          Current Rule: {platformNames[platform]}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
        {/* Revenue Section */}
        <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
             Revenue Inputs
          </h4>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label"><ShoppingBag size={14}/> Sold Price</label>
              <input type="number" placeholder="0.00" value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} className="input-field" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label"><Truck size={14}/> Charged Ship</label>
              <input type="number" placeholder="0.00" value={shippingCharge} onChange={(e) => setShippingCharge(e.target.value)} className="input-field" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }} />
            </div>
          </div>
        </div>

        {/* Cost Section */}
        <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
             Cost Inputs
          </h4>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label"><DollarSign size={14}/> Item Cost</label>
              <input type="number" placeholder="0.00" value={itemCost} onChange={(e) => setItemCost(e.target.value)} className="input-field" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label"><Truck size={14}/> True Ship Cost</label>
              <input type="number" placeholder="0.00" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} className="input-field" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }} />
            </div>
          </div>
        </div>

        {platform === 'ebay' && (
          <div className="input-group" style={{ animation: 'fadeIn 0.2s ease-out' }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Percent size={14}/> Promoted Ad Rate %</label>
            <input type="number" placeholder="0.0" value={promotedRate} onChange={(e) => setPromotedRate(e.target.value)} className="input-field" />
          </div>
        )}
      </div>

      {/* Output Results - Receipt Style */}
      <h3 style={{ margin: '0 0 1rem 0' }}>Financial Breakdown</h3>
      <div className="card" style={{ padding: '1.5rem', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontWeight: 600 }}>
          <span>Total Revenue</span>
          <span>${((parseFloat(soldPrice) || 0) + (parseFloat(shippingCharge) || 0)).toFixed(2)}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#ef4444', fontSize: '0.9rem' }}>
          <span>Item Cost (COGS)</span>
          <span>-${(parseFloat(itemCost) || 0).toFixed(2)}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#ef4444', fontSize: '0.9rem' }}>
          <span>True Shipping Cost</span>
          <span>-${(parseFloat(shippingCost) || 0).toFixed(2)}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#ef4444', fontSize: '0.9rem' }}>
          <span>Marketplace Fees</span>
          <span>-${results.platformFee.toFixed(2)}</span>
        </div>
        
        {platform === 'ebay' && results.promotedFee > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#ef4444', fontSize: '0.9rem' }}>
            <span>Promoted Ad Fee</span>
            <span>-${results.promotedFee.toFixed(2)}</span>
          </div>
        )}
        
        <div style={{ padding: '1.25rem 0', margin: '1rem 0', borderTop: '2px dashed var(--border-color)', borderBottom: '2px dashed var(--border-color)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Profit</span>
             <span style={{ fontSize: '1.75rem', fontWeight: 800, color: results.netProfit >= 0 ? '#10b981' : '#ef4444', transition: 'color 0.2s' }}>
                ${results.netProfit.toFixed(2)}
             </span>
           </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
           <div style={{ flex: 1, background: results.roi >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '12px', textAlign: 'center', transition: 'all 0.2s' }}>
              <span style={{ display: 'block', fontSize: '0.8rem', color: results.roi >= 0 ? '#059669' : '#dc2626', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>ROI</span>
              <span style={{ fontWeight: 800, fontSize: '1.2rem', color: results.roi >= 0 ? '#10b981' : '#ef4444' }}>{results.roi.toFixed(1)}%</span>
           </div>
           <div style={{ flex: 1, background: results.margin >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '12px', textAlign: 'center', transition: 'all 0.2s' }}>
              <span style={{ display: 'block', fontSize: '0.8rem', color: results.margin >= 0 ? '#059669' : '#dc2626', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>Margin</span>
              <span style={{ fontWeight: 800, fontSize: '1.2rem', color: results.margin >= 0 ? '#10b981' : '#ef4444' }}>{results.margin.toFixed(1)}%</span>
           </div>
        </div>

      </div>

    </div>
  );
}
