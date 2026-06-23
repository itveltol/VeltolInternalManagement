export const locales = ["hu", "en", "ro"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "hu";
