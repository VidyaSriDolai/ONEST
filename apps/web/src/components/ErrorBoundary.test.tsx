import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary';

/** A component that always throws during render — the case the boundary exists for. */
function Bomb(): never {
  throw new Error('kaboom');
}

describe('ErrorBoundary', () => {
  // React logs the caught error to console.error by design; silence it.
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>safe content</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('safe content')).toBeInTheDocument();
  });

  it('shows the fallback panel when a child crashes', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByText('kaboom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('the reset button clears the error and re-renders children', async () => {
    let shouldThrow = true;
    function MaybeBomb(): string {
      if (shouldThrow) throw new Error('nope');
      return 'recovered';
    }

    render(
      <ErrorBoundary>
        <MaybeBomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();

    shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByText('recovered')).toBeInTheDocument();
  });

  it('renders a custom inline fallback when one is provided', () => {
    render(
      <ErrorBoundary fallback={<p>inline fallback</p>}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('inline fallback')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /something went wrong/i })).not.toBeInTheDocument();
  });
});
