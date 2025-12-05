import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Video, Award, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { GridBackground } from "@/components/GridBackground";
import { FuturisticPanel } from "@/components/FuturisticPanel";

const Courses = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <GridBackground />
      
      <header className="relative z-10 border-b border-border/30 bg-card/30 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-4 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-glow-primary">Courses (LMS)</h1>
          <p className="text-muted-foreground mt-1">Learning management and course delivery platform</p>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { icon: BookOpen, title: "Active Courses", desc: "12 courses in progress", value: "12" },
            { icon: Video, title: "Video Lessons", desc: "148 lessons available", value: "148" },
            { icon: Award, title: "Certifications", desc: "8 certificates earned", value: "8" },
          ].map((item, i) => (
            <FuturisticPanel key={i} className="p-6" glowColor="primary">
              <item.icon className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground mb-2">{item.desc}</p>
              <p className="text-4xl font-bold text-primary">{item.value}</p>
            </FuturisticPanel>
          ))}
        </div>

        <FuturisticPanel className="p-6" glowColor="primary">
          <h3 className="text-xl font-semibold mb-4">Launch Full LMS</h3>
          <p className="text-muted-foreground mb-4">Access the complete Learning Management System with AI-powered recommendations.</p>
          <Button asChild className="bg-primary hover:bg-primary-glow text-primary-foreground">
            <a href="https://nexum-optimize-learn.lovable.app" target="_blank" rel="noopener noreferrer">
              Open LMS Portal <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </FuturisticPanel>
      </main>
    </div>
  );
};

export default Courses;
