import Stripe from "stripe";
import { expectNoAccessibilityProblems } from "./accessibility";
import { newestLink } from "./inbox";
import { signUp } from "./sign-up";
import { expect, test } from "./test";

// The event Stripe sends when a subscription starts, signed with the
// made-up secret from .env.test, like Stripe signs it with the real one.
function subscriptionStarted(customer: string) {
  const payload = JSON.stringify({
    id: `evt_test_${crypto.randomUUID()}`,
    object: "event",
    type: "customer.subscription.created",
    data: { object: { id: "sub_test_1", object: "subscription", customer } },
  });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });
  return { payload, signature };
}

test("a new team signs up, starts a project, invites a teammate and goes Pro", async ({
  page,
  browser,
  server,
  db,
}) => {
  const id = crypto.randomUUID().slice(0, 8);
  const owner = { name: "Nora Quinn", email: `nora-${id}@example.com` };
  const teammate = { name: "Omar Reyes", email: `omar-${id}@example.com` };

  // 1. Sign up.
  await signUp(page, server.port, owner.name, owner.email);
  await expectNoAccessibilityProblems(page);

  // 2. The team's first project, on the dashboard too.
  await page.getByRole("link", { name: "Projects" }).click();
  // Before axe: the list (still empty) and the form, not only the heading.
  await expect(page.getByText("No projects yet.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "New project" }),
  ).toBeVisible();
  await expectNoAccessibilityProblems(page);
  await page.getByLabel("Name").fill("Launch plan");
  await page.getByLabel("Description").fill("Everything for the release.");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(
    page.getByRole("heading", { name: "Launch plan" }),
  ).toBeVisible();
  // The numbers and the issue list stream in after the heading.
  await expect(page.getByText("No issues in Launch plan yet.")).toBeVisible();
  await expectNoAccessibilityProblems(page);
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByRole("link", { name: "Launch plan" })).toBeVisible();

  // 3. Invite a teammate, who signs up and joins.
  await page.getByRole("link", { name: "Team" }).click();
  await page.getByLabel("Email").fill(teammate.email);
  await page.getByRole("button", { name: "Invite" }).click();
  await expect(page.getByRole("status")).toHaveText(
    `Invitation sent to ${teammate.email}.`,
  );
  await expectNoAccessibilityProblems(page);
  let invitation: string | undefined;
  await expect
    .poll(
      async () => (invitation = await newestLink(server.port, teammate.email)),
    )
    .toContain("/invitations/");

  const teammateContext = await browser.newContext();
  const teammatePage = await teammateContext.newPage();
  await signUp(teammatePage, server.port, teammate.name, teammate.email);
  await teammatePage.goto(invitation!);
  await expect(
    teammatePage.getByRole("heading", { name: `Join ${owner.name}'s team?` }),
  ).toBeVisible();
  await expectNoAccessibilityProblems(teammatePage);
  await teammatePage.getByRole("button", { name: "Join the team" }).click();
  await expect(
    teammatePage.getByRole("link", { name: "Launch plan" }),
  ).toBeVisible();
  await teammateContext.close();

  // 4. Upgrade. The browser is sent to Stripe's Checkout, and the test
  // answers for that page: nothing is loaded from Stripe.
  await page.route("https://checkout.stripe.com/**", (route) =>
    route.fulfill({ body: "Stripe Checkout would be here." }),
  );
  await page.getByRole("link", { name: "Team" }).click();
  await page.getByRole("button", { name: "Upgrade to Pro" }).click();
  await expect(page).toHaveURL(
    /^https:\/\/checkout\.stripe\.com\/c\/pay\/cs_test_/,
  );

  // Stripe tells our server about the payment; here the test does.
  const { rows } = await db.query(
    `select o.stripe_customer_id as customer from organization o
     join member m on m.organization_id = o.id
     join "user" u on u.id = m.user_id
     where u.email = $1`,
    [owner.email],
  );
  const event = subscriptionStarted(rows[0].customer);
  const response = await page.request.post("/api/webhooks/stripe", {
    headers: { "stripe-signature": event.signature },
    data: event.payload,
  });
  expect(response.status()).toBe(200);

  await page.goto("/team");
  await expect(page.getByText("Pro (active)")).toBeVisible();
  await expectNoAccessibilityProblems(page);
});
