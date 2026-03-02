import { d as createComponent, f as renderHead, e as addAttribute, r as renderTemplate } from './astro/server_1qB4yu-C.mjs';
import 'clsx';
/* empty css                          */

const $$Footer = createComponent(($$result, $$props, $$slots) => {
  const features = [
    {
      icon: "/icons/footer/channels4_profile.jpg",
      label: "GPH Youtube",
      url: "https://www.youtube.com/@gameplayhorizon"
      // Dein YouTube-Link    
    },
    {
      icon: "/icons/footer/protip85.jpg",
      label: "Prototip85 Youtube",
      url: "https://www.youtube.com/@prototip85"
      // Dein Discord-Link},
    }
  ];
  return renderTemplate`<head><meta charset="utf-8">${renderHead()}</head> <footer class="site-footer" data-astro-cid-sz7xmlte> <div class="footer-content" data-astro-cid-sz7xmlte> <!-- CLAIM --> <div class="footer-titles" data-astro-cid-sz7xmlte> <h2 class="footer-claim" data-astro-cid-sz7xmlte>Motto Immortal<br data-astro-cid-sz7xmlte>Hero Database by Frieren</h2> <span data-astro-cid-sz7xmlte>Special thanks to xviilux, sp0nti and other content creators:
</span> </div> <!-- FEATURES --> <div class="footer-features" data-astro-cid-sz7xmlte> ${features.map((feature) => renderTemplate`<a${addAttribute(feature.url, "href")} target="_blank" rel="noopener noreferrer" class="footer-link" data-astro-cid-sz7xmlte> <div class="feature-icon" data-astro-cid-sz7xmlte> <img style="border-radius: 999px"${addAttribute(feature.icon, "src")}${addAttribute(feature.label, "alt")} data-astro-cid-sz7xmlte> </div> <span data-astro-cid-sz7xmlte>${feature.label}</span> </a>`)} </div> <!-- LINKS --> <div class="footer-links" data-astro-cid-sz7xmlte> <a href="/privacy" class="footer-link" data-astro-cid-sz7xmlte>Privacy Policy</a> </div> <!-- COPYRIGHT --> <p class="footer-copyright" data-astro-cid-sz7xmlte> ${(/* @__PURE__ */ new Date()).getFullYear()} Motto Immortal @GOAT Games. All rights reserved.
</p> </div> </footer> `;
}, "/Users/daschultheiss/hero-database/src/components/Footer.astro", void 0);

export { $$Footer as $ };
