import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="min-h-screen bg-canvas p-6 text-ink">
          <div className="mx-auto max-w-3xl rounded-md border border-red-900 bg-red-950 p-4 text-danger">
            <h1 className="text-lg font-semibold">Erro ao carregar a tela</h1>
            <p className="mt-2 text-sm">{this.state.error.message}</p>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
