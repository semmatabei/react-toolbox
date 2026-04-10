import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { SectionHeader } from "@/components/base/section-header";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-6 space-y-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-4" />
            <p className="text-sm font-medium">Something went wrong</p>
          </div>
          <p className="text-xs text-muted-foreground font-mono">{this.state.error.message}</p>
          <Button size="sm" variant="outline" onClick={this.reset}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Demo component that randomly throws
function Unstable({ throws }: { throws: boolean }) {
  if (throws) throw new Error("Oops! Component threw an error.");
  return <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">Component rendered fine.</div>;
}

export default function ErrorBoundaryPattern() {
  const [throws, setThrows] = useState(false);

  return (
    <div className="space-y-4 rounded-lg border border-border p-6">
      <SectionHeader description='Toggle the error to trigger the boundary. "Try again" resets it.' />
      <Button size="sm" variant={throws ? "destructive" : "outline"} onClick={() => setThrows((v) => !v)}>
        {throws ? "Disable error" : "Trigger error"}
      </Button>

      <ErrorBoundary key={String(throws)}>
        <Unstable throws={throws} />
      </ErrorBoundary>
    </div>
  );
}

import { useState } from "react";
