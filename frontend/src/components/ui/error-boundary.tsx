import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md w-full border-red-500/20 bg-red-500/5 shadow-sm">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Something went wrong</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  We encountered an unexpected error while loading this component.
                </p>
                {this.state.error && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-600 dark:text-red-400 text-left overflow-auto max-h-32">
                    {this.state.error.toString()}
                  </div>
                )}
              </div>
              <Button 
                variant="outline" 
                onClick={() => this.setState({ hasError: false })}
                className="mt-2 w-full gap-2 border-red-500/20 hover:bg-red-500/10 hover:text-red-600"
              >
                <RefreshCw className="w-4 h-4" /> Try again
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
