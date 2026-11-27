(() => {
  const S = window.SeriesFeature;
  const client = () => {
    if (!window.auausaveDB?.client)
      throw new Error("Cannot connect to the database. Please try again.");
    return window.auausaveDB.client;
  };
  const result = async (query) => {
    const { data, error } = await query;
    if (error)
      throw new Error(
        error.code === "23505"
          ? "This slug or episode number already exists. Please choose another."
          : error.message,
      );
    return data;
  };
  // Public reads only: coalesce hydration/router requests and short repeat visits.
  // Never persist these records or share them with uncached admin list reads.
  const publicReads = new Map(), summaries = new WeakMap(), publicTtl = 30000;
  let publicClient, generation = 0;
  const invalidate = () => { ++generation; publicReads.clear(); };
  const copy = value => typeof structuredClone === "function"
    ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  function publicRead(key, load) {
    const currentClient = client();
    if (publicClient !== currentClient) { invalidate(); publicClient = currentClient; }
    for (const [name, entry] of publicReads) if (entry.expires <= Date.now()) publicReads.delete(name);
    let entry = publicReads.get(key);
    if (!entry) {
      entry = { expires: Infinity, generation, client:currentClient };
      publicReads.set(key, entry);
      entry.promise = Promise.resolve().then(load).then(value => {
        entry.expires = Date.now() + publicTtl;
        return value;
      }, error => {
        if (publicReads.get(key) === entry) publicReads.delete(key);
        throw error;
      });
    }
    const source = entry;
    return source.promise.then(value => {
      const cloned = copy(value);
      if (key === "series:" && Array.isArray(cloned)) {
        for (const row of cloned) summaries.set(row, {generation:source.generation, client:source.client, expires:source.expires});
      }
      return cloned;
    });
  }
  async function list(kind, options = {}) {
    return kind === "series" && !options.admin
      ? publicRead(`series:${options.seriesId || ""}`, () => loadList(kind, options)) : loadList(kind, options);
  }
  async function loadList(kind, { seriesId, admin = false } = {}) {
    let query = client().from(S.types[kind].table).select("*");
    if (!admin) query = query.eq("visible", true);
    if (seriesId) query = query.eq("series_id", seriesId);
    // Page through PostgREST's row limit so archives are not silently truncated.
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const page = await result(query.order("id").range(offset, offset + 499));
      rows.push(...page);
      if (page.length < 500) break;
    }
    return S.order(rows, kind);
  }
  async function related(table, field, id) {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const page = await result(
        client()
          .from(table)
          .select("*")
          .eq(field, id)
          .order("display_order")
          .order("id")
          .range(offset, offset + 499),
      );
      rows.push(...page);
      if (page.length < 500) return rows;
    }
  }
  async function detail(slug, summary) {
    return publicRead(`detail:${slug}`, () => loadDetail(slug, summary));
  }
  async function loadDetail(slug, summary) {
    const source = summary && summaries.get(summary);
    const currentSummary = source?.generation === generation && source.client === client() && source.expires > Date.now();
    const item = currentSummary && summary.slug === slug && summary.visible === true ? copy(summary) : await result(
      client()
        .from("series_archives")
        .select("*")
        .eq("slug", slug)
        .eq("visible", true)
        .maybeSingle(),
    );
    if (!item) return null;
    const [cast, links, episodes, appearances, media, moments] = await Promise.all([
      related("series_cast", "series_id", item.id),
      related("series_links", "series_id", item.id),
      ...["episodes", "appearances", "media", "moments"].map((kind) =>
        list(kind, { seriesId: item.id }),
      ),
    ]);
    // Batch link requests rather than issue one network request per episode.
    // RLS additionally checks both episode and series publication.
    const linksByEpisode = new Map(episodes.map((episode) => [episode.id, []]));
    for (let start = 0; start < episodes.length; start += 100) {
      const ids = episodes.slice(start, start + 100).map((episode) => episode.id);
      for (let offset = 0; ; offset += 500) {
        const page = await result(
          client()
            .from("series_episode_links")
            .select("*")
            .in("episode_id", ids)
            .order("display_order")
            .order("id")
            .range(offset, offset + 499),
        );
        page.forEach((link) => linksByEpisode.get(link.episode_id)?.push(link));
        if (page.length < 500) break;
      }
    }
    episodes.forEach((episode) => {
      episode.links = linksByEpisode.get(episode.id);
    });
    return { ...item, cast, links, episodes, appearances, media, moments };
  }
  async function save(kind, values, { cast = [], links = [] } = {}) {
    const { data, error } = await window.auausaveDB.session();
    if (error || !data?.session)
      throw new Error("Your session has expired. Sign in again to save.");
    const record = await window.auausaveDB.uploadEmbeddedMedia(values, `series/${values.id}`);
    if (kind === "series") {
      cast = await window.auausaveDB.uploadEmbeddedMedia(cast, `series/${values.id}/cast`);
      await result(
        client().rpc("save_series_archive", { p_record: record, p_cast: cast, p_links: links }),
      );
    } else if (kind === "episodes") {
      await result(client().rpc("save_series_episode", { p_record: record, p_links: links }));
    } else {
      await result(client().from(S.types[kind].table).upsert(record).select("id").single());
    }
  }
  async function remove(kind, id) {
    await result(client().from(S.types[kind].table).delete().eq("id", id).select("id").single());
  }
  async function setVisible(kind, id, visible) {
    await result(
      client().from(S.types[kind].table).update({ visible }).eq("id", id).select("id").single(),
    );
  }
  async function setDefault(id) {
    await result(client().rpc("set_default_series", { p_series_id: id }));
  }
  async function reorder(kind, ids, seriesId) {
    await result(
      client().rpc("reorder_series_content", {
        p_kind: kind,
        p_ids: ids,
        p_series_id: seriesId || null,
      }),
    );
  }
  const mutation = action => async (...args) => {
    invalidate();
    try { return await action(...args); }
    finally { invalidate(); }
  };
  S.api = { list, detail, related, save:mutation(save), remove:mutation(remove),
    setVisible:mutation(setVisible), setDefault:mutation(setDefault), reorder:mutation(reorder) };
})();
