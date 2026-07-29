export default {
  async fetch(request, env) {
    const cleanRoutes = new Set([
      "/auausave",
      "/auautnp",
      "/savewrg",
      "/projects",
    ]);
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "").toLowerCase();

    if (cleanRoutes.has(pathname)) {
      const indexRequest = new Request(new URL("/index.html", url), request);
      return env.ASSETS.fetch(indexRequest);
    }

    return env.ASSETS.fetch(request);
  },
};
