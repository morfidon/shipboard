import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

// Everything that can be done, per kind of thing: Better Auth's own list
// (the team, its members, invitations...) plus our issues and billing.
const statement = {
  ...defaultStatements,
  issue: ["create", "update", "archive"],
  billing: ["manage"],
} as const;

export const ac = createAccessControl(statement);

// Each role and what it may do. Owners and admins keep Better Auth's
// rights over the team; a viewer can only look.
export const roles = {
  owner: ac.newRole({
    ...ownerAc.statements,
    issue: ["create", "update", "archive"],
    billing: ["manage"],
  }),
  admin: ac.newRole({
    ...adminAc.statements,
    issue: ["create", "update", "archive"],
    billing: ["manage"],
  }),
  member: ac.newRole({
    ...memberAc.statements,
    issue: ["create", "update"],
  }),
  viewer: ac.newRole({
    issue: [],
  }),
};

export type IssueAction = (typeof statement.issue)[number];

// May someone with this role do this to issues? A plain function: no
// database, no request, so it's quick and easy to test.
export function can(role: string, action: IssueAction): boolean {
  const permissions = roles[role as keyof typeof roles];
  if (!permissions) {
    return false;
  }
  return permissions.authorize({ issue: [action] }).success;
}

// May someone with this role change the team's plan and payment details?
export function canManageBilling(role: string): boolean {
  const permissions = roles[role as keyof typeof roles];
  if (!permissions) {
    return false;
  }
  return permissions.authorize({ billing: ["manage"] }).success;
}
