import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Ignore removeChild errors from browser extensions
    if (error.message?.includes('removeChild') && error.message?.includes('not a child')) {
      console.warn('DOM manipulation error (likely from browser extension):', error.message);
      // Attempt recovery by resetting error state
      setTimeout(() => {
        this.setState({ hasError: false, error: null });
      }, 100);
      return;
    }
    
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // For removeChild errors, render children anyway (usually recoverable)
      if (this.state.error?.message?.includes('removeChild')) {
        return this.props.children;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="mb-6 text-muted-foreground">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <Button onClick={this.handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
