Local working copies of the marker videos, named to match each location
marker:

- `marker-0.mp4` — MARKET SCENARIO 1
- `marker-1.mp4` — EVENT SCENARIO 1
- `marker-2.mp4` — EVENT SCENARIO 2
- `marker-3.mp4` — PLAYSCENARIO 1
- `marker-4.mp4` — PLAYSCENARIO 2
- `marker-5.mp4` — MARKET SCENARIO 2

These files themselves are gitignored (too large to commit) and aren't read
directly by `video.html` anymore -- it now loads them from a GitHub Release
(see the `MARKER_VIDEOS` map at the top of its `<script>`). To publish new
videos: replace the files here, then upload a new GitHub Release with these
same filenames and update the URLs in `video.html` to point at it.
