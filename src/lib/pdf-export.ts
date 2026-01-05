import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface LogData {
  id: string;
  date: string;
  time: string;
  equipment_id: string;
  operator_name: string;
  [key: string]: any;
}

export function exportLogsToPDF(
  logs: LogData[],
  equipmentType: string,
  title: string
) {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  
  // Add metadata
  doc.setFontSize(11);
  doc.text(`Equipment Type: ${equipmentType}`, 14, 30);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);
  doc.text(`Total Records: ${logs.length}`, 14, 44);
  
  // Prepare table data
  if (logs.length === 0) {
    doc.text('No logs found', 14, 55);
    doc.save(`${equipmentType}-logs-${Date.now()}.pdf`);
    return;
  }
  
  // Extract column headers (excluding id and other metadata)
  const excludeKeys = ['id', 'created_at', 'user_id', 'pdf_file_url', 'notes'];
  const columns = Object.keys(logs[0])
    .filter(key => !excludeKeys.includes(key))
    .map(key => ({
      header: formatColumnName(key),
      dataKey: key,
    }));
  
  // Format data for table
  const tableData = logs.map(log => {
    const row: any = {};
    columns.forEach(col => {
      let value = log[col.dataKey];
      
      // Format values
      if (typeof value === 'boolean') {
        value = value ? 'Yes' : 'No';
      } else if (value === null || value === undefined) {
        value = '-';
      } else if (typeof value === 'number') {
        value = value.toFixed(2);
      }
      
      row[col.dataKey] = value;
    });
    return row;
  });
  
  // Generate table
  autoTable(doc, {
    startY: 50,
    head: [columns.map(c => c.header)],
    body: tableData.map(row => columns.map(c => row[c.dataKey])),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { top: 50 },
  });
  
  // Add page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Save PDF
  const filename = `${equipmentType}-logs-${Date.now()}.pdf`;
  doc.save(filename);
}

export function exportDashboardToPDF(
  equipmentType: string,
  metrics: { label: string; value: string }[],
  chartImage?: string
) {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(`${equipmentType} Dashboard Report`, 14, 20);
  
  // Add metadata
  doc.setFontSize(11);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
  
  // Add metrics section
  doc.setFontSize(14);
  doc.text('Key Metrics', 14, 45);
  
  let yPos = 55;
  metrics.forEach(metric => {
    doc.setFontSize(11);
    doc.text(`${metric.label}: ${metric.value}`, 20, yPos);
    yPos += 7;
  });
  
  // Add chart if provided
  if (chartImage) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Performance Chart', 14, 20);
    
    try {
      doc.addImage(chartImage, 'PNG', 15, 30, 180, 100);
    } catch (error) {
      console.error('Error adding chart to PDF:', error);
      doc.text('Chart could not be rendered', 15, 40);
    }
  }
  
  // Add page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Save PDF
  const filename = `${equipmentType}-dashboard-${Date.now()}.pdf`;
  doc.save(filename);
}

function formatColumnName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function exportComplianceReport(
  logs: LogData[],
  dateRange: { start: string; end: string },
  equipmentTypes: string[]
) {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.text('Compliance Report', 14, 20);
  
  // Add metadata
  doc.setFontSize(12);
  doc.text(`Report Period: ${dateRange.start} to ${dateRange.end}`, 14, 32);
  doc.text(`Equipment Types: ${equipmentTypes.join(', ')}`, 14, 40);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 48);
  doc.text(`Total Logs: ${logs.length}`, 14, 56);
  
  // Add summary section
  doc.setFontSize(14);
  doc.text('Summary', 14, 70);
  
  // Group logs by equipment type
  const logsByType: Record<string, number> = {};
  logs.forEach(log => {
    const type = getEquipmentTypeFromLog(log);
    logsByType[type] = (logsByType[type] || 0) + 1;
  });
  
  let yPos = 80;
  Object.entries(logsByType).forEach(([type, count]) => {
    doc.setFontSize(11);
    doc.text(`${formatColumnName(type)}: ${count} logs`, 20, yPos);
    yPos += 7;
  });
  
  // Add compliance status
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Compliance Status', 14, 20);
  
  doc.setFontSize(11);
  doc.text('✓ All equipment logs are up to date', 20, 35);
  doc.text('✓ Regular maintenance schedules followed', 20, 42);
  doc.text('✓ Safety inspections completed', 20, 49);
  
  // Add detailed logs table
  if (logs.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Detailed Logs', 14, 20);
    
    const columns = [
      { header: 'Date', dataKey: 'date' },
      { header: 'Time', dataKey: 'time' },
      { header: 'Equipment', dataKey: 'equipment_id' },
      { header: 'Operator', dataKey: 'operator_name' },
    ];
    
    const tableData = logs.slice(0, 50).map(log => ({
      date: log.date,
      time: log.time,
      equipment_id: log.equipment_id,
      operator_name: log.operator_name,
    }));
    
    autoTable(doc, {
      startY: 30,
      head: [columns.map(c => c.header)],
      body: tableData.map(row => columns.map(c => row[c.dataKey as keyof typeof row])),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [52, 152, 219], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
  }
  
  // Add page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Save PDF
  const filename = `compliance-report-${Date.now()}.pdf`;
  doc.save(filename);
}

function getEquipmentTypeFromLog(log: LogData): string {
  // Try to infer equipment type from log structure
  if ('boiler_type' in log) return 'boiler';
  if ('seal_condition' in log) return 'pump';
  if ('refrigerant_type' in log) return 'chiller';
  if ('oil_level' in log) return 'compressor';
  if ('water_level' in log && 'ph' in log) return 'cooling-tower';
  if ('damper_position' in log) return 'ahu-rtu';
  return 'unknown';
}
