import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                this.props.fallback || (
                    <div className="min-h-screen bg-dark-canvas flex items-center justify-center p-8">
                        <div className="bg-status-danger/20 border border-status-danger/50 rounded-lg p-6 max-w-2xl w-full">
                            <h2 className="text-xl font-bold text-status-danger mb-4">
                                Something went wrong
                            </h2>
                            <div className="bg-dark-bg p-4 rounded overflow-auto max-h-[300px]">
                                <pre className="text-sm text-status-danger font-mono whitespace-pre-wrap">
                                    {this.state.error?.toString()}
                                </pre>
                                {this.state.errorInfo && (
                                    <pre className="text-xs text-text-secondary font-mono mt-4 whitespace-pre-wrap">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-4 px-4 py-2 bg-status-danger hover:bg-status-danger/90 text-white rounded transition-colors"
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                )
            );
        }

        return this.props.children;
    }
}
