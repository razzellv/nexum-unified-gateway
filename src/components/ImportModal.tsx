import { useRef, useState, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Upload, Download, FileSpreadsheet, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, AlertTriangle, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  /** Used when the column is unmapped or blank — prevents row rejection */
  defaultValue?: string;
  /** Extra column aliases to match during auto-mapping (ERP field names, etc.) */
  aliases?: string[];
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; reason: string; data: Record<string, string> }[];
  timestamp: string;
  fileName: string;
}

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  templateHeaders: string[];   // CSV template column headers
  fields: ImportField[];       // system field definitions (key + label)
  storageKey: string;          // localStorage key for import history
  onImportRow: (row: Record<string, string>) => Promise<void>;
  /** Extra validation on top of required-field check */
  validateRow?: (row: Record<string, string>) => string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function downloadCSV(filename: string, headers: string[]) {
  const csv = headers.join(',') + '\n';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];
          if (!raw.length) return resolve({ headers: [], rows: [] });
          const headers = raw[0].map(String);
          const rows = raw.slice(1).map(r =>
            Object.fromEntries(headers.map((h, i) => [h, String(r[i] ?? '')]))
          );
          resolve({ headers, rows });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    } else {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => resolve({ headers: res.meta.fields ?? [], rows: res.data }),
        error: reject,
      });
    }
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ImportModal({
  open, onClose, title, templateHeaders, fields, storageKey,
  onImportRow, validateRow,
}: ImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<'upload' | 'map' | 'result'>('upload');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileRows, setFileRows] = useState<Record<string, string>[]>([]);
  /** mapping: systemFieldKey → fileColumn */
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ImportResult[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey + '_history') || '[]'); } catch { return []; }
  });

  // auto-map columns by matching header names case-insensitively + aliases
  const autoMap = useCallback((headers: string[]) => {
    const m: Record<string, string> = {};
    const norm = (s: string) => s.toLowerCase().replace(/[\s_\-]/g, '');
    fields.forEach(f => {
      const candidates = [f.key, f.label, ...(f.aliases || [])].map(norm);
      const match = headers.find(h => candidates.includes(norm(h)));
      if (match) m[f.key] = match;
    });
    return m;
  }, [fields]);

  const handleFile = async (file: File) => {
    const { headers, rows } = await parseFile(file);
    setFileName(file.name);
    setFileHeaders(headers);
    setFileRows(rows);
    setMapping(autoMap(headers));
    setStep('map');
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const runImport = async () => {
    setImporting(true);
    setProgress(0);
    const errors: ImportResult['errors'] = [];
    let success = 0;

    for (let i = 0; i < fileRows.length; i++) {
      const raw = fileRows[i];
      // build row using mapping; fall back to defaultValue when blank
      const row: Record<string, string> = {};
      fields.forEach(f => {
        const col = mapping[f.key];
        const val = col ? (raw[col] ?? '').trim() : '';
        row[f.key] = val || f.defaultValue || '';
      });

      // required field validation — only block if no defaultValue saved us
      const missing = fields.filter(f => f.required && !row[f.key]);
      if (missing.length) {
        errors.push({ row: i + 2, reason: `Missing required: ${missing.map(f => f.label).join(', ')}`, data: row });
        setProgress(Math.round(((i + 1) / fileRows.length) * 100));
        continue;
      }

      // custom validation
      const customErr = validateRow?.(row);
      if (customErr) {
        errors.push({ row: i + 2, reason: customErr, data: row });
        setProgress(Math.round(((i + 1) / fileRows.length) * 100));
        continue;
      }

      try {
        await onImportRow(row);
        success++;
      } catch (err: any) {
        errors.push({ row: i + 2, reason: err?.message || 'API error', data: row });
      }

      setProgress(Math.round(((i + 1) / fileRows.length) * 100));
    }

    const res: ImportResult = {
      success, failed: errors.length, errors, timestamp: new Date().toISOString(), fileName,
    };
    setResult(res);

    const updated = [res, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem(storageKey + '_history', JSON.stringify(updated));

    setImporting(false);
    setStep('result');
  };

  const reset = () => {
    setStep('upload');
    setFileName('');
    setFileHeaders([]);
    setFileRows([]);
    setMapping({});
    setProgress(0);
    setResult(null);
    setImporting(false);
  };

  const handleClose = () => { reset(); onClose(); };

  // preview rows = first 5, mapped to system fields
  const previewRows = fileRows.slice(0, 5).map(raw => {
    const row: Record<string, string> = {};
    fields.forEach(f => { row[f.key] = mapping[f.key] ? (raw[mapping[f.key]] ?? '') : ''; });
    return row;
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* ── STEP 1: Upload ── */}
        {step === 'upload' && (
          <div className="space-y-5 py-2">
            {/* Template download */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div>
                <p className="font-medium text-sm">Download Template</p>
                <p className="text-xs text-muted-foreground mt-0.5">Get the exact column format for this import</p>
              </div>
              <Button
                size="sm" variant="outline"
                onClick={() => downloadCSV(`${storageKey}_template.csv`, templateHeaders)}
              >
                <Download className="h-4 w-4 mr-1.5" />Template CSV
              </Button>
            </div>

            {/* Drop zone */}
            <div
              ref={dropRef}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
                dragging ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/50 hover:bg-primary/5'
              )}
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Drop your file here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">Supports .csv and .xlsx</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            {/* Import history */}
            {history.length > 0 && (
              <div>
                <button
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setHistoryOpen(o => !o)}
                >
                  {historyOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Import History ({history.length})
                </button>
                {historyOpen && (
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    {history.map((h, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/30 border border-border/30 text-xs">
                        <div>
                          <span className="font-medium">{h.fileName}</span>
                          <span className="text-muted-foreground ml-2">{new Date(h.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">{h.success} ok</Badge>
                          {h.failed > 0 && <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">{h.failed} failed</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Map ── */}
        {step === 'map' && (
          <div className="space-y-5 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="font-medium text-foreground">{fileName}</span>
              <span>— {fileRows.length} rows detected</span>
            </div>

            {/* Column mapping */}
            <div>
              <h3 className="font-semibold text-sm mb-3">Column Mapping</h3>
              <div className="grid grid-cols-2 gap-3">
                {fields.map(f => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      {f.label}
                      {f.required && <span className="text-destructive">*</span>}
                    </Label>
                    <Select
                      value={mapping[f.key] || '__none__'}
                      onValueChange={v => setMapping(m => ({ ...m, [f.key]: v === '__none__' ? '' : v }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="— skip —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— skip —</SelectItem>
                        {fileHeaders.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            {previewRows.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Preview (first {previewRows.length} rows)</h3>
                <div className="overflow-x-auto rounded-lg border border-border/30">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        {fields.filter(f => mapping[f.key]).map(f => (
                          <th key={f.key} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-t border-border/20">
                          {fields.filter(f => mapping[f.key]).map(f => (
                            <td key={f.key} className="px-2 py-1.5 text-foreground/80 truncate max-w-[140px]">{row[f.key] || '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Progress */}
            {importing && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Importing…</span><span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <div className="flex justify-between pt-1">
              <Button variant="outline" onClick={reset} disabled={importing}>Back</Button>
              <Button onClick={runImport} disabled={importing}>
                {importing
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing…</>
                  : <><Upload className="h-4 w-4 mr-2" />Import {fileRows.length} rows</>}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Result ── */}
        {step === 'result' && result && (
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
                <CheckCircle2 className="h-8 w-8 text-success shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-success">{result.success}</p>
                  <p className="text-xs text-muted-foreground">Imported successfully</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <XCircle className="h-8 w-8 text-destructive shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-destructive">{result.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed rows</p>
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <h3 className="font-semibold text-sm flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-warning" />Failed rows
                </h3>
                {result.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20 text-xs">
                    <span className="text-muted-foreground shrink-0">Row {e.row}:</span>
                    <span className="text-destructive">{e.reason}</span>
                    {e.data.equipmentName || e.data.itemName ? (
                      <span className="text-muted-foreground ml-auto shrink-0">{e.data.equipmentName || e.data.itemName}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-1">
              <Button variant="outline" onClick={reset}>Import Another</Button>
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
