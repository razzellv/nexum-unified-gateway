import { useState, useRef } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { SystemSelector } from '@/components/SystemSelector';
import { LogEntryForm } from '@/components/LogEntryForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Upload, Download, CheckCircle2, XCircle, AlertTriangle, Loader2, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api';
import { toast } from 'sonner';
import type { Facility, Building, SystemInfo } from '@/types/logging';

// ── CSV helpers ────────────────────────────────────────────────────────────────
const SYSTEM_TYPES = ['boiler', 'chiller', 'pump', 'ahu', 'cooling_tower', 'energy', 'generator', 'other'] as const;

const TEMPLATE_ROWS = [
  'date,time,systemType,parameter,value,unit,notes',
  '2025-01-15,08:00,boiler,steam_pressure,145,psi,Normal reading',
  '2025-01-15,08:00,chiller,leaving_water_temp,44.5,°F,Within spec',
  '2025-01-15,09:30,pump,discharge_pressure,78,psi,Post-maintenance check',
].join('\n');

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_ROWS], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'facility_log_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse a CSV string into header array + row objects. Handles quoted fields. */
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  function splitLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  }

  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
  return { headers, rows };
}

interface ImportError { row: number; reason: string; }

// ── Bulk Import Tab ────────────────────────────────────────────────────────────
function BulkImportTab() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imported, setImported] = useState(0);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [done, setDone] = useState(false);

  const reset = () => {
    setHeaders([]);
    setRows([]);
    setFileName('');
    setProgress(0);
    setImported(0);
    setErrors([]);
    setDone(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      setHeaders(h);
      setRows(r);
      setFileName(file.name);
      setDone(false);
      setErrors([]);
      setProgress(0);
      setImported(0);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setProgress(0);
    setImported(0);
    setErrors([]);
    setDone(false);

    const facilityId =
      user?.facilityId ||
      user?.['custom:facilityId'] ||
      'facility-001';

    const errs: ImportError[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-based, accounting for header

      // Validate required fields
      const missingFields: string[] = [];
      if (!row.date) missingFields.push('date');
      if (!row.systemType) missingFields.push('systemType');
      if (!row.parameter) missingFields.push('parameter');
      if (row.value === undefined || row.value === '') missingFields.push('value');

      if (missingFields.length > 0) {
        errs.push({ row: rowNum, reason: `Missing required fields: ${missingFields.join(', ')}` });
        setProgress(Math.round(((i + 1) / rows.length) * 100));
        continue;
      }

      // Build ISO timestamp from date + time columns
      const datePart = row.date.trim();
      const timePart = (row.time || '00:00').trim();
      const timestamp = `${datePart}T${timePart.length === 5 ? timePart + ':00' : timePart}Z`;

      try {
        await apiRequest('/facility-log-ingest', {
          method: 'POST',
          body: JSON.stringify({
            facilityId,
            systemType: row.systemType.trim().toLowerCase(),
            entries: [
              {
                parameter: row.parameter.trim(),
                value: parseFloat(row.value),
                unit: row.unit?.trim() || '',
                timestamp,
                notes: row.notes?.trim() || '',
              },
            ],
          }),
        });
        successCount++;
        setImported(prev => prev + 1);
      } catch (err: any) {
        errs.push({ row: rowNum, reason: err?.message || 'API error' });
      }

      setProgress(Math.round(((i + 1) / rows.length) * 100));

      // 50ms delay between requests
      if (i < rows.length - 1) {
        await new Promise(r => setTimeout(r, 50));
      }
    }

    setErrors(errs);
    setImported(successCount);
    setImporting(false);
    setDone(true);

    if (successCount > 0) {
      toast.success(`${successCount} record${successCount !== 1 ? 's' : ''} imported successfully`);

      // DC Vault cross-write: record this batch import as a DC observation signal (non-critical)
      try {
        const token = localStorage.getItem('nexum_id_token') || localStorage.getItem('nexum_access_token') || '';
        const systemTypes = [...new Set(rows.map(r => r.systemType?.trim()).filter(Boolean))];
        const chainRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/dc-vault`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title: `Facility Data Import — ${successCount} records (${systemTypes.join(', ')})`,
            sourceType: 'facility_data_source',
            description: `CSV batch import: ${successCount} successful, ${errs.length} failed. Systems: ${systemTypes.join(', ')}.`,
          }),
        });
        if (chainRes.ok) {
          const { chain } = await chainRes.json();
          // Append an observation signal with the import summary
          await fetch(`${import.meta.env.VITE_API_BASE_URL}/dc-vault/${chain.id}/signals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              signalType: 'observation',
              rawContent: `Facility Data Source batch import completed. ${successCount} records ingested across systems: ${systemTypes.join(', ')}. ${errs.length > 0 ? `${errs.length} rows failed validation.` : 'No errors.'}`,
            }),
          }).catch(() => {});
        }
      } catch { /* non-critical — do not surface to user */ }
    }
    if (errs.length > 0) {
      toast.error(`${errs.length} row${errs.length !== 1 ? 's' : ''} failed — see error list`);
    }
  };

  const previewRows = rows.slice(0, 5);
  const PREVIEW_COLS = ['date', 'time', 'systemType', 'parameter', 'value', 'unit', 'notes'];
  const visibleCols = PREVIEW_COLS.filter(c => headers.includes(c));

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      {/* Format reference */}
      <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-2">
        <p className="text-sm font-semibold text-foreground">Expected CSV format</p>
        <pre className="text-xs text-muted-foreground font-mono bg-muted/40 rounded p-3 overflow-x-auto whitespace-pre">{TEMPLATE_ROWS}</pre>
        <p className="text-xs text-muted-foreground">
          Valid <code>systemType</code> values: {SYSTEM_TYPES.join(', ')}
        </p>
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-2" />Download CSV Template
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={importing}
        >
          <Upload className="w-4 h-4 mr-2" />
          {fileName ? 'Choose Different File' : 'Choose CSV File'}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {/* File loaded state */}
      {rows.length > 0 && !done && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{fileName}</span>
            <span className="text-muted-foreground">— {rows.length} rows detected</span>
          </div>

          {/* Preview table */}
          <div>
            <p className="text-sm font-semibold mb-2">
              Preview (first {previewRows.length} of {rows.length} rows)
            </p>
            <div className="overflow-x-auto rounded-lg border border-border/30">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    {visibleCols.map(col => (
                      <th key={col} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-t border-border/20">
                      {visibleCols.map(col => (
                        <td key={col} className="px-3 py-2 text-foreground/80 truncate max-w-[160px]">
                          {row[col] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Progress */}
          {importing && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Importing… {imported} of {rows.length}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={reset} disabled={importing}>
              Clear
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing…</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Import {rows.length} Records</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Result summary */}
      {done && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-green-500">{imported}</p>
                <p className="text-xs text-muted-foreground">Imported successfully</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <XCircle className="w-8 h-8 text-destructive shrink-0" />
              <div>
                <p className="text-2xl font-bold text-destructive">{errors.length}</p>
                <p className="text-xs text-muted-foreground">Failed rows</p>
              </div>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                Failed rows
              </h3>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {errors.map((e, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20 text-xs"
                  >
                    <span className="text-muted-foreground shrink-0">Row {e.row}:</span>
                    <span className="text-destructive">{e.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={reset}>Import Another File</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
const FacilityDataSource = () => {
  const [activeTab, setActiveTab] = useState<'manual' | 'bulk'>('manual');
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<SystemInfo | null>(null);
  const [isEnergyLog, setIsEnergyLog] = useState(false);

  const handleSystemSelect = (facility: Facility, building: Building, system: SystemInfo | null) => {
    setSelectedFacility(facility);
    setSelectedBuilding(building);
    setSelectedSystem(system);
    setIsEnergyLog(system === null);
  };

  const handleBack = () => {
    setSelectedSystem(null);
    setSelectedBuilding(null);
    setSelectedFacility(null);
    setIsEnergyLog(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Facility Data Source
            </h1>
            <p className="text-muted-foreground mt-2">
              Log daily operational readings and equipment data
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border/40">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'manual'
                ? 'bg-background border border-b-background border-border/40 text-foreground -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'bulk'
                ? 'bg-background border border-b-background border-border/40 text-foreground -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Bulk Import (CSV)
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">New</Badge>
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'manual' ? (
          /* Existing manual entry flow */
          (selectedSystem || isEnergyLog) && selectedFacility && selectedBuilding ? (
            <div className="space-y-4">
              <Button variant="ghost" onClick={handleBack} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to System Selection
              </Button>
              <LogEntryForm
                facility={selectedFacility}
                building={selectedBuilding}
                system={selectedSystem}
                isEnergyLog={isEnergyLog}
                onBack={handleBack}
              />
            </div>
          ) : (
            <SystemSelector onSelect={handleSystemSelect} />
          )
        ) : (
          <BulkImportTab />
        )}
      </div>
    </MainLayout>
  );
};

export default FacilityDataSource;
