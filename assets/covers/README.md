# Post covers

Drop an image here to set the picture that shows beside a post on the
`/writing/` index. Name it after the post's slug — the part of the filename
after the date:

```
posts/2026-05-18-path-towards-autonomous-machine-intelligence.md
  ->  assets/covers/path-towards-autonomous-machine-intelligence.png
```

`.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`, `.gif` and `.svg` all work; if more
than one exists for a slug the list order above decides. Rebuild with
`python3 build.py` to pick up a new file.

The card renders it in a 76x76 box (56x56 on phones), cropped to fill from the
centre — so square images, or ones whose subject sits in the middle, work best.
Something around 300x300 is plenty.

A post with no file here falls back to `assets/posts/<slug>/thumb.svg`, the
small line drawing the builder ships with. A post with neither renders without
a picture. A front-matter `image:` path overrides both.
