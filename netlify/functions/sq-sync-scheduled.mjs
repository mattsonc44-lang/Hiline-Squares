// Every 5 minutes: live score, halftime score and final score for every linked board that isn't final.
// Cheap: one ESPN call per linked game, a database write only when something changed.
import { syncBoards } from "../lib/espn.mjs";

export default async () => {
  try {
    await syncBoards();
  } catch (e) {
    console.error(e);
  }
};

export const config = { schedule: "*/5 * * * *" };
