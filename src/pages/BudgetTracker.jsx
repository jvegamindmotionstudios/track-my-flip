import React, { useState } from 'react';
import { RotateCcw, Download, Share2, FileSpreadsheet, TrendingDown, Receipt, Car, Send, FileText } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function BudgetTracker() {
  const { budget: liveBudget, spent: liveSpent, revenue: liveRevenue, fees: liveFees, inventory: liveInventory, stops: liveStops, mileage: liveMileage, trackedDrives: liveTrackedDrives, startOdo: liveStartOdo, endOdo: liveEndOdo, resetDay, history } = useAppContext();
  
  const [selectedDate, setSelectedDate] = useState('live');

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

  const handleExportPnL = (action) => {
    let today = exportDateStr;
    const wb = XLSX.utils.book_new();
    const pnlData = [
      { 'Account Group': 'Gross Revenue', 'Description': 'Asset Sales', 'Amount': revenue },
      { 'Account Group': 'Cost of Goods Sold', 'Description': 'Inventory Purchases', 'Amount': -spent },
      { 'Account Group': 'Operating Expenses', 'Description': 'Platform Fees & Shipping', 'Amount': -fees },
      { 'Account Group': 'Operating Expenses', 'Description': 'Standard Mileage Deduction', 'Amount': -(mileage * 0.67) },
      { 'Account Group': 'Net Income (Loss)', 'Description': 'Realized Profit / Loss', 'Amount': (revenue - spent - fees - (mileage * 0.67)) },
      { 'Account Group': '', 'Description': '', 'Amount': null },
      { 'Account Group': 'Asset/Capital', 'Description': 'Initial Working Capital', 'Amount': budget },
      { 'Account Group': 'Asset/Capital', 'Description': 'End of Day Liquid Cash', 'Amount': budget - spent + revenue - fees }
    ];
    const ws = XLSX.utils.json_to_sheet(pnlData);
    ws['!cols'] = [{wch: 25}, {wch: 35}, {wch: 15}];
    XLSX.utils.book_append_sheet(wb, ws, 'Profit & Loss');
    outputExcel(wb, `TrackMyFlip_PnL_Report_${today}.xlsx`, action);
  };

  const handleExportPnLPDF = () => {
    let today = exportDateStr;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Track My Flip - P&L Report (${today})`, 14, 20);
    
    doc.autoTable({
       startY: 30,
       head: [['Account Group', 'Description', 'Amount']],
       body: [
         ['Gross Revenue', 'Asset Sales', `$${revenue.toFixed(2)}`],
         ['Cost of Goods Sold', 'Inventory Purchases', `-$${spent.toFixed(2)}`],
         ['Operating Expenses', 'Platform Fees & Shipping', `-$${fees.toFixed(2)}`],
         ['Operating Expenses', 'Standard Mileage Deduction', `-$${(mileage * 0.67).toFixed(2)}`],
         ['Net Income (Loss)', 'Realized Profit / Loss', `$${(revenue - spent - fees - (mileage * 0.67)).toFixed(2)}`],
         ['', '', ''],
         ['Asset/Capital', 'Initial Working Capital', `$${budget.toFixed(2)}`],
         ['Asset/Capital', 'End of Day Liquid Cash', `$${(budget - spent + revenue - fees).toFixed(2)}`]
       ]
    });
    doc.save(`TrackMyFlip_PnL_${today}.pdf`);
  };

  const handleExportExpenses = (action) => {
    let today = exportDateStr;
    const wb = XLSX.utils.book_new();
    const expenseData = inventory.map(item => ({
        'Date': today,
        'Account': 'Inventory / COGS',
        'Payment Method': item.paymentMode || 'Cash',
        'Category': item.cat || 'Uncategorized',
        'Description': item.name,
        'Amount': item.price
    }));
    if (expenseData.length === 0) expenseData.push({ 'Date': today, 'Account': '', 'Payment Method': '', 'Category': '', 'Description': 'No Expenses Logged', 'Amount': 0 });
    const ws = XLSX.utils.json_to_sheet(expenseData);
    ws['!cols'] = [{wch: 15}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 35}, {wch: 12}];
    XLSX.utils.book_append_sheet(wb, ws, 'Itemized Expenses');
    outputExcel(wb, `TrackMyFlip_Expense_Report_${today}.xlsx`, action);
  };

  const handleExportExpensesPDF = () => {
    let today = exportDateStr;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Track My Flip - Itemized Expenses (${today})`, 14, 20);

    const expenseData = inventory.map(item => [
        today,
        item.paymentMode || 'Cash',
        item.cat || 'Uncategorized',
        item.name,
        `$${item.price.toFixed(2)}`
    ]);

    doc.autoTable({
       startY: 30,
       head: [['Date', 'Payment', 'Category', 'Description', 'Amount']],
       body: expenseData.length > 0 ? expenseData : [['No Expenses Logged', '', '', '', '']]
    });
    doc.save(`TrackMyFlip_Expenses_${today}.pdf`);
  };

  const handleExportRouteLog = (action) => {
    let today = exportDateStr;
    const wb = XLSX.utils.book_new();
    const routeData = stops.map((s, idx) => ({
        'Stop #': idx + 1,
        'Time Logged': s.time,
        'Location Address': s.address,
        'Target Asset Class': s.items,
        'Status': s.status ? s.status.toUpperCase() : 'PENDING'
    }));
    if (routeData.length === 0) routeData.push({ 'Stop #': 1, 'Time Logged': '', 'Location Address': 'No Stops Logged', 'Target Asset Class': '', 'Status': '' });
    const ws = XLSX.utils.json_to_sheet(routeData);
    ws['!cols'] = [{wch: 10}, {wch: 15}, {wch: 40}, {wch: 25}, {wch: 15}];
    XLSX.utils.book_append_sheet(wb, ws, 'Route Log');
    outputExcel(wb, `TrackMyFlip_Route_Log_${today}.xlsx`, action);
  };

  const handleExportRouteLogPDF = () => {
    let today = exportDateStr;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Track My Flip - Route Log (${today})`, 14, 20);

    const routeData = stops.map((s, idx) => [
        idx + 1,
        s.time,
        s.address || 'N/A',
        s.items || 'N/A',
        s.status ? s.status.toUpperCase() : 'PENDING'
    ]);

    doc.autoTable({
       startY: 30,
       head: [['#', 'Time', 'Address', 'Asset Class', 'Status']],
       body: routeData.length > 0 ? routeData : [['No Stops Logged', '', '', '', '']]
    });
    doc.save(`TrackMyFlip_RouteLog_${today}.pdf`);
  };

  const handleExportMaster = (action) => {
    let today = exportDateStr;
    const wb = XLSX.utils.book_new();

    // SHEET 1: Executive Summary & KPIs
    const execData = [
      { 'Metric Category': 'Audit Information', 'Metric Details': 'Date of Audit', 'Recorded Value': today },
      { 'Metric Category': '', 'Metric Details': 'Generated System', 'Recorded Value': 'TrackMyFlip Pro' },
      { 'Metric Category': '', 'Metric Details': '', 'Recorded Value': null },
      { 'Metric Category': 'Capital Allocation', 'Metric Details': 'Initial Sourcing Budget', 'Recorded Value': `$${budget.toFixed(2)}` },
      { 'Metric Category': '', 'Metric Details': 'Total Cost of Goods Sold (COGS)', 'Recorded Value': `-$${spent.toFixed(2)}` },
      { 'Metric Category': '', 'Metric Details': 'Gross Final Revenue', 'Recorded Value': `+$${revenue.toFixed(2)}` },
      { 'Metric Category': '', 'Metric Details': 'Platform Fees / Overheads', 'Recorded Value': `-$${fees.toFixed(2)}` },
      { 'Metric Category': '', 'Metric Details': 'Liquid Cash on Hand', 'Recorded Value': `$${(budget - spent + revenue - fees).toFixed(2)}` },
      { 'Metric Category': '', 'Metric Details': '', 'Recorded Value': null },
      { 'Metric Category': 'Tax Deductions (OpEx)', 'Metric Details': 'IRS Standard Mileage (67c/mi)', 'Recorded Value': `-$${(mileage * 0.67).toFixed(2)}` },
      { 'Metric Category': '', 'Metric Details': 'Realized Net Income / Deficit', 'Recorded Value': `${(revenue - spent - fees - (mileage * 0.67)) >= 0 ? '+' : '-'}$${Math.abs(revenue - spent - fees - (mileage * 0.67)).toFixed(2)}` },
      { 'Metric Category': '', 'Metric Details': '', 'Recorded Value': null },
      { 'Metric Category': 'Performance KPIs', 'Metric Details': 'Total Assets Acquired', 'Recorded Value': inventory.length },
      { 'Metric Category': '', 'Metric Details': 'Assets Liquidated (Sold)', 'Recorded Value': inventory.filter(i => i.status === 'sold').length },
      { 'Metric Category': '', 'Metric Details': 'Average Cost per Asset Acquired', 'Recorded Value': inventory.length ? `$${(spent / inventory.length).toFixed(2)}` : '$0.00' },
      { 'Metric Category': '', 'Metric Details': 'Average Sourcing Cost per Stop Hit', 'Recorded Value': stops.length > 0 ? `$${(spent / stops.length).toFixed(2)}` : '$0.00' },
    ];
    const wsExec = XLSX.utils.json_to_sheet(execData);
    wsExec['!cols'] = [{wch: 25}, {wch: 35}, {wch: 20}];

    // SHEET 2: Master Inventory (COGS) Ledger
    const invData = inventory.map((item, idx) => ({
      'Log ID': `INV-${today.replace(/-/g, '')}-${String(idx+1).padStart(3, '0')}`,
      'Date of Acquisition': today,
      'Payment Method': item.paymentMode || 'Cash',
      'Asset Category': item.cat || 'Misc / Uncategorized',
      'Asset Description': item.name,
      'Accounting Group': 'Cost of Goods Sold',
      'Purchase Amount': item.price
    }));
    if (invData.length === 0) invData.push({ 'Log ID': '', 'Date of Acquisition': '', 'Payment Method': '', 'Asset Category': '', 'Asset Description': 'No Inventory Logged', 'Accounting Group': '', 'Purchase Amount': 0});
    const wsInv = XLSX.utils.json_to_sheet(invData);
    wsInv['!cols'] = [{wch: 20}, {wch: 18}, {wch: 15}, {wch: 25}, {wch: 40}, {wch: 25}, {wch: 15}];

    // SHEET 3: IRS Compliant Route & Mileage Log
    const routeData = [
      { 'Log Context': 'Vehicle Record', 'Entry Description': 'Odometer Start', 'Data Value': startOdo ? `${startOdo}` : 'Not Logged' },
      { 'Log Context': 'Vehicle Record', 'Entry Description': 'Odometer End', 'Data Value': endOdo ? `${endOdo}` : 'Not Logged' },
      { 'Log Context': 'Vehicle Record', 'Entry Description': 'Manual Miles Driven', 'Data Value': `${rawMileage} mi` },
      { 'Log Context': 'Vehicle Record', 'Entry Description': 'Auto (MileIQ) Miles', 'Data Value': `${autoMileage.toFixed(1)} mi` },
      { 'Log Context': 'Vehicle Record', 'Entry Description': 'Total Deductible Miles', 'Data Value': `${mileage.toFixed(1)} mi` },
      { 'Log Context': 'Tax Data', 'Entry Description': 'Business Purpose', 'Data Value': 'Inventory Sourcing & Procurement' },
      { 'Log Context': '', 'Entry Description': '', 'Data Value': null },
      { 'Log Context': '==== ROUTE STOPS ====', 'Entry Description': '==== LOCATION ADDRESS ====', 'Data Value': '==== OUTCOME ====' }
    ];
    stops.forEach((s, idx) => {
      routeData.push({
        'Log Context': `Stop #${idx + 1} (${s.time})`,
        'Entry Description': s.address,
        'Data Value': s.status ? s.status.toUpperCase() : 'PENDING'
      });
    });
    if (stops.length === 0) routeData.push({ 'Log Context': 'No Stops', 'Entry Description': '', 'Data Value': ''});
    
    const wsRoute = XLSX.utils.json_to_sheet(routeData);
    wsRoute['!cols'] = [{wch: 25}, {wch: 50}, {wch: 20}];

    // Compile
    XLSX.utils.book_append_sheet(wb, wsExec, 'Executive Summary');
    XLSX.utils.book_append_sheet(wb, wsInv, 'Inventory COGS Ledger');
    XLSX.utils.book_append_sheet(wb, wsRoute, 'IRS Route Compliance');

    outputExcel(wb, `TrackMyFlip_CompleteMasterAudit_${today}.xlsx`, action);
  };

  const handleExportMasterPDF = () => {
    const today = selectedDate === 'live' ? new Date().toISOString().split('T')[0] : 
      new Date(history.find(h => h.id.toString() === selectedDate).date).toISOString().split('T')[0];

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Track My Flip - Master Audit Log', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Date: ${today}`, 14, 30);
    
    doc.autoTable({
       startY: 40,
       head: [['Executive Summary', 'Value']],
       body: [
         ['Total Revenue', `$${revenue.toFixed(2)}`],
         ['Total Spent / COGS', `$${spent.toFixed(2)}`],
         ['Platform Fees', `$${fees.toFixed(2)}`],
         ['Total Deductible Mileage', `${Number(mileage).toFixed(1)} mi`],
         ['Net Profit / Loss', `$${(revenue - spent - fees - (Number(mileage) * 0.67)).toFixed(2)}`]
       ]
    });

    const finalY = doc.lastAutoTable.finalY;
    
    doc.text('Inventory Ledger', 14, finalY + 15);
    const invData = inventory.map(item => [
      item.name, 
      item.status.toUpperCase(), 
      `$${item.price.toFixed(2)}`, 
      item.status === 'sold' ? `$${item.soldPrice?.toFixed(2) || 0}` : '-',
      item.status === 'sold' ? `$${((item.soldPrice||0) - (item.platformFees||0) - item.price).toFixed(2)}` : '-'
    ]);

    doc.autoTable({
       startY: finalY + 20,
       head: [['Item Name', 'Status', 'Cost', 'Sold For', 'Net Profit']],
       body: invData
    });

    const finalY2 = doc.lastAutoTable.finalY || finalY + 20;

    doc.text('Routing & Tracking Logs', 14, finalY2 + 15);
    const routeData = stops.map(stop => [
      stop.time,
      "STOP",
      stop.address || stop.type,
      stop.status.toUpperCase()
    ]);
    
    // Add Auto Drives to routing log
    currentDrives.forEach(drive => {
        routeData.push([
            new Date(drive.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            "DRIVE",
            `${Number(drive.distanceMiles).toFixed(1)} miles`,
            drive.purpose.toUpperCase()
        ]);
    });

    doc.autoTable({
       startY: finalY2 + 20,
       head: [['Time', 'Event', 'Details', 'Status']],
       body: routeData
    });

    doc.save(`TrackMyFlip_Audit_${today}.pdf`);
  };

  return (
    <div style={{ paddingBottom: '1rem' }}>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>

          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Analytics & Reports</h2>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Complete tax audit logs</p>
        </div>
        <button className="btn" onClick={resetDay} style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', borderRadius: '50%' }} title="Start Fresh Day">
          <RotateCcw size={22} />
        </button>
      </div>

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
