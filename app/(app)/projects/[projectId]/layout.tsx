export default function ProjectLayout({
  children,
  modal,
}: LayoutProps<"/projects/[projectId]">) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
