// Shared ESPN helpers for Hi-Line Squares.
const BASE = "https://site.api.espn.com/apis/site/v2/sports/football";
const UA = { "User-Agent": "hiline-squares" };

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// List games on a date (YYYYMMDD) across NFL, FBS and FCS.
export async function listGames(date, fetchFn = fetch) {
  const urls = [
    ["nfl", `${BASE}/nfl/scoreboard?dates=${date}`],
    ["college-football", `${BASE}/college-football/scoreboard?dates=${date}&groups=80&limit=300`],
    ["college-football", `${BASE}/college-football/scoreboard?dates=${date}&groups=81&limit=300`],
  ];
  const out = [];
  const seen = new Set();
  await Promise.all(urls.map(async ([league, url]) => {
    try {
      const r = await fetchFn(url, { headers: UA });
      if (!r.ok) return;
      const j = await r.json();
      for (const ev of j.events || []) {
        if (seen.has(ev.id)) continue;
        seen.add(ev.id);
        const comp = (ev.competitions || [])[0] || {};
        const teams = (comp.competitors || []).map((c) => ({
          id: String(c.team?.id ?? c.id),
          homeAway: c.homeAway,
          abbr: c.team?.abbreviation || "",
          name: c.team?.shortDisplayName || c.team?.displayName || "",
          full: c.team?.displayName || "",
          color: c.team?.color ? `#${c.team.color}` : null,
        })).sort((a, b) => (a.homeAway === "away" ? 0 : 1) - (b.homeAway === "away" ? 0 : 1));
        out.push({
          id: String(ev.id), league, date: ev.date, name: ev.name,
          short: ev.shortName, status: comp.status?.type?.shortDetail || ev.status?.type?.shortDetail || "",
          teams,
        });
      }
    } catch { /* one feed down shouldn't kill the list */ }
  }));
  out.sort((a, b) => (a.league === b.league ? a.date.localeCompare(b.date) : a.league === "nfl" ? -1 : 1));
  return out;
}

// Pull one game and reduce it to what a squares board needs.
export function readSummary(j, topId, sideId) {
  const comp = j?.header?.competitions?.[0];
  if (!comp) return null;
  const st = comp.status || {};
  const type = st.type || {};
  const byId = {};
  for (const c of comp.competitors || []) {
    const id = String(c.team?.id ?? c.id);
    const lines = (c.linescores || []).map((l) => num(l.value ?? l.displayValue) ?? 0);
    byId[id] = { score: num(c.score), lines };
  }
  const T = byId[String(topId)], S = byId[String(sideId)];
  if (!T || !S) return null;
  const period = num(st.period) || 0;
  const completed = !!type.completed;
  const halfReached = completed || period >= 3 || type.name === "STATUS_HALFTIME";
  const halfOf = (x) => (x.lines.length >= 2 ? x.lines[0] + x.lines[1] : x.score);
  return {
    live: { top: T.score, side: S.score, state: type.state || "pre", detail: type.shortDetail || type.detail || "" },
    half: halfReached ? { top: halfOf(T), side: halfOf(S) } : null,
    final: completed ? { top: T.score, side: S.score } : null,
  };
}

export async function fetchGame(league, eventId, fetchFn = fetch) {
  const r = await fetchFn(`${BASE}/${league}/summary?event=${encodeURIComponent(eventId)}`, { headers: UA });
  if (!r.ok) throw new Error(`ESPN ${league} ${eventId}: ${r.status}`);
  return r.json();
}

// Update every linked board that isn't final yet. Never overwrites a score typed by hand.
export async function syncBoards({ fetchFn = fetch, env = process.env, log = console.log } = {}) {
  const url = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify environment variables.");
  const h = key.startsWith("sb_")
    ? { apikey: key, "Content-Type": "application/json" }
    : { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  const q = "sq_boards?espn_event=not.is.null&final_top=is.null&select=id,title,espn_event,espn_league,espn_top_id,espn_side_id,half_top,half_side,final_top,final_side,live";
  const br = await fetchFn(`${url}/rest/v1/${q}`, { headers: h });
  if (!br.ok) throw new Error(`Supabase read failed: ${br.status} ${await br.text()}`);
  const boards = await br.json();
  if (!boards.length) { log("No linked boards waiting on scores."); return { updated: [] }; }

  const cache = {};
  const updated = [];
  for (const b of boards) {
    try {
      const k = `${b.espn_league}/${b.espn_event}`;
      cache[k] ||= await fetchGame(b.espn_league || "nfl", b.espn_event, fetchFn);
      const g = readSummary(cache[k], b.espn_top_id, b.espn_side_id);
      if (!g) { log(`${b.title}: teams not found in ESPN game`); continue; }
      const patch = {};
      if (JSON.stringify(g.live) !== JSON.stringify(b.live)) patch.live = g.live;
      if (g.half && b.half_top == null && b.half_side == null) { patch.half_top = g.half.top; patch.half_side = g.half.side; }
      if (g.final && b.final_top == null && b.final_side == null) { patch.final_top = g.final.top; patch.final_side = g.final.side; }
      if (!Object.keys(patch).length) continue;
      patch.updated_at = new Date().toISOString();
      const pr = await fetchFn(`${url}/rest/v1/sq_boards?id=eq.${b.id}`, {
        method: "PATCH", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify(patch),
      });
      if (!pr.ok) throw new Error(`Supabase write failed: ${pr.status} ${await pr.text()}`);
      log(`${b.title}: ${Object.keys(patch).filter((x) => x !== "updated_at").join(", ")}`);
      updated.push({ id: b.id, title: b.title, ...patch });
    } catch (e) {
      log(`${b.title}: ${e.message || e}`);
    }
  }
  return { updated };
}
