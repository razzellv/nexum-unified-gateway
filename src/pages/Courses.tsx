import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Video, FileText, Award } from "lucide-react";
import { Link } from "react-router-dom";

const Courses = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <Link to="/">
            <Button variant="ghost" className="mb-4 hover:bg-primary/10 hover:text-primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-glow-primary">Courses (LMS)</h1>
          <p className="text-muted-foreground mt-1">Learning management and course delivery platform</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-border bg-card hover:border-primary/50 transition-all">
            <CardHeader>
              <BookOpen className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Active Courses</CardTitle>
              <CardDescription>12 courses in progress</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">12</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:border-primary/50 transition-all">
            <CardHeader>
              <Video className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Video Lessons</CardTitle>
              <CardDescription>148 lessons available</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">148</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:border-primary/50 transition-all">
            <CardHeader>
              <Award className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Certifications</CardTitle>
              <CardDescription>8 certificates earned</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">8</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8 border-border bg-card">
          <CardHeader>
            <CardTitle>Course Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Full LMS features coming soon. This module will include course creation, student enrollment,
              progress tracking, and certification management.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Courses;
