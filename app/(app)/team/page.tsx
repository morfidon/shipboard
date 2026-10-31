import { InviteForm } from "@/components/invite-form";
import { getMembers, getPendingInvitations, getTeamName } from "@/lib/data";

export default async function TeamPage() {
  const [teamName, members, invitations] = await Promise.all([
    getTeamName(),
    getMembers(),
    getPendingInvitations(),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">{teamName}</h1>
        <p className="mt-2 text-muted-foreground">Who works on this team.</p>
      </div>
      <ul className="divide-y rounded-md border">
        {members.map((person) => (
          <li
            key={person.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <p className="font-medium">{person.name}</p>
              <p className="text-sm text-muted-foreground">{person.email}</p>
            </div>
            <span className="text-sm capitalize">{person.role}</span>
          </li>
        ))}
      </ul>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Invite someone</h2>
        <InviteForm />
        {invitations.length > 0 && (
          <ul className="text-sm text-muted-foreground">
            {invitations.map((invite) => (
              <li key={invite.id}>
                Waiting for {invite.email} ({invite.role})
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
