export type Project = {
  id: string;
  name: string;
  description: string;
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

export async function getProjects() {
  return projects;
}

export async function getProject(id: string) {
  return projects.find((project) => project.id === id);
}
