import { FileDown, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { exportDashboardToPDF } from '@/lib/pdf-export';

interface ExportButtonsProps {
  title: string;
  data?: any[];
  metrics?: { label: string; value: string }[];
}

export function ExportButtons({ title, data, metrics }: ExportButtonsProps) {
  const handleExportPDF = () => {
    const exportMetrics = metrics || [
      { label: 'Report Generated', value: new Date().toLocaleString() },
    ];
    exportDashboardToPDF(title, exportMetrics);
    toast.success('PDF exported successfully');
  };

  const handleExportCSV = () => {
    if (!data || data.length === 0) {
      toast.error('No data available to export');
      return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => {
          const value = row[h];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        }).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('CSV exported successfully');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="border-primary/30 hover:border-primary hover:bg-primary/10">
          <FileDown className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileDown className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
