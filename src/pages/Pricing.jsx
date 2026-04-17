import React, { useState } from 'react';
import { Check, Zap, Map, Camera, Box, DollarSign, Star } from 'lucide-react';

const Pricing = ({ onClose, onSubscribeClick }) => {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const freeFeatures = [
    { text: 'Sync across devices', icon: <Box size={16} /> },
    { text: 'Up to 15 Active Inventory Items', icon: <Box size={16} /> },
    { text: '3 Tracked Drives per Day', icon: <Box size={16} /> },
    { text: 'Basic Route Stops', icon: <Map size={16} /> },
  ];

  const proFeatures = [
    { text: 'Unlimited Inventory Items', icon: <Box size={16} color="#3f9b0b" /> },
    { text: 'Unlimited Tracked Drives for Tax Logging', icon: <DollarSign size={16} color="#3f9b0b" /> },
    { text: 'AI Camera Price Estimator', icon: <Camera size={16} color="#3f9b0b" /> },
    { text: 'Advanced Route Optimizer', icon: <Map size={16} color="#3f9b0b" /> },
    { text: 'Premium Support & Export', icon: <Star size={16} color="#f59e0b" /> },
  ];

  return (
    <div style={{ padding: '0 1rem 3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'fadeIn 0.3s ease-out' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '2rem', maxWidth: '600px' }}>
        <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', background: 'rgba(63, 155, 11, 0.1)', marginBottom: '1rem' }}>
          <Zap size={32} color="#3f9b0b" />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 1rem 0', letterSpacing: '-0.5px' }}>
          Upgrade to <span style={{ color: '#0f3a8b' }}>Pro</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.5', margin: 0 }}>
          Take your reselling business to the next level. Remove limits, automate your routing, and leverage AI to estimate values in the field instantly.
        </p>
      </div>

      {/* Billing Toggle */}
      <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', borderRadius: '24px', padding: '4px', marginBottom: '2rem' }}>
        <button 
          onClick={() => setBillingCycle('monthly')}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '20px',
            border: 'none',
            background: billingCycle === 'monthly' ? '#fff' : 'transparent',
            color: billingCycle === 'monthly' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: billingCycle === 'monthly' ? 700 : 500,
            boxShadow: billingCycle === 'monthly' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '0.9rem'
          }}
        >
          Monthly
        </button>
        <button 
          onClick={() => setBillingCycle('yearly')}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '20px',
            border: 'none',
            background: billingCycle === 'yearly' ? '#fff' : 'transparent',
            color: billingCycle === 'yearly' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: billingCycle === 'yearly' ? 700 : 500,
            boxShadow: billingCycle === 'yearly' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          Yearly <span style={{ fontSize: '0.65rem', background: '#3f9b0b', color: '#fff', padding: '2px 6px', borderRadius: '8px', fontWeight: 'bold' }}>SAVE 34%</span>
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '800px' }}>
        
        {/* Free Tier Card */}
        <div className="card glass" style={{ flex: '1', minWidth: '300px', display: 'flex', flexDirection: 'column', padding: '2rem', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>Basic</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>$0</div>
          <p style={{ margin: '0 0 2rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Hobbyists getting started</p>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {freeFeatures.map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <div style={{ opacity: 0.5 }}>{f.icon}</div>
                {f.text}
              </li>
            ))}
          </ul>
          
          <button onClick={onClose} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.03)', color: 'var(--text-primary)', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
            Current Plan
          </button>
        </div>

        {/* Pro Tier Card */}
        <div className="card glass" style={{ flex: '1', minWidth: '300px', display: 'flex', flexDirection: 'column', padding: '2rem', border: '2px solid #0f3a8b', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '1rem', right: '-2rem', background: '#3f9b0b', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', padding: '0.25rem 2.5rem', transform: 'rotate(45deg)' }}>
            POPULAR
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f3a8b' }}>Pro Flipper</h3>
          
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '0.5rem' }}>
             <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
               {billingCycle === 'monthly' ? '$8.99' : '$59.99'}
             </span>
             <span style={{ color: 'var(--text-secondary)', marginLeft: '0.25rem', fontWeight: 500 }}>
               /{billingCycle === 'monthly' ? 'mo' : 'yr'}
             </span>
          </div>
          <p style={{ margin: '0 0 2rem 0', fontSize: '0.85rem', color: '#3f9b0b', fontWeight: 600 }}>
             {billingCycle === 'yearly' ? 'Billed annually ($4.99/mo equivalent)' : 'Billed monthly, cancel anytime'}
          </p>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {proFeatures.map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                <div style={{ background: 'rgba(63, 155, 11, 0.1)', padding: '0.25rem', borderRadius: '50%', display: 'flex' }}>
                   {f.icon}
                </div>
                {f.text}
              </li>
            ))}
          </ul>
          
          <button 
            onClick={() => onSubscribeClick(billingCycle)} 
            style={{ 
              width: '100%', 
              padding: '1rem', 
              borderRadius: '12px', 
              border: 'none', 
              background: 'linear-gradient(135deg, #0f3a8b, #0a2558)', 
              color: '#fff', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              boxShadow: '0 4px 12px rgba(15, 58, 139, 0.25)', 
              transition: 'all 0.2s',
              fontSize: '1rem'
            }}
          >
            Upgrade to Pro
          </button>
        </div>

      </div>

      {/* App Store Mandated Legal Disclaimer */}
      <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)', maxWidth: '800px', width: '100%', fontSize: '0.65rem', color: 'var(--text-secondary)', lineHeight: '1.5', textAlign: 'justify' }}>
         <p style={{ margin: '0 0 0.5rem 0' }}><strong>Subscription Terms:</strong></p>
         <p style={{ margin: 0 }}>
           Payment will be charged to your Apple ID account at the confirmation of purchase. Subscription automatically renews unless it is canceled at least 24 hours before the end of the current period. Your account will be charged {billingCycle === 'monthly' ? '$8.99' : '$59.99'} for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your account settings on the App Store after purchase. Any unused portion of a free trial period, if offered, will be forfeited when you purchase a subscription.
         </p>
         <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem' }}>
             <a href="/terms.html" target="_blank" style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>Terms of Service</a>
             <a href="/privacy.html" target="_blank" style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>Privacy Policy</a>
         </div>
      </div>
    </div>
  );
};

export default Pricing;
