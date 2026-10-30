import "server-only";

export type Project = {
  id: string;
  name: string;
  description: string;
};

export type IssueStatus = "todo" | "in_progress" | "done";

export type Issue = {
  id: string;
  projectId: string;
  title: string;
  status: IssueStatus;
};

const projects: Project[] = [
  {
    id: "1",
    name: "Website relaunch",
    description: "A new marketing site with a blog.",
  },
  {
    id: "2",
    name: "Mobile app",
    description: "The first version of the iOS and Android app.",
  },
  {
    id: "3",
    name: "Infrastructure",
    description: "Servers, backups and monitoring.",
  },
];

const issues: Issue[] = [
  { id: "1", projectId: "1", title: "Design the new home page", status: "done" },
  { id: "2", projectId: "1", title: "Write the first blog post", status: "in_progress" },
  { id: "3", projectId: "1", title: "Add a contact form", status: "todo" },
  { id: "4", projectId: "2", title: "Build the sign-in screen", status: "in_progress" },
  { id: "5", projectId: "2", title: "Set up push notifications", status: "todo" },
  { id: "6", projectId: "2", title: "Publish a test build", status: "todo" },
  { id: "7", projectId: "3", title: "Automate daily backups", status: "done" },
  { id: "8", projectId: "3", title: "Add uptime monitoring", status: "in_progress" },
  { id: "9", projectId: "3", title: "Upgrade the database server", status: "todo" },
];

export async function getProjects() {
  return projects;
}

export async function getProject(id: string) {
  return projects.find((project) => project.id === id);
}

export async function getIssues(projectId: string) {
  return issues.filter((issue) => issue.projectId === projectId);
}
