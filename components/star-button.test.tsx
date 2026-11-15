import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { StarButton } from "./star-button";

describe("StarButton", () => {
  it("stars a project when you click it", async () => {
    const user = userEvent.setup();
    render(<StarButton projectId="p1" />);

    await user.click(screen.getByRole("button", { name: "Star" }));

    expect(screen.getByRole("button", { name: "Starred" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("unstars a starred project", async () => {
    // Starred before: the button reads the browser's storage.
    localStorage.setItem("starred-p1", "yes");
    const user = userEvent.setup();
    render(<StarButton projectId="p1" />);

    await user.click(screen.getByRole("button", { name: "Starred" }));

    expect(screen.getByRole("button", { name: "Star" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
