import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children: ReactNode; label?: string }
interface State { error: Error | null }

/** Per-panel error boundary: a crash in any one view (a bad payload, a NaN, a failed dynamic import) is caught
 * and rendered as a message instead of unmounting the whole app to a black screen. Mandatory (a blank-page bug
 * must never take down the product). Each workbench view, page and the live lane is wrapped in one of these. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // surface to the console for diagnosis; never rethrow (that would black out the app)
    console.error(`[Atalaya] view crashed${this.props.label ? ` (${this.props.label})` : ""}:`, error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="banner error" role="alert">
          <strong>Something went wrong in this view{this.props.label ? ` (${this.props.label})` : ""}.</strong>
          <div style={{ marginTop: "0.4rem", fontSize: "0.82rem", opacity: 0.85 }}>{this.state.error.message}</div>
          <button type="button" className="btn" style={{ marginTop: "0.6rem" }}
                  onClick={() => this.setState({ error: null })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}
