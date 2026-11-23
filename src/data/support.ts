// Single source of truth for donation links. Used by the home card, the
// floating support popover and the SupportStrip component.
export type SupportLink = {
  id: "bmc" | "paypal" | "kofi";
  href: string;
  // Key in the `home` section of src/i18n/ui.ts
  labelKey: "supportBuyMeCoffee" | "supportPaypal" | "supportKofi";
  primary?: boolean;
};

export const supportLinks: SupportLink[] = [
  { id: "bmc", href: "https://buymeacoffee.com/dshuhuk1", labelKey: "supportBuyMeCoffee", primary: true },
  { id: "paypal", href: "https://www.paypal.com/donate/?hosted_button_id=EEMDMAMUL8P8A", labelKey: "supportPaypal" },
  { id: "kofi", href: "https://ko-fi.com/dsfrieren", labelKey: "supportKofi" },
];
