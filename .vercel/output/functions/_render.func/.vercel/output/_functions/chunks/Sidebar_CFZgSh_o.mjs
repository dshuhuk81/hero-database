import { c as createAstro, d as createComponent, m as maybeRenderHead, e as addAttribute, r as renderTemplate } from './astro/server_1qB4yu-C.mjs';
import 'clsx';
/* empty css                          */

const $$Astro = createAstro("https://motto-immortal.vercel.app");
const $$Sidebar = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Sidebar;
  const navItems = [
    {
      icon: "/icons/sidebar/home.webp",
      label: "Home",
      href: "/"
    },
    {
      icon: "/icons/sidebar/heroes.webp",
      label: "Heros",
      href: "/heros"
    },
    {
      icon: "/icons/sidebar/heroes.webp",
      label: "My Heroes",
      href: "/myheroes",
      authOnly: true
    },
    {
      icon: "/icons/sidebar/rankings.webp",
      label: "Rankings",
      href: "/rankings",
      badge: {
        text: "Alpha"
      }
    },
    {
      icon: "/icons/sidebar/tierlist.webp",
      label: "Tier List",
      href: "/tierlist"
    },
    {
      icon: "/icons/sidebar/boss.png",
      label: "Bosses",
      href: "/bosses"
    },
    {
      icon: "/icons/sidebar/boss.png",
      label: "Events",
      href: "/events"
    },
    {
      icon: "/icons/sidebar/totems.webp",
      label: "Totems",
      href: "/totems"
    },
    {
      icon: "/icons/sidebar/changelog.svg",
      label: "Changes",
      href: "/changelog"
    }
  ];
  const normalize = (p) => p.replace(/\/+$/, "") || "/";
  const currentPath = normalize(Astro2.url.pathname);
  const isActive = (href) => normalize(href) === currentPath;
  return renderTemplate`${maybeRenderHead()}<aside class="sidebar" data-astro-cid-ssfzsv2f> <nav class="sidebar-nav" data-astro-cid-ssfzsv2f> ${navItems.map((item) => renderTemplate`<a${addAttribute(item.href, "href")}${addAttribute(`nav-item ${isActive(item.href) ? "active" : ""}`, "class")}${addAttribute(item.label, "title")}${addAttribute(item.authOnly ? "true" : "false", "data-auth-only")} data-astro-cid-ssfzsv2f> <div class="nav-icon" data-astro-cid-ssfzsv2f> <img${addAttribute(item.icon, "src")}${addAttribute(item.label, "alt")} data-astro-cid-ssfzsv2f> </div> <span class="nav-label" data-astro-cid-ssfzsv2f> ${item.label} ${item.badge && renderTemplate`<span class="alpha-chip"${addAttribute(item.badge.color ? `background-color: ${item.badge.color};` : "", "style")} data-astro-cid-ssfzsv2f> ${item.badge.text} </span>`} </span> </a>`)} </nav> </aside> <div class="auth-top-right" id="globalAuthControls" data-astro-cid-ssfzsv2f> <a href="/register" class="auth-btn auth-register" id="globalRegisterBtn" data-astro-cid-ssfzsv2f>Register</a> <a href="/login" class="auth-btn auth-login" id="globalLoginBtn" data-astro-cid-ssfzsv2f>Login</a> <button type="button" class="auth-btn auth-logout" id="globalLogoutBtn" style="display: none;" data-astro-cid-ssfzsv2f>Logout</button> </div>  `;
}, "/Users/daschultheiss/hero-database/src/components/Sidebar.astro", void 0);

export { $$Sidebar as $ };
