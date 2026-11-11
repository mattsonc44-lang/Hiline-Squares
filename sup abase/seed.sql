-- Hi-Line Squares — the three games from the paper sheet.
-- Run once after schema.sql. First team listed goes across the top; swap anytime in Edit board.
-- Defaults: $300 at half, $900 at the final, $12 a square.
insert into public.sq_boards (sort, title, top_team, side_team, top_color, side_color)
values
  (1, 'Packers vs Lions',    'Green Bay',  'Detroit',   '#203731', '#0076b6'),
  (2, 'Chiefs vs Cowboys',   'Kansas City','Dallas',    '#e31837', '#041e42'),
  (3, 'Bengals vs Ravens',   'Cincinnati', 'Baltimore', '#fb4f14', '#241773');
