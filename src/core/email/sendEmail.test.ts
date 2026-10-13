import { afterEach, describe, expect, it, vi } from "vitest";
import { escapeHtml, sendEmail } from "./sendEmail";

describe("escapeHtml", () => {
  it("escapes HTML-significant characters", () => {
    expect(escapeHtml(`<b>"Tom" & 'Jerry'</b>`)).toBe("&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;");
  });

  it("leaves plain text untouched", () => {
    expect(escapeHtml("Parc Fotovoltaic Árpád")).toBe("Parc Fotovoltaic Árpád");
  });
});

describe("sendEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is a no-op when Resend isn't configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    await expect(sendEmail({ to: "a@b.c", subject: "s", html: "h" })).resolves.toBe(false);
  });
});
