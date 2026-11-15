import type { Metadata } from "next";
import { Suspense } from "react";
import {
  ProjectStatsList,
  ProjectStatsSkeleton,
} from "@/components/project-stats";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Your team at a glance.</p>
      <div className="mt-6">
        <Suspense fallback={<ProjectStatsSkeleton />}>
          <ProjectStatsList />
        </Suspense>
      </div>
    </div>
  );
}
