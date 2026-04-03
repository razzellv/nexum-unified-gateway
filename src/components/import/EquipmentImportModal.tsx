import { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import {
  Upload, Download, CheckCircle, XCircle, AlertTriangle,
  FileSpreadsheet, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Template headers ─────────────────────────────────────────────────────────
export const EQUIPMENT_TEMPLATE_HEADERS = [
  'equipmentName', 'equipmentType', 'manufacturer', 'model', 'serialNumber',
  'assetTag', 'assetNumber', 'location', 'building', 'installDate',
  'purchasePrice', 'replacementCost', 'warrantyExpiry', 'status', 'notes',
];

const REQUIRED_FIELDS = ['equipmentName', 'equipmentType'];

// Map friendly display labels
const FIELD_LABELS: Record<string, string> = {
  equipmentName:   'Equipment Name',
  equipmentType:   'Equipment Type',
  manufacturer:    'Manufacturer',
  model:           'Model',
  serialNumber:    'Serial Number',
  assetTag:        'Asset Tag',
  assetNumber:     'Asset Number',
  location:        'Location',
  building:        'Building',
  installDate:     'Install Date',
  purchasePrice:   'Purchase Price ($)',
  replacementCost: 'Replacement Cost ($)',
  warrantyExpiry:  'Warranty Expiry',
  status:          'Status',
  notes:           'Notes',
};

interface ImportRow {
  raw: Record<string, string>;
  mapped: Record<string, string>;
  error?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; name: string; reason: string }[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  facilityId?: string;
}

function downloadTemplate() {
  const csvContent = EQUIPMENT_TEMPLATE_HEADERS.join(',') + '\n' +
    'Main Boiler,boiler,Cleaver Brooks,CB-200,SN-12345,AT-001,AN-001,Mechanical Room,Building A,2020-01-15,125000,180000,2025-01-15,active,Primary steam boiler\n' +
    'Chiller #1,chiller,Trane,RTAC-150,SN-67890,AT-002,AN-002,Chiller Room,Building A,2019-06-01,250000,320000,2024-06-01,active,Main cooling chiller';
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'equipment_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function EquipmentImportModal({ open, onOpenChange, onImportComplete, facilityId }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'importing' | 'done'>('upload');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [importHistory] = useState<{ date: string; success: number; failed: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem('equipment_import_history') || '[]'); } catch { return []; }
  });

  // ── Parse file ───────────────────────────────────────────────────────────────
  const parseFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { raw: false, defval: '' });
        if (json.length === 0) { toast({ title: 'Empty file', variant: 'destructive' }); return; }
        handleParsed(Object.keys(json[0]), json);
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.data.length) { toast({ title: 'Empty file', variant: 'destructive' }); return; }
          handleParsed(results.meta.fields || [], results.data);
        },
        error: () => toast({ title: 'Parse error', description: 'Could not parse CSV file', variant: 'destructive' }),
      });
    }
  }, [toast]);

  const handleParsed = (headers: string[], rows: Record<string, string>[]) => {
    setRawHeaders(headers);
    setRawRows(rows);
    // Auto-map columns where names match (case-insensitive)
    const autoMap: Record<string, string> = {};
    EQUIPMENT_TEMPLATE_HEADERS.forEach(field => {
      const match = headers.find(h => h.toLowerCase().replace(/[^a-z0-9]/g, '') === field.toLowerCase());
      if (match) autoMap[field] = match;
    });
    setColumnMapping(autoMap);
    setStep('map');
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = '';
  };

  // ── Validate rows ─────────────────────────────────────────────────────────
  const getMappedRows = (): ImportRow[] => {
    return rawRows.map(raw => {
      const mapped: Record<string, string> = {};
      EQUIPMENT_TEMPLATE_HEADERS.forEach(field => {
        const srcCol = columnMapping[field];
        mapped[field] = srcCol ? (raw[srcCol] || '').trim() : '';
      });
      const missing = REQUIRED_FIELDS.filter(f => !mapped[f]);
      return { raw, mapped, error: missing.length ? `Missing required: ${missing.join(', ')}` : undefined };
    });
  };

  // ── Run import ─────────────────────────────────────────────────────────────
  const runImport = async () => {
    const rows = getMappedRows();
    setImporting(true);
    setStep('importing');
    setProgress(0);

    const errors: ImportResult['errors'] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      setProgress(Math.round(((i + 1) / rows.length) * 100));

      if (row.error) {
        errors.push({ row: i + 1, name: row.mapped.equipmentName || `Row ${i + 1}`, reason: row.error });
        continue;
      }

      try {
        const payload: Record<string, any> = {
          equipmentName:   row.mapped.equipmentName,
          equipmentType:   row.mapped.equipmentType.toLowerCase().replace(/\s+/g, '_'),
          manufacturer:    row.mapped.manufacturer || 'Unknown',
          model:           row.mapped.model || 'Unknown',
          serialNumber:    row.mapped.serialNumber || undefined,
          location:        row.mapped.location || undefined,
          buildingId:      row.mapped.building || undefined,
          installDate:     row.mapped.installDate || undefined,
          status:          row.mapped.status || 'active',
          notes:           row.mapped.notes || undefined,
          assetTag:        row.mapped.assetTag || undefined,
          assetNumber:     row.mapped.assetNumber || undefined,
          purchasePrice:   row.mapped.purchasePrice ? parseFloat(row.mapped.purchasePrice.replace(/[$,]/g, '')) : undefined,
          replacementCost: row.mapped.replacementCost ? parseFloat(row.mapped.replacementCost.replace(/[$,]/g, '')) : undefined,
          warrantyExpiry:  row.mapped.warrantyExpiry || undefined,
          count:           1,
        };
        // Strip undefined values
        Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
        await apiRequest('/equipment', { method: 'POST', body: JSON.stringify(payload) });
        successCount++;
      } catch (err: any) {
        errors.push({ row: i + 1, name: row.mapped.equipmentName || `Row ${i + 1}`, reason: err.message || 'API error' });
      }

      // Small delay to avoid rate limiting
      if (i < rows.length - 1) await new Promise(r => setTimeout(r, 120));
    }

    const res: ImportResult = { success: successCount, failed: errors.length, errors };
    setResult(res);
    setStep('done');
    setImporting(false);

    // Save to history
    const history = [
      { date: new Date().toLocaleString(), success: successCount, failed: errors.length },
      ...importHistory.slice(0, 9),
    ];
    localStorage.setItem('equipment_import_history', JSON.stringify(history));

    toast({
      title: `Import ${successCount > 0 ? 'complete' : 'failed'}`,
      description: `${successCount} imported · ${errors.length} failed`,
      variant: successCount > 0 ? 'default' : 'destructive',
    });

    if (successCount > 0) onImportComplete();
  };

  const reset = () => {
    setStep('upload');
    setRawHeaders([]);
    setRawRows([]);
    setColumnMapping({});
    setProgress(0);
    setResult(null);
  };

  const mappedRows = step === 'map' || step === 'preview' || step === 'importing' || step === 'done' ? getMappedRows() : [];
  const validCount = mappedRows.filter(r => !r.error).length;
  const errorCount = mappedRows.filter(r => r.error).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!importing) { onOpenChange(o); if (!o) reset(); } }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Import Equipment
          </DialogTitle>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Upload a CSV or Excel file to bulk-import equipment into your facility library.</p>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />Download Template
              </Button>
            </div>

            {/* Drop zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer',
                isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/20',
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Drag & drop or click to upload</p>
              <p className="text-sm text-muted-foreground mt-1">Accepts .csv, .xlsx, .xls</p>
            </div>

            {/* Template info */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/40 text-xs space-y-2">
              <p className="font-semibold text-muted-foreground uppercase tracking-wider">Template Headers</p>
              <div className="flex flex-wrap gap-1.5">
                {EQUIPMENT_TEMPLATE_HEADERS.map(h => (
                  <Badge key={h} variant="outline" className={cn('text-[10px]', REQUIRED_FIELDS.includes(h) && 'border-primary/50 text-primary')}>
                    {h}{REQUIRED_FIELDS.includes(h) && ' *'}
                  </Badge>
                ))}
              </div>
              <p className="text-muted-foreground">* Required fields</p>
            </div>

            {/* Import history */}
            {importHistory.length > 0 && (
              <div>
                <button
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowHistory(s => !s)}
                >
                  {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Import History ({importHistory.length})
                </button>
                {showHistory && (
                  <div className="mt-2 space-y-1.5">
                    {importHistory.map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-muted/20 border border-border/30">
                        <span className="text-muted-foreground">{h.date}</span>
                        <div className="flex gap-3">
                          <span className="text-green-400">{h.success} imported</span>
                          {h.failed > 0 && <span className="text-red-400">{h.failed} failed</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step: Column mapping */}
        {step === 'map' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{rawRows.length} rows detected</p>
                <p className="text-sm text-muted-foreground">Map your spreadsheet columns to system fields</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={reset}>Back</Button>
                <Button size="sm" onClick={() => setStep('preview')}>Preview →</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
              {EQUIPMENT_TEMPLATE_HEADERS.map(field => (
                <div key={field} className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {FIELD_LABELS[field]}
                      {REQUIRED_FIELDS.includes(field) && <span className="text-primary ml-1">*</span>}
                    </p>
                  </div>
                  <Select
                    value={columnMapping[field] || '__none__'}
                    onValueChange={v => setColumnMapping(prev => ({ ...prev, [field]: v === '__none__' ? '' : v }))}
                  >
                    <SelectTrigger className="w-44 h-8 text-xs">
                      <SelectValue placeholder="— skip —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— skip —</SelectItem>
                      {rawHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle className="w-3 h-3 mr-1" />{validCount} valid
                </Badge>
                {errorCount > 0 && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    <XCircle className="w-3 h-3 mr-1" />{errorCount} errors
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">Showing first 5 rows</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep('map')}>← Back</Button>
                <Button size="sm" onClick={runImport} disabled={validCount === 0}>
                  Import {validCount} Records
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border overflow-auto max-h-[45vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px] w-8">#</TableHead>
                    {EQUIPMENT_TEMPLATE_HEADERS.slice(0, 7).map(h => (
                      <TableHead key={h} className="text-[11px]">{FIELD_LABELS[h]}</TableHead>
                    ))}
                    <TableHead className="text-[11px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedRows.slice(0, 5).map((row, i) => (
                    <TableRow key={i} className={row.error ? 'bg-red-400/5' : ''}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      {EQUIPMENT_TEMPLATE_HEADERS.slice(0, 7).map(h => (
                        <TableCell key={h} className="text-xs max-w-[120px] truncate">{row.mapped[h] || '—'}</TableCell>
                      ))}
                      <TableCell>
                        {row.error
                          ? <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]"><XCircle className="w-3 h-3 mr-1" />Error</Badge>
                          : <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]"><CheckCircle className="w-3 h-3 mr-1" />OK</Badge>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {errorCount > 0 && (
              <div className="p-3 rounded-lg bg-yellow-400/10 border border-yellow-400/20 space-y-1">
                <p className="text-xs font-semibold text-yellow-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />{errorCount} row(s) will be skipped due to validation errors
                </p>
                {mappedRows.filter(r => r.error).slice(0, 3).map((r, i) => (
                  <p key={i} className="text-xs text-muted-foreground pl-5">{r.error}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="py-8 space-y-6 text-center">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
            <div className="space-y-2">
              <p className="font-medium">Importing equipment...</p>
              <p className="text-sm text-muted-foreground">{progress}% complete</p>
              <Progress value={progress} className="max-w-sm mx-auto h-2" />
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && result && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {result.success > 0 && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />{result.success} imported successfully
                  </Badge>
                )}
                {result.failed > 0 && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    <XCircle className="w-3.5 h-3.5 mr-1" />{result.failed} failed
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={reset}>Import More</Button>
                <Button size="sm" onClick={() => { onOpenChange(false); reset(); }}>Done</Button>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-lg border border-border overflow-auto max-h-[40vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">Row</TableHead>
                      <TableHead className="text-[11px]">Equipment Name</TableHead>
                      <TableHead className="text-[11px]">Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.errors.map((e, i) => (
                      <TableRow key={i} className="bg-red-400/5">
                        <TableCell className="text-xs">{e.row}</TableCell>
                        <TableCell className="text-xs font-medium">{e.name}</TableCell>
                        <TableCell className="text-xs text-red-400">{e.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
