import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

interface FeedItem {
  date: string;
  type: string;
  score: string;
  status: "success" | "warning" | "info";
}

const mockData: FeedItem[] = [
  { date: "2025-01-15", type: "Compliance Check", score: "98%", status: "success" },
  { date: "2025-01-14", type: "Equipment Scan", score: "95%", status: "success" },
  { date: "2025-01-13", type: "Virtuous Analysis", score: "92%", status: "info" },
  { date: "2025-01-12", type: "Course Update", score: "100%", status: "success" },
  { date: "2025-01-11", type: "System Health", score: "87%", status: "warning" },
];

export const SystemFeed = () => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-primary/20 text-primary border-primary/30";
      case "warning":
        return "bg-secondary/20 text-secondary border-secondary/30";
      case "info":
        return "bg-muted text-muted-foreground border-muted-foreground/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Activity className="w-5 h-5 text-primary" />
          System Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockData.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50"
            >
              <div className="flex items-center gap-4 flex-1">
                <span className="text-sm text-muted-foreground font-mono">{item.date}</span>
                <span className="text-sm font-medium text-foreground">{item.type}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-primary">{item.score}</span>
                <Badge className={getStatusColor(item.status)}>
                  {item.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
