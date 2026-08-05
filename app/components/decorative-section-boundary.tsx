"use client";

import { Component, type ReactNode } from "react";

type Props = Readonly<{ children: ReactNode; fallback: ReactNode }>;
type State = Readonly<{ failed: boolean }>;

export class DecorativeSectionBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
