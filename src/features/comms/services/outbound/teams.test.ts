import { describe, it, expect } from "vitest";
import { buildAdaptiveCard } from "./teams";

describe("buildAdaptiveCard", () => {
  it("builds a message with the title, snippet, and an open action", () => {
    const card = buildAdaptiveCard({
      title: "Test announcement",
      author: "Ana Pop",
      projectName: "Sannicolau 5MW",
      snippet: "Body snippet",
      href: "/announcements/1",
    });

    expect(card.type).toBe("message");
    expect(card.attachments).toHaveLength(1);
    const content = card.attachments[0].content;
    expect(content.type).toBe("AdaptiveCard");
    expect(content.body[0]).toMatchObject({ type: "TextBlock", text: "Test announcement" });
    expect(content.body.at(-1)).toMatchObject({ type: "TextBlock", text: "Body snippet" });
    expect(content.actions[0]).toMatchObject({ type: "Action.OpenUrl", url: "/announcements/1" });
  });

  it("includes a FactSet with author and project when both are present", () => {
    const card = buildAdaptiveCard({
      title: "T",
      author: "Ana Pop",
      projectName: "Sannicolau 5MW",
      snippet: "S",
      href: "/x",
    });
    const factSet = card.attachments[0].content.body.find((b) => b.type === "FactSet") as
      | { facts: { title: string; value: string }[] }
      | undefined;
    expect(factSet?.facts).toEqual([
      { title: "Author", value: "Ana Pop" },
      { title: "Project", value: "Sannicolau 5MW" },
    ]);
  });

  it("omits the FactSet entirely when there is no author and no project", () => {
    const card = buildAdaptiveCard({ title: "T", author: null, projectName: null, snippet: "S", href: "/x" });
    const hasFactSet = card.attachments[0].content.body.some((b) => b.type === "FactSet");
    expect(hasFactSet).toBe(false);
  });

  it("includes only the project fact when there is no author", () => {
    const card = buildAdaptiveCard({ title: "T", author: null, projectName: "P1", snippet: "S", href: "/x" });
    const factSet = card.attachments[0].content.body.find((b) => b.type === "FactSet") as
      | { facts: { title: string; value: string }[] }
      | undefined;
    expect(factSet?.facts).toEqual([{ title: "Project", value: "P1" }]);
  });
});
