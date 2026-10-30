"use client";

import { Button } from "@/components/ui/button";

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div>
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="mt-2 text-muted-foreground">
        We could not load this project. Please try again.
      </p>
      <Button variant="outline" className="mt-4" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}
