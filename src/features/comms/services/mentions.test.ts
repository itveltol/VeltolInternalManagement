import { describe, it, expect } from "vitest";
import { parseMentionHandles, resolveMentionedProfileIds } from "./mentions";
import type { MentionCandidate } from "../types";

describe("parseMentionHandles", () => {
  it("extracts a single @handle from the body", () => {
    expect(parseMentionHandles("hey @ionpopescu can you check this")).toEqual(["ionpopescu"]);
  });

  it("extracts multiple distinct handles", () => {
    expect(parseMentionHandles("@ana and @radu please review")).toEqual(["ana", "radu"]);
  });

  it("does not match the @ inside an email address", () => {
    expect(parseMentionHandles("contact me at ion.popescu@veltol.com")).toEqual([]);
  });

  it("does not match an email address even when a real mention follows", () => {
    expect(parseMentionHandles("send to office@veltol.com, cc @ana")).toEqual(["ana"]);
  });

  it("deduplicates the same handle mentioned twice", () => {
    expect(parseMentionHandles("@ana said yes, @ana confirmed")).toEqual(["ana"]);
  });

  it("returns an empty list for an unknown or malformed handle syntax", () => {
    expect(parseMentionHandles("no mentions here, just an @ by itself")).toEqual([]);
  });

  it("is case-insensitive when deduplicating", () => {
    expect(parseMentionHandles("@Ana and @ana")).toEqual(["ana"]);
  });

  it("matches a mention at the very start of the body", () => {
    expect(parseMentionHandles("@radu take a look")).toEqual(["radu"]);
  });
});

describe("resolveMentionedProfileIds", () => {
  const candidates: MentionCandidate[] = [
    { id: "user-ana", handle: "ana" },
    { id: "user-radu", handle: "radu" },
  ];

  it("resolves a known handle to its profile id", () => {
    expect(resolveMentionedProfileIds("hey @ana", candidates, "user-radu")).toEqual(["user-ana"]);
  });

  it("returns nothing for an unknown handle", () => {
    expect(resolveMentionedProfileIds("hey @unknownperson", candidates, "user-radu")).toEqual([]);
  });

  it("excludes a self-mention — never notify the author about their own note", () => {
    expect(resolveMentionedProfileIds("note to self @radu", candidates, "user-radu")).toEqual([]);
  });

  it("does not duplicate a profile id when the handle appears twice", () => {
    expect(resolveMentionedProfileIds("@ana and @ana again", candidates, "user-radu")).toEqual(["user-ana"]);
  });

  it("returns an empty list when the body has no mentions", () => {
    expect(resolveMentionedProfileIds("just a plain note", candidates, "user-radu")).toEqual([]);
  });
});
