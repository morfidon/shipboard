"use client";

import { Star } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function StarButton({ projectId }: { projectId: string }) {
  const key = `starred-${projectId}`;
  const starred = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) === "yes",
    () => false,
  );

  function toggle() {
    localStorage.setItem(key, starred ? "no" : "yes");
    window.dispatchEvent(new StorageEvent("storage", { key }));
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-pressed={starred}
    >
      <Star className={starred ? "fill-current" : ""} />
      {starred ? "Starred" : "Star"}
    </Button>
  );
}
