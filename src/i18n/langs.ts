type LocaleConfig = {
  label: string;
  dayjs: () => Promise<unknown>;
  flatpickr: (() => Promise<unknown>) | null;
  i18n: () => Promise<unknown>;
  flag: string;
};

export const locales = {
  en: {
    label: "English",
    dayjs: () => import("dayjs/locale/en"),
    flatpickr: null as LocaleConfig["flatpickr"],
    i18n: () => import("./locales/en/translations.json"),
    flag: "united-kingdom",
  },
} satisfies Record<string, LocaleConfig>;

export const supportedLanguages = Object.keys(locales);

export type LocaleCode = keyof typeof locales;

export type Dir = "ltr" | "rtl";
