import { Component, type ReactNode } from 'react';

export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error): { error: string } { return { error: e.message }; }
  render(): ReactNode {
    if (this.state.error === null) return this.props.children;
    return (
      <div role="alert" className="m-8 rounded-xl border border-red-400 p-6">
        <p className="font-semibold">Something went wrong: {this.state.error}</p>
        <button className="mt-3 rounded bg-slate-800 px-3 py-1 text-white" onClick={() => this.setState({ error: null })}>Try again</button>
      </div>
    );
  }
}
