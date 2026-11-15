import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Modal } from "@/components/modal";
import { createIssueAction, type FormState } from "@/lib/actions";
import { NewIssueForm } from "./issue-form";

// The Server Action runs on the server, and a component test has none.
// A stand-in takes its place, and each test decides its answer.
vi.mock("@/lib/actions", () => ({
  createIssueAction: vi.fn(),
  updateIssueAction: vi.fn(),
}));

// The modal goes back when it closes. Outside Next.js there is no router,
// so a stand-in remembers the call.
const { back } = vi.hoisted(() => ({ back: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back }) }));

// The form the way the project page shows it: in the modal.
function renderForm() {
  render(
    <Modal title="New issue" description="In Website relaunch">
      <NewIssueForm projectId="project-1" />
    </Modal>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the new issue form", () => {
  it("sends what you typed, with the project's id", async () => {
    const user = userEvent.setup();
    vi.mocked(createIssueAction).mockResolvedValue({});
    renderForm();

    await user.type(screen.getByLabelText("Title"), "Fix the login button");
    await user.click(screen.getByRole("button", { name: "Create issue" }));

    expect(createIssueAction).toHaveBeenCalledOnce();
    const [projectId, , formData] = vi.mocked(createIssueAction).mock.calls[0];
    expect(projectId).toBe("project-1");
    expect(formData.get("title")).toBe("Fix the login button");
  });

  it("shows that it's working while the action runs", async () => {
    const user = userEvent.setup();
    // An answer that waits until the test says so.
    let answer!: (state: FormState) => void;
    vi.mocked(createIssueAction).mockReturnValue(
      new Promise((resolve) => (answer = resolve)),
    );
    renderForm();

    await user.type(screen.getByLabelText("Title"), "Fix the login button");
    await user.click(screen.getByRole("button", { name: "Create issue" }));

    expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
    answer({});
    expect(
      await screen.findByRole("button", { name: "Create issue" }),
    ).toBeEnabled();
  });

  it("shows the server's message under the field, and keeps what you typed", async () => {
    const user = userEvent.setup();
    vi.mocked(createIssueAction).mockResolvedValue({
      errors: { title: ["Give the issue a title."] },
      values: { title: " ", description: "The button is grey." },
    });
    renderForm();

    await user.type(screen.getByLabelText("Title"), " ");
    await user.type(
      screen.getByLabelText("Description"),
      "The button is grey.",
    );
    await user.click(screen.getByRole("button", { name: "Create issue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Give the issue a title.",
    );
    // A screen reader reads the message with the field.
    expect(screen.getByLabelText("Title")).toHaveAccessibleDescription(
      "Give the issue a title.",
    );
    expect(screen.getByLabelText("Description")).toHaveValue(
      "The button is grey.",
    );
  });

  it("goes back when you close it", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.keyboard("{Escape}");

    expect(back).toHaveBeenCalledOnce();
  });
});
