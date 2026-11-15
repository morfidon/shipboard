import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getProjectStats,
  getStatsForProject,
  type ProjectStats,
} from "@/lib/data";

// The dashboard: one card per project, with its issues counted by status.
export async function ProjectStatsList() {
  const projects = await getProjectStats();

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((stats) => (
        <li key={stats.id}>
          <Card>
            <CardHeader>
              <CardTitle>
                <Link
                  href={`/projects/${stats.id}`}
                  className="hover:underline"
                >
                  {stats.name}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StatusCounts stats={stats} />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

// The project page: the same three numbers, for one project.
export async function ProjectStatsCard({ projectId }: { projectId: string }) {
  const stats = await getStatsForProject(projectId);
  if (!stats) {
    return null;
  }

  return (
    <Card>
      <CardContent>
        <StatusCounts stats={stats} />
      </CardContent>
    </Card>
  );
}

export function StatusCounts({ stats }: { stats: ProjectStats }) {
  return (
    <dl className="grid grid-cols-3 gap-2">
      <Count label="To do" value={stats.todo} />
      <Count label="In progress" value={stats.inProgress} />
      <Count label="Done" value={stats.done} />
    </dl>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold">{value}</dd>
    </div>
  );
}

export function ProjectStatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  );
}
