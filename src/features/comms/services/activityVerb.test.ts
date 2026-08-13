import { describe, it, expect } from "vitest";
import { verbTranslationKey, verbGroup, verbParams, actorDisplayName } from "./activityVerb";
import type { ActivityEvent } from "../types";

describe("verbTranslationKey", () => {
  it("replaces dots with underscores", () => {
    expect(verbTranslationKey("project.phase_changed")).toBe("project_phase_changed");
    expect(verbTranslationKey("matrice.status_changed")).toBe("matrice_status_changed");
  });
});

describe("verbGroup", () => {
  it("maps each of the five trigger sources to its group", () => {
    expect(verbGroup("project.created")).toBe("project");
    expect(verbGroup("matrice.status_changed")).toBe("matrice");
    expect(verbGroup("situation.finalized")).toBe("situation");
    expect(verbGroup("document.uploaded")).toBe("document");
    expect(verbGroup("vacation.approved")).toBe("vacation");
  });

  it("returns null for an unrecognized prefix", () => {
    expect(verbGroup("unknown.thing")).toBeNull();
  });
});

describe("verbParams", () => {
  function makeEvent(summary: Record<string, unknown>): ActivityEvent {
    return {
      id: 1,
      actor_id: "user-1",
      actor: null,
      verb: "project.phase_changed",
      project_id: 1,
      project_name: "Sannicolau 5MW",
      entity_table: "projects",
      entity_id: 1,
      summary,
      created_at: "2026-08-13T10:00:00.000Z",
    };
  }

  it("stringifies present fields", () => {
    expect(verbParams(makeEvent({ entityName: "Sannicolau", old: "planning", new: "construction" }))).toEqual({
      entityName: "Sannicolau",
      activityName: "",
      old: "planning",
      new: "construction",
    });
  });

  it("falls back to empty strings for missing fields instead of throwing", () => {
    expect(verbParams(makeEvent({}))).toEqual({
      entityName: "",
      activityName: "",
      old: "",
      new: "",
    });
  });
});

describe("actorDisplayName", () => {
  it("joins first and last name", () => {
    expect(actorDisplayName({ first_name: "Ana", last_name: "Pop" }, "Sistem")).toBe("Ana Pop");
  });

  it("falls back to the system label when actor is null", () => {
    expect(actorDisplayName(null, "Sistem")).toBe("Sistem");
  });

  it("falls back to the system label when actor has no name at all", () => {
    expect(actorDisplayName({ first_name: null, last_name: null }, "Sistem")).toBe("Sistem");
  });
});
