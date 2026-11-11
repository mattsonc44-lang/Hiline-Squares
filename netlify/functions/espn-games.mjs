// Lists NFL + college games on a date so the organizer can link a board to one.
// GET /.netlify/functions/espn-games?date=20261126
import { listGames } from "../lib/espn.mjs";

export default async (req) => {
  const date = new URL(req.url).searchParams.get("date") || "";
  if (!/^\d{8}$/.test(date)) return new Response("date must be YYYYMMDD", { status: 400 });
  try {
    const games = await listGames(date);
    return new Response(JSON.stringify(games), {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    });
  } catch (e) {
    return new Response(String(e.message || e), { status: 502 });
  }
};
