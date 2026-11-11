// On-demand score pull (the "Pull scores now" button). Only reads ESPN; harmless if someone else hits it.
import { syncBoards } from "../lib/espn.mjs";

export default async () => {
  try {
    const r = await syncBoards();
    return new Response(JSON.stringify(r), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(String(e.message || e), { status: 500 });
  }
};
