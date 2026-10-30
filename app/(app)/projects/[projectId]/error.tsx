"use client";

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div>
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        We could not load this project. Please try again.
      </p>
      <button
        onClick={() => retry()}
        className="mt-4 rounded border border-zinc-300 px-3 py-1 dark:border-zinc-700"
      >
        Try again
      </button>
    </div>
  );
}
