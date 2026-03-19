import {
  Brain, Gauge, Zap, Droplets, Shield, AlertTriangle,
  CheckCircle2, Download, Save, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useEquipment, ExtractedSpecs } from "@/contexts/EquipmentContext";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

// ── Equipment categories & roles (mirrors UploadSection) ─────────────────────
const EQUIPMENT_CATEGORIES = [
  { value: 'HVAC',                label: 'HVAC' },
  { value: 'Production',          label: 'Production (Stationary Assets)' },
  { value: 'Operations',          label: 'Operations' },
  { value: 'Electrical',          label: 'Electrical / Cogeneration' },
  { value: 'Water Treatment',     label: 'Water Treatment' },
  { value: 'Steam & Condensate',  label: 'Steam & Condensate' },
  { value: 'Medical & Lab',       label: 'Medical & Lab' },
  { value: 'Pumping',             label: 'Pumping' },
  { value: 'Refrigeration',       label: 'Refrigeration' },
  { value: 'Conveying',           label: 'Conveying & Material Handling' },
  { value: 'Other',               label: 'Other' },
];

const ASSET_ROLES = [
  { value: 'active',     label: 'Active Equipment' },
  { value: 'supportive', label: 'Supportive Equipment' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseAnalysis = (text: string) => {
  const sections: Record<string, string> = {};
  const lines = text.split('\n');
  let currentSection = '';
  let currentContent: string[] = [];
  for (const line of lines) {
    if (line.startsWith('**') && line.endsWith('**')) {
      if (currentSection && currentContent.length) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = line.replace(/\*\*/g, '').trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentSection && currentContent.length) {
    sections[currentSection] = currentContent.join('\n').trim();
  }
  return sections;
};

const ConfidenceBadge = ({ confidence }: { confidence: number }) => {
  const color   = confidence >= 80 ? 'text-green-500'  : confidence >= 50 ? 'text-yellow-500'  : 'text-red-500';
  const bgColor = confidence >= 80 ? 'bg-green-500/10' : confidence >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10';
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${bgColor}`}>
      {confidence >= 80 ? <CheckCircle2 className={`w-4 h-4 ${color}`} /> : <AlertTriangle className={`w-4 h-4 ${color}`} />}
      <span className={`text-sm font-medium ${color}`}>{confidence}% confidence</span>
    </div>
  );
};

const SpecRow = ({ label, value, unit = '' }: { label: string; value: string | number | null | undefined; unit?: string }) => {
  const displayValue = value === null || value === undefined || value === '' || value === 'Not Provided'
    ? 'Not Provided'
    : `${value}${unit}`;
  const isProvided = displayValue !== 'Not Provided';
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className={`font-medium ${isProvided ? 'text-foreground' : 'text-muted-foreground/50 italic'}`}>{displayValue}</span>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const AnalysisResults = () => {
  const { analysisResult, specsResult, addToLibrary } = useEquipment();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [saveCategory, setSaveCategory] = useState('');
  const [saveAssetRole, setSaveAssetRole] = useState('');

  if (!analysisResult && !specsResult) return null;

  const hasAnalysis   = analysisResult?.success && analysisResult.analysis;
  const confidence    = analysisResult?.confidence || specsResult?.confidence || 0;
  const warnings      = [...(analysisResult?.warnings || []), ...(specsResult?.warnings || [])];
  const specs         = specsResult?.data;
  const sections      = hasAnalysis ? parseAnalysis(analysisResult.analysis!) : {};

  const toggleSection = (key: string) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSaveToLibrary = () => {
    if (!specs) {
      toast({ title: "No data to save", description: "Extract equipment data first.", variant: "destructive" });
      return;
    }
    if (!saveCategory) {
      toast({ title: "Category required", description: "Please select an equipment category before saving.", variant: "destructive" });
      return;
    }
    if (!saveAssetRole) {
      toast({ title: "Asset role required", description: "Please select Active or Supportive before saving.", variant: "destructive" });
      return;
    }

    addToLibrary({
      specs: { ...specs, category: saveCategory, assetRole: saveAssetRole },
      confidence,
      documentType: sections['EQUIPMENT IDENTIFICATION']?.includes('Certificate') ? 'Certificate' : 'Nameplate',
      category: saveCategory,
      assetRole: saveAssetRole,
    });

    toast({ title: "✅ Saved to Library", description: `Equipment saved as ${saveCategory} · ${saveAssetRole === 'active' ? 'Active' : 'Supportive'}` });
  };

  const handleExportPDF = () => {
    const content = `
NEXUM SUUM - EQUIPMENT INTELLIGENCE REPORT
Generated: ${new Date().toLocaleString()}
Confidence: ${confidence}%
Category: ${saveCategory || 'Not specified'}
Asset Role: ${saveAssetRole || 'Not specified'}

=== EXTRACTED SPECIFICATIONS ===
Equipment Type: ${specs?.Equipment_Type || 'Not Provided'}
Brand: ${specs?.Brand || 'Not Provided'}
Model: ${specs?.Model || 'Not Provided'}
Serial Number: ${specs?.Serial_Number || 'Not Provided'}

--- Electrical ---
Horsepower: ${specs?.HP || 'N/A'}
Kilowatts: ${specs?.kW || 'N/A'}
Voltage: ${specs?.Voltage || 'N/A'}
Amperage: ${specs?.Amperage || 'N/A'}
Frequency: ${specs?.Frequency || 'N/A'} Hz
Phase: ${specs?.Phase || 'N/A'}

--- Mechanical ---
RPM: ${specs?.RPM || 'N/A'}
Displacement: ${specs?.Displacement || 'N/A'}
Flow Rate (GPM): ${specs?.GPM || 'N/A'}

=== AI ANALYSIS ===
${analysisResult?.analysis || 'No detailed analysis available.'}

=== WARNINGS ===
${warnings.length > 0 ? warnings.join('\n') : 'None'}
    `;
    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `equipment-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "📄 Report Downloaded", description: "Equipment report saved as text file." });
  };

  const hasElectrical  = specs?.Voltage || specs?.Amperage || specs?.HP || specs?.kW;
  const hasMechanical  = specs?.RPM || specs?.Displacement || specs?.GPM;
  const hasCompliance  = sections['COMPLIANCE STATUS'];
  const hasChemistry   = sections['WATER CHEMISTRY'];
  const hasEnergy      = sections['ENERGY INSIGHTS'] || sections['DERIVED METRICS'];

  return (
    <section id="analysis-results" className="py-16 bg-card/30">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">

          {/* Summary Card */}
          <Card className="mb-8 border-primary/30">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/50 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Analysis Results</CardTitle>
                    <p className="text-sm text-muted-foreground">Document analyzed</p>
                  </div>
                </div>
                <ConfidenceBadge confidence={confidence} />
              </div>
            </CardHeader>
            <CardContent>
              {/* Quick Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-background/50 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Equipment</p>
                  <p className="font-semibold">{specs?.Equipment_Type || 'Unknown'}</p>
                </div>
                <div className="p-4 bg-background/50 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Manufacturer</p>
                  <p className="font-semibold">{specs?.Brand || 'Unknown'}</p>
                </div>
                <div className="p-4 bg-background/50 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Model</p>
                  <p className="font-semibold">{specs?.Model || 'Unknown'}</p>
                </div>
                <div className="p-4 bg-background/50 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Serial</p>
                  <p className="font-semibold text-sm">{specs?.Serial_Number || 'Unknown'}</p>
                </div>
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-600">Extraction Warnings</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {warnings.map((w, i) => <li key={i}>• {w}</li>)}
                  </ul>
                </div>
              )}

              {/* ── Category & Asset Role before saving ──────────────────── */}
              <div className="mb-4 p-4 rounded-lg border border-border/50 bg-muted/20 space-y-3">
                <p className="text-sm font-semibold">Before saving — classify this equipment:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Equipment Category *
                    </label>
                    <Select value={saveCategory} onValueChange={setSaveCategory}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {EQUIPMENT_CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Asset Role *
                    </label>
                    <Select value={saveAssetRole} onValueChange={setSaveAssetRole}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_ROLES.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {saveCategory && saveAssetRole && (
                  <div className="flex gap-2 pt-1">
                    <Badge variant="outline" className="text-xs">{saveCategory}</Badge>
                    <Badge variant="outline" className={`text-xs ${saveAssetRole === 'active' ? 'border-green-500/50 text-green-400' : 'border-blue-500/50 text-blue-400'}`}>
                      {saveAssetRole === 'active' ? 'Active Equipment' : 'Supportive Equipment'}
                    </Badge>
                  </div>
                )}
              </div>
              {/* ──────────────────────────────────────────────────────────── */}

              {/* Actions */}
              <div className="flex gap-3">
                <Button onClick={handleSaveToLibrary} variant="outline" className="border-primary/30">
                  <Save className="w-4 h-4 mr-2" />
                  Save to Library
                </Button>
                <Button onClick={handleExportPDF} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabbed Details */}
          <Tabs defaultValue="specs" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
              <TabsTrigger value="specs" className="flex items-center gap-2">
                <Gauge className="w-4 h-4" /><span className="hidden md:inline">Specs</span>
              </TabsTrigger>
              {hasElectrical && (
                <TabsTrigger value="electrical" className="flex items-center gap-2">
                  <Zap className="w-4 h-4" /><span className="hidden md:inline">Electrical</span>
                </TabsTrigger>
              )}
              {hasMechanical && (
                <TabsTrigger value="mechanical" className="flex items-center gap-2">
                  <Gauge className="w-4 h-4" /><span className="hidden md:inline">Mechanical</span>
                </TabsTrigger>
              )}
              {hasEnergy && (
                <TabsTrigger value="energy" className="flex items-center gap-2">
                  <Zap className="w-4 h-4" /><span className="hidden md:inline">Energy</span>
                </TabsTrigger>
              )}
              {(hasCompliance || hasChemistry) && (
                <TabsTrigger value="compliance" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" /><span className="hidden md:inline">Compliance</span>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="specs" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">All Extracted Specifications</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-primary mb-3">Identification</h4>
                      <SpecRow label="Equipment Type"    value={specs?.Equipment_Type} />
                      <SpecRow label="Brand"             value={specs?.Brand} />
                      <SpecRow label="Model"             value={specs?.Model} />
                      <SpecRow label="Serial Number"     value={specs?.Serial_Number} />
                      <SpecRow label="Efficiency Rating" value={specs?.Efficiency_Rating} />
                      <SpecRow label="Category"          value={saveCategory || '—'} />
                      <SpecRow label="Asset Role"        value={saveAssetRole ? (saveAssetRole === 'active' ? 'Active Equipment' : 'Supportive Equipment') : '—'} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-primary mb-3">Performance</h4>
                      <SpecRow label="Horsepower" value={specs?.HP}  unit=" HP" />
                      <SpecRow label="Kilowatts"  value={specs?.kW}  unit=" kW" />
                      <SpecRow label="RPM"        value={specs?.RPM} />
                      <SpecRow label="Flow Rate"  value={specs?.GPM} unit=" GPM" />
                      <SpecRow label="Voltage"    value={specs?.Voltage} unit=" V" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="electrical" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="w-5 h-5 text-primary" />Electrical Specifications</CardTitle></CardHeader>
                <CardContent>
                  <SpecRow label="Horsepower (HP)" value={specs?.HP}        unit=" HP" />
                  <SpecRow label="Kilowatts (kW)"  value={specs?.kW}        unit=" kW" />
                  <SpecRow label="Voltage"         value={specs?.Voltage}   unit=" V" />
                  <SpecRow label="Amperage"        value={specs?.Amperage}  unit=" A" />
                  <SpecRow label="Frequency"       value={specs?.Frequency} unit=" Hz" />
                  <SpecRow label="Phase"           value={specs?.Phase} />
                  {specs?.HP && specs?.kW && (
                    <div className="mt-4 p-4 bg-accent/10 rounded-lg">
                      <h5 className="text-sm font-medium mb-2">Derived Metrics</h5>
                      <p className="text-sm text-muted-foreground">Power Conversion: {specs.HP} HP ≈ {specs.kW} kW</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mechanical" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Gauge className="w-5 h-5 text-primary" />Mechanical Specifications</CardTitle></CardHeader>
                <CardContent>
                  <SpecRow label="RPM"              value={specs?.RPM} />
                  <SpecRow label="Displacement"     value={specs?.Displacement}    unit=" gal/rev" />
                  <SpecRow label="Flow Rate (GPM)"  value={specs?.GPM}             unit=" GPM" />
                  <SpecRow label="Pressure Rating"  value={specs?.Pressure_Rating} unit=" PSI" />
                  <SpecRow label="Min Temperature"  value={specs?.Temperature_Min} unit="°F" />
                  <SpecRow label="Max Temperature"  value={specs?.Temperature_Max} unit="°F" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="energy" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="w-5 h-5 text-primary" />Energy Insights</CardTitle></CardHeader>
                <CardContent className="prose prose-invert max-w-none">
                  {sections['ENERGY INSIGHTS'] && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-primary mb-2">Insights</h5>
                      <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{sections['ENERGY INSIGHTS']}</pre>
                    </div>
                  )}
                  {sections['DERIVED METRICS'] && (
                    <div>
                      <h5 className="text-sm font-medium text-primary mb-2">Derived Metrics</h5>
                      <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{sections['DERIVED METRICS']}</pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Compliance & Chemistry</CardTitle></CardHeader>
                <CardContent>
                  {sections['COMPLIANCE STATUS'] && (
                    <Collapsible open={expandedSections['compliance']} onOpenChange={() => toggleSection('compliance')}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-background/50 rounded-lg mb-2">
                        <span className="font-medium">Compliance Status</span>
                        {expandedSections['compliance'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <pre className="whitespace-pre-wrap text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">{sections['COMPLIANCE STATUS']}</pre>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                  {sections['WATER CHEMISTRY'] && (
                    <Collapsible open={expandedSections['chemistry']} onOpenChange={() => toggleSection('chemistry')}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-background/50 rounded-lg mb-2">
                        <div className="flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-primary" />
                          <span className="font-medium">Water Chemistry</span>
                        </div>
                        {expandedSections['chemistry'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <pre className="whitespace-pre-wrap text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">{sections['WATER CHEMISTRY']}</pre>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Full AI Analysis */}
          {hasAnalysis && (
            <div className="mt-8">
              <Collapsible open={expandedSections['fullAnalysis']} onOpenChange={() => toggleSection('fullAnalysis')}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Brain className="w-5 h-5 text-primary" />Full AI Analysis
                      </CardTitle>
                      {expandedSections['fullAnalysis'] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{analysisResult.analysis}</pre>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>
          )}

        </div>
      </div>
    </section>
  );
};

export default AnalysisResults;
