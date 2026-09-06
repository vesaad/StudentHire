import { Component } from 'react';
import { ErrorState } from './States.jsx';

export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <ErrorState
          message="Faqja nuk u hap siç duhet. Provo ta ringarkosh."
          onRetry={() => window.location.reload()}
        />
      );
    return this.props.children;
  }
}
