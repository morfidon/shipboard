import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { createProjectAction } from "@/lib/actions";
import { NewProjectForm } from "./new-project-form";

// The Server Action runs on the server: a stand-in answers here.
vi.mock("@/lib/actions", () => ({ createProjectAction: vi.fn() }));

it("shows the server's message under the description, and keeps what you typed", async () => {
  const user = userEvent.setup();
  // Our server's answer to a description over 500 characters. The form stops
  // typing at 500, but a request can come from anywhere.
  vi.mocked(createProjectAction).mockResolvedValue({
    errors: {
      description: ["Keep the description to 500 characters or fewer."],
    },
    values: { name: "Launch plan", description: "Everything for the release." },
  });
  render(<NewProjectForm />);

  await user.type(screen.getByLabelText("Name"), "Launch plan");
  await user.type(
    screen.getByLabelText("Description"),
    "Everything for the release.",
  );
  await user.click(screen.getByRole("button", { name: "Create project" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Keep the description to 500 characters or fewer.",
  );
  // A screen reader reads the message with the field, and hears it's wrong.
  const description = screen.getByLabelText("Description");
  expect(description).toHaveAccessibleDescription(
    "Keep the description to 500 characters or fewer.",
  );
  expect(description).toBeInvalid();
  expect(description).toHaveValue("Everything for the release.");
});
