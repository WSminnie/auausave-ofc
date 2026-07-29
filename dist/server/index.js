export default {
  async fetch(request, env) {
    const cleanRouteMap = {
      "/auausave": "/#/AUAUSAVE",
      "/auautnp": "/#/AUAU",
      "/savewrg": "/#/SAVE",
      "/projects": "/#/projects",
    };
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "").toLowerCase();
    const targetRoute = cleanRouteMap[pathname];

    if (targetRoute && !url.hash) {
      const targetUrl = new URL(targetRoute, url.origin);
      targetUrl.search = url.search;
      return Response.redirect(targetUrl.toString(), 302);
    }

    return env.ASSETS.fetch(request);
  },
};
