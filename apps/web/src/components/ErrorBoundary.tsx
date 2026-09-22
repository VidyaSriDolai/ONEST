import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Shown instead of the default panel, e.g. for a smaller inline region. */
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time crashes so a single broken component cannot take the
 * whole app down to a blank white page.
 *
 * Still a class component because `getDerivedStateFromError` and
 * `componentDidCatch` have no hook equivalent — React provides no other way to
 * catch an error thrown during render.
 *
 * Note what this does NOT catch: errors inside event handlers, in async code,
 * or during server responses. Those are handled by TanStack Query's error
 * states and the ApiError envelope instead.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // In production this is where a reporter (Sentry et al) would be called.
    console.error('Unhandled render error:', error, info.componentStack);
  }

  private readonly handleReset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink-50 px-4 py-12">
        <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-lifted ring-1 ring-ink-200 sm:p-8">
          <span className="flex size-12 items-center justify-center rounded-xl bg-danger-50 text-danger-600">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </span>

          <h1 className="mt-5 font-display text-xl font-extrabold tracking-tight text-ink-900">
            Something went wrong on this page
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            The rest of the app is still fine. Try again, or head back to the home page — nothing
            you have done has been lost.
          </p>

          {/* The message helps during development and when a user reports a
              bug; the stack stays in the console rather than on screen. */}
          <p className="mt-4 rounded-lg bg-ink-50 px-3 py-2.5 font-mono text-xs text-ink-600 ring-1 ring-inset ring-ink-200">
            {error.message || 'Unknown error'}
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-700"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Try again
            </button>
            <a
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-surface px-5 text-sm font-semibold text-brand-700 shadow-card ring-1 ring-inset ring-ink-200 transition hover:bg-ink-50"
            >
              Back to home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
