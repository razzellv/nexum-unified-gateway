import { Library, Trash2, Download, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEquipment } from "@/contexts/EquipmentContext";
import { toast } from "@/hooks/use-toast";

const EquipmentLibrary = () => {
  const { equipmentLibrary, removeFromLibrary, clearLibrary } = useEquipment();
  
  if (equipmentLibrary.length === 0) {
    return null;
  }
  
  const handleExportAll = () => {
    const data = equipmentLibrary.map(item => ({
      ...item.specs,
      confidence: item.confidence,
      documentType: item.documentType,
      createdAt: item.createdAt,
    }));
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `equipment-library-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "📁 Library Exported",
      description: `Exported ${equipmentLibrary.length} equipment records.`,
    });
  };
  
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/20 border border-accent/50 flex items-center justify-center">
                <Library className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Equipment Library</h2>
                <p className="text-sm text-muted-foreground">
                  {equipmentLibrary.length} equipment profile{equipmentLibrary.length !== 1 ? 's' : ''} in session
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportAll}>
                <Download className="w-4 h-4 mr-2" />
                Export All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  clearLibrary();
                  toast({ title: "Library cleared" });
                }}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipmentLibrary.map((item) => (
              <Card key={item.id} className="relative group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      <CardTitle className="text-base">
                        {item.specs.Equipment_Type || 'Unknown Equipment'}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={() => removeFromLibrary(item.id)}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Brand</span>
                      <span className="font-medium">{item.specs.Brand || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Model</span>
                      <span className="font-medium">{item.specs.Model || 'N/A'}</span>
                    </div>
                    {item.specs.HP && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">HP</span>
                        <span className="font-medium">{item.specs.HP}</span>
                      </div>
                    )}
                    {item.specs.Voltage && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Voltage</span>
                        <span className="font-medium">{item.specs.Voltage}V</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.documentType}</span>
                    <span>{item.confidence}% conf.</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EquipmentLibrary;
