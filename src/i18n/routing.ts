import { defineRouting } from "next-intl/routing";
import { locales, defaultLocale } from "./config";

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Persist the chosen locale as a durable preference rather than next-intl's
  // default browser-session cookie, so it survives closing the browser.
  localeCookie: {
    maxAge: 60 * 60 * 24 * 365,
  },
});
