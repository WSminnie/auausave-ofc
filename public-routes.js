(function (root) {
  const pages = new Set(["artists", "schedule", "series", "presenters", "awards", "projects", "admin"]);
  const tabs = new Set(["profile", "schedule", "journey", "awards"]);
  const artists = [
    { route: "/AUAUSAVE", slug: "auausave", aliases: ["auausave", "at01", "duo"] },
    { route: "/AUAU", slug: "auautnp", aliases: ["auau", "auautnp", "at02"], solo: true },
    { route: "/SAVE", slug: "savewrg", aliases: ["save", "savewrg", "at03"], solo: true },
    { route: "/MhiiPraew", slug: "mhiipraew", aliases: ["mhiipraew", "mhiipreaw", "at04", "mp"], solo: true },
  ];
  function routeInfo(value, fromHash = false) {
    let decoded;
    try {
      decoded = decodeURIComponent(String(value || "").replace(/^#/, ""));
    } catch (_) {
      return null;
    }
    if (decoded.includes("\\")) return null;
    const parts = decoded.replace(/^\/+|\/+$/g, "").split("/");
    if (parts.some((part) => part === "." || part === "..")) return null;
    const first = parts[0].toLowerCase();
    if (!fromHash && first === 'series' && parts.length === 2 && parts[1].toLowerCase() === 'index.html') return {route:'series',path:'/series'};
    if (parts.length === 1) {
      if (["", "home", "index.html"].includes(first)) return { route: "home", path: "/" };
      if (first === "admin.html") return { route: "admin", path: "/admin" };
      if (pages.has(first)) return { route: first, path: "/" + first };
    }
    const legacyArtist = first === "artist" && parts.length === 2;
    const alias = (legacyArtist ? parts[1] : parts[0]).toLowerCase();
    const artist = artists.find((entry) => entry.aliases.includes(alias));
    if (artist && (legacyArtist || parts.length === 1 || (artist.solo && parts.length === 2 && tabs.has(parts[1].toLowerCase())))) {
      const tab = legacyArtist ? "profile" : (parts[1] || "profile").toLowerCase();
      return { route: artist.route, path: "/" + artist.slug + (tab === "profile" ? "" : "/" + tab) };
    }
    if (legacyArtist && parts[1]) return { route: "artist/" + parts[1], path: "/artist/" + encodeURIComponent(parts[1]) };
    if (parts.length === 2 && ["project", "series"].includes(first) && parts[1]) {
      return { route: first + "/" + parts[1], path: "/" + first + "/" + encodeURIComponent(parts[1]) };
    }
    if (fromHash && /^\//.test(decoded) && parts.length === 1 && parts[0]) {
      return { route: "artist/" + parts[0], path: "/artist/" + encodeURIComponent(parts[0]) };
    }
    return null;
  }
  function resolve(location) {
    return (location.hash && routeInfo(location.hash, true))?.route || routeInfo(location.pathname)?.route || null;
  }
  function canonicalHref(href) {
    const url = new URL(href);
    const entry = url.searchParams.get("__page");
    const entryInfo = entry ? routeInfo(entry) : null;
    const recovery = url.searchParams.get("__route");
    const recoveryInfo = recovery?.startsWith("/") && !recovery.startsWith("//") ? routeInfo(recovery) : null;
    const hashInfo = url.hash ? routeInfo(url.hash, true) : null;
    const target = hashInfo || recoveryInfo || entryInfo || routeInfo(url.pathname);
    if (entryInfo) url.searchParams.delete("__page");
    if (recoveryInfo) url.searchParams.delete("__route");
    if (target) url.pathname = target.path;
    if (hashInfo || href.endsWith("#")) url.hash = "";
    return url.href;
  }
  function syncLocation() {
    const href = canonicalHref(root.location.href);
    if (href !== root.location.href) root.history.replaceState(null, "", href);
  }
  const api = { resolve, canonicalHref, syncLocation };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PublicRoutes = api;
  if (!root.document) return;
  syncLocation();

  function localRoute(link) {
    const href = new URL(link.href, root.location.href);
    if (href.origin !== root.location.origin || !["http:", "https:"].includes(href.protocol)) return null;
    const target = new URL(canonicalHref(href.href));
    return !target.hash && routeInfo(target.pathname) ? target : null;
  }
  function normalizeLinks(scope) {
    const links = scope.matches?.("a[href]") ? [scope] : [...(scope.querySelectorAll?.("a[href]") || [])];
    links.forEach((link) => {
      const target = localRoute(link);
      if (target) link.setAttribute("href", target.pathname + target.search);
    });
  }
  normalizeLinks(root.document);
  new root.MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => normalizeLinks(node)));
  }).observe(root.document.documentElement, { childList: true, subtree: true });
  root.document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || typeof root.router !== "function") return;
    const link = event.target.closest?.("a[href]");
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    const target = localRoute(link);
    if (!target) return;
    event.preventDefault();
    if (target.href === root.location.href) return;
    root.history.pushState(null, "", target.href);
    root.dispatchEvent(new root.Event("publicroutechange"));
  });
})(typeof window === "undefined" ? globalThis : window);
