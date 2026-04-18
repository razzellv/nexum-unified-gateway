import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Something went wrong</p>
              <p className="text-sm text-muted-foreground mt-1">
                {this.state.error?.message || 'An unexpected error occurred in this section.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={this.handleReset}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Try Again
              </Button>
              <Button size="sm" onClick={() => window.location.href = '/'}>
                <Home className="w-3.5 h-3.5 mr-1.5" />
                Main Hub
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
