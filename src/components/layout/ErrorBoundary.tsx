import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last line of defence against a blank screen.
 *
 * A React app with no error boundary unmounts its entire tree when any render
 * or effect throws, leaving a white page with no explanation. This catches that
 * and shows a recovery card instead. It is a backstop, not a substitute for
 * handling errors where they happen — see useLocalStorage for the storage-quota
 * case that first exposed this.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-card">
            <h1 className="error-boundary-title">Something went wrong</h1>
            <p className="error-boundary-text">
              The app hit an unexpected error. Your data is still saved — reloading
              usually fixes it.
            </p>
            <p className="error-boundary-detail">{this.state.error.message}</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
