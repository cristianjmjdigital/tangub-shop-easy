import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Zap, Heart, Code2, Palette, Rocket } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="container mx-auto px-6 py-20 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <Badge variant="secondary" className="text-primary font-medium px-4 py-2">
                <Sparkles className="h-4 w-4 mr-2" />
                Welcome to your new app
              </Badge>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent leading-tight">
              Build Something
              <br />
              <span className="text-primary">Amazing</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Your journey starts here. Create, innovate, and bring your ideas to life with this beautiful foundation.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 py-4 shadow-elegant hover:shadow-glow transition-all">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-4">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to succeed</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built with modern tools and best practices to help you create exceptional experiences.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="border-0 shadow-elegant hover:shadow-glow transition-all duration-300 group">
              <CardHeader>
                <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-xl">Lightning Fast</CardTitle>
                <CardDescription className="text-base">
                  Built with Vite and optimized for performance. Get instant feedback as you build.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-elegant hover:shadow-glow transition-all duration-300 group">
              <CardHeader>
                <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Palette className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-xl">Beautiful Design</CardTitle>
                <CardDescription className="text-base">
                  Stunning UI components with Tailwind CSS and a comprehensive design system.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-elegant hover:shadow-glow transition-all duration-300 group">
              <CardHeader>
                <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Code2 className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-xl">Developer Ready</CardTitle>
                <CardDescription className="text-base">
                  TypeScript, React, and modern tooling. Everything configured and ready to go.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-elegant hover:shadow-glow transition-all duration-300 group">
              <CardHeader>
                <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Heart className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-xl">User Focused</CardTitle>
                <CardDescription className="text-base">
                  Accessible components and user-friendly interfaces built with care.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-elegant hover:shadow-glow transition-all duration-300 group">
              <CardHeader>
                <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Rocket className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-xl">Ready to Deploy</CardTitle>
                <CardDescription className="text-base">
                  Optimized build process and deployment-ready configuration out of the box.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-elegant hover:shadow-glow transition-all duration-300 group">
              <CardHeader>
                <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-xl">Extensible</CardTitle>
                <CardDescription className="text-base">
                  Modular architecture that grows with your project and team needs.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <Card className="border-0 shadow-elegant bg-gradient-subtle text-center max-w-4xl mx-auto">
            <CardContent className="p-12">
              <h3 className="text-3xl md:text-4xl font-bold mb-6">Ready to build something incredible?</h3>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Start creating your next project with this powerful foundation and beautiful components.
              </p>
              <Button size="lg" className="text-lg px-8 py-4 shadow-elegant hover:shadow-glow transition-all">
                Start Building Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Index;