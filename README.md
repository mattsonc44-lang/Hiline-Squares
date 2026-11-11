# Hi-Line Squares

Football squares boards (10×10). Anyone with the link can view the boards without signing in. Only you, signed in as the organizer, can edit them. The app runs on the **same Supabase project as The 28 Board**, so your 28 Board login works here too.

Defaults for each board: **$300 at halftime, $900 at the final, $12 a square**. You can change any of these per board under **Edit board**.

Files:
- `index.html`: the whole site
- `config.js`: Supabase URL and anon key, already filled in with the HiLine28 project
- `supabase/schema.sql`: the new `sq_` tables and their security rules
- `supabase/seed.sql`: the three games from the paper sheet (GB–DET, KC–DAL, CIN–BAL)
- `netlify/functions/`: the ESPN game finder and the automatic score pulls

## 1. Supabase (2 minutes)

Open the HiLine28 project and go to **SQL Editor → New query**.
1. Paste all of `supabase/schema.sql` and click **Run**.
2. Paste `supabase/seed.sql` and click **Run**. Run this one only once, or you'll get duplicate boards.

You don't need a new user or admin row, because your 28 Board login is already the organizer.

## 2. GitHub + Netlify

1. Push this folder to a new GitHub repo, for example `HiLineSquares`.
2. In Netlify, choose **Add new site → Import from Git**. Leave the build command blank and set the publish directory to the root.
3. Under **Site configuration → Environment variables**, add the same two variables HiLine28 uses:
   - `SUPABASE_URL` = `https://fyswheauyddnxcjogpou.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = the same service_role or secret key
4. Redeploy, then rename the site, for example `hilinesquares.netlify.app`.

## Running a board

Scroll to the bottom and tap **Organizer sign-in**.

- **Fill squares:** type a name in the yellow bar, then tap squares to assign them. Tap the same square again to clear it. You can also tap any square, without fill mode, to type or clear its name.
- **Draw numbers:** shuffles 0–9 for both teams. Do this once the board is full. The app warns you if the board isn't full, or if numbers are already drawn.
- **Edit board:** change the team names, colors, payouts, and price per square. **⇅ Swap** moves the drawn numbers along with their teams, so nobody's square changes.
- **Link ESPN game:** pick the date, find the game (NFL, FBS or FCS, so the Cats–Griz game works too), and choose which team goes across the top. After that, the board fills in the live score, the halftime score and the final score every 5 minutes. **Pull scores now** runs it right away.
- **Score boxes:** type the halftime or final score yourself at any time. A score you type is never overwritten.
- **Copy to new board:** starts a new game with the same names in the same squares. Numbers and scores start fresh.
- **+ New board:** a blank board.
- **Who's in:** shows each person's square count and what they owe. Only you see the **Paid** checkbox and how each person paid (Venmo, Cash, or Check).
- **Print board:** prints a landscape sheet like the paper version.

## Rules shown to players

The last digit of each team's score at halftime and at the final picks the winning square. Overtime counts toward the final. If a winning square is unsold, the board says so, and the call is yours.
