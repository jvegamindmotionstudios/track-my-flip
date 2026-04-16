import React, { useState } from 'react';
import { RotateCcw, Download, Share2, FileSpreadsheet, TrendingDown, Receipt, Car, Send, FileText } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function BudgetTracker() {
  const { budget: liveBudget, spent: liveSpent, revenue: liveRevenue, fees: liveFees, inventory: liveInventory, stops: liveStops, mileage: liveMileage, trackedDrives: liveTrackedDrives, startOdo: liveStartOdo, endOdo: liveEndOdo, resetDay, history, userProfile, setUserProfile } = useAppContext();
  
  const [selectedDate, setSelectedDate] = useState('live');
  const [showProfileConfig, setShowProfileConfig] = useState(false);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setUserProfile(prev => ({ ...prev, [name]: value }));
  };

  const isHistorical = selectedDate !== 'live';
  const historicalData = isHistorical ? history.find(h => h.id.toString() === selectedDate)?.backupData : null;

  const budget = isHistorical ? historicalData.budget : liveBudget;
  const spent = isHistorical ? historicalData.spent : liveSpent;
  const revenue = isHistorical ? historicalData.revenue : liveRevenue;
  const fees = isHistorical ? historicalData.fees : liveFees;
  const inventory = isHistorical ? historicalData.inventory : liveInventory;
  const stops = isHistorical ? historicalData.stops : liveStops;
  const rawMileage = isHistorical ? historicalData.mileage : liveMileage;
  const currentDrives = isHistorical ? (historicalData.trackedDrives || []) : liveTrackedDrives;
  const autoMileage = currentDrives.filter(d => d.purpose === 'business').reduce((sum, d) => sum + Number(d.distanceMiles), 0);
  const mileage = Number(rawMileage) + autoMileage;
  const startOdo = isHistorical ? historicalData.startOdo : liveStartOdo;
  const endOdo = isHistorical ? historicalData.endOdo : liveEndOdo;
  
  const exportDateStr = isHistorical 
    ? new Date(history.find(h => h.id.toString() === selectedDate).date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const outputExcel = async (wb, filename, action) => {
    if (action === 'share' && navigator.canShare) {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const file = new File([blob], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        if (navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'TrackMyFlip Report',
                    text: `Attached is your generated ${filename.replace('.xlsx', '')} report.`
                });
                return;
            } catch (error) {
                console.log('Share failed or was canceled', error);
                // Intentionally let it fall through to download if share API throws a fatal error, 
                // but usually user cancelling share throws an AbortError which we should ignore.
                if (error.name !== "AbortError") {
                    XLSX.writeFile(wb, filename);
                }
                return;
            }
        }
    }
    
    // Explicit download or fallback
    XLSX.writeFile(wb, filename);
  };

  const getHeaderEntity = () => {
     return userProfile?.companyName ? `${userProfile.companyName}\n${userProfile.address || ''}\n${userProfile.email || ''}` : 'Independent Provider';
  };

  const handleExportPnL = (action) => {
    let today = exportDateStr;
    const wb = XLSX.utils.book_new();
    const pnlData = [
      { 'Schedule C Accounting': 'ENTITY IDENTIFIER', 'Line Item': getHeaderEntity().replace(/\n/g, ', '), 'Amount': '' },
      { 'Schedule C Accounting': '', 'Line Item': '', 'Amount': '' },
      { 'Schedule C Accounting': 'Part I: Gross Revenue', 'Line Item': 'Asset Sales Receipts', 'Amount': revenue },
      { 'Schedule C Accounting': 'Part III: Cost of Goods Sold', 'Line Item': 'Inventory Purchases (COGS)', 'Amount': -spent },
      { 'Schedule C Accounting': 'GROSS PROFIT', 'Line Item': '(Revenue minus COGS)', 'Amount': revenue - spent },
      { 'Schedule C Accounting': '', 'Line Item': '', 'Amount': '' },
      { 'Schedule C Accounting': 'Part II: Operating Expenses', 'Line Item': 'Platform Fees & Shipping', 'Amount': -fees },
      { 'Schedule C Accounting': 'Part II: Operating Expenses', 'Line Item': 'Standard Mileage Deduction', 'Amount': -(mileage * 0.67) },
      { 'Schedule C Accounting': 'NET INCOME (LOSS)', 'Line Item': 'Realized Profit for Period', 'Amount': (revenue - spent - fees - (mileage * 0.67)) },
      { 'Schedule C Accounting': '', 'Line Item': '', 'Amount': '' },
      { 'Schedule C Accounting': 'Capital Account', 'Line Item': 'Working Capital Baseline', 'Amount': budget },
      { 'Schedule C Accounting': 'Capital Account', 'Line Item': 'Liquid Cash on Hand', 'Amount': budget - spent + revenue - fees }
    ];
    const ws = XLSX.utils.json_to_sheet(pnlData);
    ws['!cols'] = [{wch: 30}, {wch: 40}, {wch: 15}];
    XLSX.utils.book_append_sheet(wb, ws, 'GAAP Profit & Loss');
    outputExcel(wb, `GAAP_PnL_Report_${today}.xlsx`, action);
  };

  const handleExportPnLPDF = () => {
    let today = exportDateStr;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`GAAP Profit & Loss Statement`, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Entity: ${userProfile?.companyName || 'Independent Provider'}`, 14, 27);
    doc.text(`Date of Audit: ${today}`, 14, 32);
    
    doc.autoTable({
       startY: 40,
       head: [['Accounting Group', 'Line Item', 'Amount']],
       body: [
         ['Part I: Gross Revenue', 'Asset Sales Receipts', `$${revenue.toFixed(2)}`],
         ['Part III: Cost of Goods Sold', 'Inventory Purchases', `-$${spent.toFixed(2)}`],
         ['GROSS PROFIT', '(Revenue - COGS)', `$${(revenue - spent).toFixed(2)}`],
         ['', '', ''],
         ['Part II: Operating Expenses', 'Platform Fees & Shipping', `-$${fees.toFixed(2)}`],
         ['Part II: Operating Expenses', 'Standard Mileage Deduction', `-$${(mileage * 0.67).toFixed(2)}`],
         ['NET INCOME (LOSS)', 'Realized Return', `$${(revenue - spent - fees - (mileage * 0.67)).toFixed(2)}`],
       ]
    });
    doc.save(`GAAP_PnL_${today}.pdf`);
  };

  const handleExportExpenses = (action) => {
    let today = exportDateStr;
    const wb = XLSX.utils.book_new();
    const expenseData = inventory.map(item => ({
        'Date': today,
        'Tax Schedule': 'Schedule C (Part III)',
        'Payment Method': item.paymentMode || 'Cash',
        'Asset Category': item.cat || 'Misc Asset',
        'Ledger Description': item.name,
        'COGS Output ($)': item.price
    }));
    if (expenseData.length === 0) expenseData.push({ 'Date': today, 'Tax Schedule': '', 'Payment Method': '', 'Asset Category': '', 'Ledger Description': 'No Inventory Logged', 'COGS Output ($)': 0 });
    const ws = XLSX.utils.json_to_sheet(expenseData);
    ws['!cols'] = [{wch: 15}, {wch: 25}, {wch: 20}, {wch: 20}, {wch: 35}, {wch: 15}];
    XLSX.utils.book_append_sheet(wb, ws, 'COGS Ledger');
    outputExcel(wb, `COGS_Ledger_${today}.xlsx`, action);
  };

  const handleExportExpensesPDF = () => {
    let today = exportDateStr;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Schedule C (Part III) - Cost of Goods Sold`, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Entity: ${userProfile?.companyName || 'Independent Provider'} | Prepared: ${today}`, 14, 28);

    const expenseData = inventory.map(item => [
        today,
        item.paymentMode || 'Cash',
        item.cat || 'Misc',
        item.name,
        `$${item.price.toFixed(2)}`
    ]);

    doc.autoTable({
       startY: 35,
       head: [['Date', 'Payment', 'Asset Category', 'Ledger Description', 'COGS Output ($)']],
       body: expenseData.length > 0 ? expenseData : [['No COGS Logged for Period', '', '', '', '']]
    });
    doc.save(`COGS_Ledger_${today}.pdf`);
  };

  const handleExportRouteLog = (action) => {
    let today = exportDateStr;
    const wb = XLSX.utils.book_new();
    const routeData = stops.map((s, idx) => ({
        'Date': today,
        'Odo Start': startOdo ? startOdo : 'N/A',
        'Odo End': endOdo ? endOdo : 'N/A',
        'Time Logged': s.time,
        'Location Stop': s.address,
        'Business Purpose': 'Inventory Sourcing & Procurement',
    }));
    if (routeData.length === 0) routeData.push({ 'Date': today, 'Odo Start': '', 'Odo End': '', 'Time Logged': '', 'Location Stop': 'No Stops Logged', 'Business Purpose': '' });
    const ws = XLSX.utils.json_to_sheet(routeData);
    ws['!cols'] = [{wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 40}, {wch: 35}];
    XLSX.utils.book_append_sheet(wb, ws, 'IRS Mileage Log');
    outputExcel(wb, `IRS_Mileage_Log_${today}.xlsx`, action);
  };

  const handleExportRouteLogPDF = () => {
    let today = exportDateStr;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Contemporaneous IRS Mileage Log`, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Entity: ${userProfile?.companyName || 'Independent Provider'} | Prepared: ${today}`, 14, 28);
    doc.text(`Total Commute: ${startOdo && endOdo ? `${startOdo} -> ${endOdo}` : 'Standard Deduction Log'} (${mileage} Total Mi)`, 14, 34);

    const routeData = stops.map((s, idx) => [
        today,
        s.time,
        s.address || 'N/A',
        'Inventory Sourcing & Procurement'
    ]);

    doc.autoTable({
       startY: 42,
       head: [['Date', 'Time Logged', 'Stop Location Address', 'IRS Business Purpose']],
       body: routeData.length > 0 ? routeData : [['No Stops Logged', '', '', '']]
    });
    doc.save(`IRS_Mileage_Log_${today}.pdf`);
  };

  const handleExportMaster = (action) => {
    let today = exportDateStr;
    const wb = XLSX.utils.book_new();

    // SHEET 1: Executive Summary & KPIs
    const execData = [
      { 'Metric Category': 'Audit Entity Header', 'Metric Details': 'Filing Entity Name', 'Recorded Value': userProfile?.companyName || 'Unregistered Provider' },
      { 'Metric Category': '', 'Metric Details': 'Filing Office Address', 'Recorded Value': userProfile?.address || 'N/A' },
      { 'Metric Category': '', 'Metric Details': 'Entity Contact', 'Recorded Value': userProfile?.email || 'N/A' },
      { 'Metric Category': '', 'Metric Details': 'Date of Audit', 'Recorded Value': today },
      { 'Metric Category': '', 'Metric Details': '', 'Recorded Value': null },
      { 'Metric Category': 'Part I: Revenue', 'Metric Details': 'Gross Final Revenue', 'Recorded Value': `+$${revenue.toFixed(2)}` },
      { 'Metric Category': 'Part III: COGS', 'Metric Details': 'Total Cost of Goods Sold', 'Recorded Value': `-$${spent.toFixed(2)}` },
      { 'Metric Category': 'GROSS PROFIT', 'Metric Details': '(Revenue - COGS)', 'Recorded Value': `$${(revenue - spent).toFixed(2)}` },
      { 'Metric Category': '', 'Metric Details': '', 'Recorded Value': null },
      { 'Metric Category': 'Part II: OpEx', 'Metric Details': 'Platform Fees / Overheads', 'Recorded Value': `-$${fees.toFixed(2)}` },
      { 'Metric Category': 'Part II: OpEx', 'Metric Details': 'IRS Standard Mileage (67c/mi)', 'Recorded Value': `-$${(mileage * 0.67).toFixed(2)}` },
      { 'Metric Category': 'NET INCOME', 'Metric Details': 'Realized Net Profit / Deficit', 'Recorded Value': `${(revenue - spent - fees - (mileage * 0.67)) >= 0 ? '+' : '-'}$${Math.abs(revenue - spent - fees - (mileage * 0.67)).toFixed(2)}` },
    ];
    const wsExec = XLSX.utils.json_to_sheet(execData);
    wsExec['!cols'] = [{wch: 30}, {wch: 35}, {wch: 25}];

    // SHEET 2: Master Inventory (COGS) Ledger
    const invData = inventory.map((item, idx) => ({
      'Log ID': `INV-${today.replace(/-/g, '')}-${String(idx+1).padStart(3, '0')}`,
      'Date of Acquisition': today,
      'Payment Method': item.paymentMode || 'Cash',
      'Asset Category': item.cat || 'Misc / Uncategorized',
      'Asset Description': item.name,
      'Accounting Group': 'Cost of Goods Sold',
      'Purchase Amount ($)': item.price
    }));
    if (invData.length === 0) invData.push({ 'Log ID': '', 'Date of Acquisition': '', 'Payment Method': '', 'Asset Category': '', 'Asset Description': 'No Inventory Logged', 'Accounting Group': '', 'Purchase Amount ($)': 0});
    const wsInv = XLSX.utils.json_to_sheet(invData);
    wsInv['!cols'] = [{wch: 20}, {wch: 18}, {wch: 15}, {wch: 25}, {wch: 40}, {wch: 25}, {wch: 15}];

    // SHEET 3: IRS Compliant Route & Mileage Log
    const routeData = [
      { 'Audit Log Context': 'Vehicle Ledger', 'Description': 'Odometer Start', 'Data Payload': startOdo ? `${startOdo}` : 'N/A' },
      { 'Audit Log Context': 'Vehicle Ledger', 'Description': 'Odometer End', 'Data Payload': endOdo ? `${endOdo}` : 'N/A' },
      { 'Audit Log Context': 'Vehicle Ledger', 'Description': 'Total Deductible Miles', 'Data Payload': `${mileage.toFixed(1)} mi` },
      { 'Audit Log Context': 'Tax Parameter', 'Description': 'Business Purpose', 'Data Payload': 'Inventory Sourcing & Procurement' },
      { 'Audit Log Context': '', 'Description': '', 'Data Payload': null },
      { 'Audit Log Context': '==== ROUTE STOPS ====', 'Description': '==== STOP ADDRESS ====', 'Data Payload': '==== AUDIT OUTCOME ====' }
    ];
    stops.forEach((s, idx) => {
      routeData.push({
        'Audit Log Context': `Stop #${idx + 1} (${s.time})`,
        'Description': s.address,
        'Data Payload': s.status ? s.status.toUpperCase() : 'PENDING'
      });
    });
    if (stops.length === 0) routeData.push({ 'Audit Log Context': 'No Stops Recorded for Period', 'Description': '', 'Data Payload': ''});
    
    const wsRoute = XLSX.utils.json_to_sheet(routeData);
    wsRoute['!cols'] = [{wch: 30}, {wch: 50}, {wch: 25}];

    // Compile
    XLSX.utils.book_append_sheet(wb, wsExec, 'Executive Summary');
    XLSX.utils.book_append_sheet(wb, wsInv, 'COGS Ledger');
    XLSX.utils.book_append_sheet(wb, wsRoute, 'Contemporaneous Mileage Log');

    outputExcel(wb, `GAAP_Company_Master_Audit_${today}.xlsx`, action);
  };

  const handleExportMasterPDF = () => {
    let today = exportDateStr;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Master Financial Audit Log', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Entity Profile: ${userProfile?.companyName || 'Independent Provider'}`, 14, 30);
    doc.text(`Filing Address: ${userProfile?.address || 'N/A'}`, 14, 35);
    doc.text(`Date of Audit: ${today}`, 14, 40);
    
    doc.autoTable({
       startY: 48,
       head: [['GAAP Executive Summary', 'Assessed Value']],
       body: [
         ['Part I: Gross Revenue', `$${revenue.toFixed(2)}`],
         ['Part III: Cost of Goods Sold', `-$${spent.toFixed(2)}`],
         ['GROSS PROFIT', `$${(revenue - spent).toFixed(2)}`],
         ['Part II: Platform Overheads', `-$${fees.toFixed(2)}`],
         ['Part II: Authorized Deductible Mileage', `-$${(Number(mileage) * 0.67).toFixed(2)}`],
         ['NET INCOME (Operating Profit/Loss)', `$${(revenue - spent - fees - (Number(mileage) * 0.67)).toFixed(2)}`]
       ]
    });

    const finalY = doc.lastAutoTable.finalY || 100;
    
    doc.text('Schedule C - Cost of Goods Sold (Part III)', 14, finalY + 15);
    const invData = inventory.map(item => [
      item.name, 
      `$${item.price.toFixed(2)}`, 
      item.status === 'sold' ? 'LIQUIDATED' : 'HOLDING', 
      item.status === 'sold' ? `$${item.soldPrice?.toFixed(2) || 0}` : '-',
      item.status === 'sold' ? `$${((item.soldPrice||0) - (item.platformFees||0) - item.price).toFixed(2)}` : '-'
    ]);

    doc.autoTable({
       startY: finalY + 20,
       head: [['Asset Description', 'COGS Debit', 'Status', 'Revenue Event', 'Net Yield']],
       body: invData.length > 0 ? invData : [['No Inventory Sourced', '', '', '', '']]
    });

    doc.save(`GAAP_Master_Audit_${today}.pdf`);
  };

  return (
    <div style={{ paddingBottom: '1rem' }}>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>

          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Analytics & Reports</h2>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Complete tax audit logs</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowProfileConfig(!showProfileConfig)} className="btn" style={{ padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }} title="Edit Tax Profile">
            <Receipt size={22} className="text-secondary" />
          </button>
          <button className="btn" onClick={resetDay} style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', borderRadius: '12px' }} title="Start Fresh Day">
            <RotateCcw size={22} />
          </button>
        </div>
      </div>

      {showProfileConfig && (
        <div className="card glass" style={{ marginBottom: '1.5rem', border: '1px solid var(--border-color)', padding: '1rem' }}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '0.5px' }}>Tax Profile Configuration</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Company/Business Name</label>
                  <input 
                    type="text" name="companyName" value={userProfile?.companyName || ''} onChange={handleProfileChange}
                    className="input-field" placeholder="e.g. My Reselling Business LLC"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', background: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Address</label>
                  <input 
                    type="text" name="address" value={userProfile?.address || ''} onChange={handleProfileChange}
                    className="input-field" placeholder="123 Main St, City, ST 12345"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', background: '#fff' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Contact #</label>
                    <input 
                      type="tel" name="phone" value={userProfile?.phone || ''} onChange={handleProfileChange}
                      className="input-field" placeholder="(555) 123-4567"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', background: '#fff' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Email</label>
                    <input 
                      type="email" name="email" value={userProfile?.email || ''} onChange={handleProfileChange}
                      className="input-field" placeholder="contact@email.com"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', background: '#fff' }}
                    />
                  </div>
                </div>
                <button className="btn btn-primary" onClick={() => setShowProfileConfig(false)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}>Save Tax Profile</button>
            </div>
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <select 
          value={selectedDate} 
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input-field"
          style={{ width: '100%', appearance: 'auto', background: 'rgba(0,0,0,0.03)', color: 'var(--text-primary)' }}
        >
          <option value="live" style={{ color: 'var(--text-primary)' }}>Live Session (Today)</option>
          {history && history.map(h => (
            <option key={h.id} value={h.id.toString()} style={{ color: 'var(--text-primary)' }}>
              Historical: {new Date(h.date).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      {/* KPI COMMAND CENTER DASHBOARD */}
      <h3 style={{ marginTop: '1rem', marginBottom: '1rem' }}>Financial Overview</h3>
      
      <div className="card glass" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            
            {/* Net Profit Block */}
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
               <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <TrendingDown size={14} color="var(--success-color)" style={{ transform: 'rotate(180deg)' }} /> Total Est. Net Profit
               </div>
               <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success-color)', letterSpacing: '-1px' }}>
                  ${(revenue - spent - fees).toFixed(2)}
               </div>
            </div>

            {/* Tax Write-offs Block */}
            <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
               <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Car size={14} color="#3b82f6" /> Earned Tax Write-offs
               </div>
               <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6', letterSpacing: '-0.5px' }}>
                  ${(mileage * 0.67).toFixed(2)}
               </div>
               <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Based on {mileage.toFixed(1)} IRS mi</div>
            </div>
         </div>

         {/* Sourcing Budget Progress Bar */}
         <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
               <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Sourcing Budget</div>
               <div style={{ fontSize: '0.8rem', fontWeight: 600, color: spent > budget ? 'var(--danger-color)' : 'var(--text-primary)' }}>
                  ${spent.toFixed(2)} / ${budget.toFixed(2)}
               </div>
            </div>
            
            {/* The Bar */}
            <div style={{ width: '100%', height: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
               <div style={{ 
                  height: '100%', 
                  width: `${Math.min((spent / (budget || 1)) * 100, 100)}%`, 
                  background: spent > budget ? 'var(--danger-color)' : 'linear-gradient(90deg, var(--accent-color) 0%, #a78bfa 100%)',
                  borderRadius: '6px',
                  transition: 'width 0.5s ease-out'
               }} />
            </div>
            {spent > budget && <div style={{ fontSize: '0.7rem', color: 'var(--danger-color)', marginTop: '0.25rem', fontWeight: 600 }}>OVER BUDGET</div>}
         </div>
      </div>

      <h3 style={{ marginTop: '1rem', marginBottom: '1rem' }}>Master Audit</h3>
      <div className="card glass" style={{ border: '1px solid rgba(34, 197, 94, 0.3)', margin: 0, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '0.75rem', borderRadius: '12px' }}>
              <FileSpreadsheet size={28} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 'bold' }}>Master Audit Log</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>All-in-one .xlsx payload</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
             <button onClick={() => handleExportMaster('download')} className="btn" style={{ padding: '0.6rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} title="Export .xlsx"><FileSpreadsheet size={18} /></button>
             <button onClick={() => handleExportMasterPDF()} className="btn" style={{ padding: '0.6rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--danger-color)' }} title="Export .pdf"><FileText size={18} /></button>
             <button onClick={() => handleExportMaster('share')} className="btn" style={{ padding: '0.6rem', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.4)' }} title="Share"><Send size={18} /></button>
          </div>
      </div>

      <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Individual Reports</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.5rem', borderRadius: '8px' }}>
              <TrendingDown size={20} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 'bold' }}>P&L Summary</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Capital & Break-Even</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
             <button onClick={() => handleExportPnL('download')} className="btn" style={{ padding: '0.5rem', background: 'transparent' }} title="Excel"><FileSpreadsheet size={18} className="text-secondary" /></button>
             <button onClick={() => handleExportPnLPDF()} className="btn" style={{ padding: '0.5rem', background: 'transparent' }} title="PDF"><FileText size={18} style={{color: 'var(--danger-color)'}} /></button>
             <button onClick={() => handleExportPnL('share')} className="btn" style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '8px' }} title="Share"><Send size={18} /></button>
          </div>
        </div>

        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.5rem', borderRadius: '8px' }}>
              <Receipt size={20} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 'bold' }}>Itemized Expenses</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Inventory Purchases</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
             <button onClick={() => handleExportExpenses('download')} className="btn" style={{ padding: '0.5rem', background: 'transparent' }} title="Excel"><FileSpreadsheet size={18} className="text-secondary" /></button>
             <button onClick={() => handleExportExpensesPDF()} className="btn" style={{ padding: '0.5rem', background: 'transparent' }} title="PDF"><FileText size={18} style={{color: 'var(--danger-color)'}} /></button>
             <button onClick={() => handleExportExpenses('share')} className="btn" style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px' }} title="Share"><Send size={18} /></button>
          </div>
        </div>

        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-color)', padding: '0.5rem', borderRadius: '8px' }}>
              <Car size={20} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 'bold' }}>Route Tracking Log</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Miles & Sourced Stops</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
             <button onClick={() => handleExportRouteLog('download')} className="btn" style={{ padding: '0.5rem', background: 'transparent' }} title="Excel"><FileSpreadsheet size={18} className="text-secondary" /></button>
             <button onClick={() => handleExportRouteLogPDF()} className="btn" style={{ padding: '0.5rem', background: 'transparent' }} title="PDF"><FileText size={18} style={{color: 'var(--danger-color)'}} /></button>
             <button onClick={() => handleExportRouteLog('share')} className="btn" style={{ padding: '0.5rem', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-color)', borderRadius: '8px' }} title="Share"><Send size={18} /></button>
          </div>
        </div>

      </div>
    </div>
  );
}
