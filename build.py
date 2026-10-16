#!/usr/bin/env python3
"""
Static blog builder for gagiknavasardyan.github.io

    python3 build.py             build published posts
    python3 build.py --drafts    include drafts too (local preview)
    python3 build.py --clean     remove generated pages first

Reads   posts/*.md
Writes  writing/index.html
        writing/<slug>/index.html

Stdlib only. Pygments is used for syntax highlighting if it happens to be
installed; without it code blocks still render, just unhighlighted.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import os
import re
import shutil
import sys
import time
import unicodedata
from pathlib import Path

# ============================================================
# Config
# ============================================================

SITE_URL = "https://gagiknavasardyan.github.io"
AUTHOR = "Gagik Navasardyan"
BLOG_TITLE = "Blog"
BLOG_DESCRIPTION = "My notes and essays on machine learning research."
WORDS_PER_MINUTE = 220

ROOT = Path(__file__).parent.resolve()
POSTS_DIR = ROOT / "posts"
OUT_DIR = ROOT / "writing"
TEMPLATE_DIR = ROOT / "templates"

# Drop-in cover images for the index cards: assets/covers/<slug>.<ext>.
# Anything here wins over the generated assets/posts/<slug>/thumb.svg, so a
# cover can be replaced by adding a file — no front matter, no rebuild config.
COVERS_DIR = ROOT / "assets" / "covers"
COVER_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg")

try:
    from pygments import highlight as _pyg_highlight
    from pygments.formatters import HtmlFormatter
    from pygments.lexers import get_lexer_by_name
    from pygments.util import ClassNotFound

    HAS_PYGMENTS = True
except ImportError:  # pragma: no cover - optional
    HAS_PYGMENTS = False


# ============================================================
# Front matter  (a deliberately small YAML subset)
# ============================================================

def parse_front_matter(raw: str) -> tuple[dict, str]:
    """Split `---` front matter off the top of a document.

    Supports `key: value`, `tags: [a, b]`, and `draft: true`. That is the
    whole grammar — anything fancier and it is time to install a real parser.
    """
    if not raw.startswith("---"):
        return {}, raw

    lines = raw.split("\n")
    end = None
    for i, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            end = i
            break
    if end is None:
        return {}, raw

    meta: dict = {}
    for line in lines[1:end]:
        line = line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()

        if value.startswith("[") and value.endswith("]"):
            items = [v.strip().strip("\"'") for v in value[1:-1].split(",")]
            meta[key] = [v for v in items if v]
        elif value.lower() in ("true", "false"):
            meta[key] = value.lower() == "true"
        else:
            meta[key] = value.strip("\"'")

    return meta, "\n".join(lines[end + 1:])


# ============================================================
# Markdown
# ============================================================

# Inline code and math are pulled out before any emphasis parsing runs, so a
# `$z_{t+1}$` or a `snake_case` identifier never gets chewed into <em>.
PLACEHOLDER = "\x00{}\x00"


class Protected:
    """Stashes spans that inline formatting must not touch."""

    def __init__(self) -> None:
        self.items: list[str] = []

    def stash(self, html_fragment: str) -> str:
        self.items.append(html_fragment)
        return PLACEHOLDER.format(len(self.items) - 1)

    def restore(self, text: str) -> str:
        def sub(match: re.Match) -> str:
            return self.items[int(match.group(1))]

        return re.sub(r"\x00(\d+)\x00", sub, text)


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[\s_-]+", "-", text) or "section"


def highlight_code(code: str, lang: str) -> str:
    if HAS_PYGMENTS and lang:
        try:
            lexer = get_lexer_by_name(lang, stripall=False)
            return _pyg_highlight(code, lexer, HtmlFormatter(nowrap=True))
        except ClassNotFound:
            pass
    return html.escape(code)


def render_inline(text: str, protected: Protected) -> str:
    """Inline spans. Note: `_underscore_` emphasis is intentionally not
    supported — it collides with LaTeX subscripts and Python identifiers,
    which are everywhere in these posts. Use *asterisks*."""

    # inline code first, so nothing inside it is interpreted
    def code_span(match: re.Match) -> str:
        return protected.stash(f"<code>{html.escape(match.group(1))}</code>")

    text = re.sub(r"`([^`]+)`", code_span, text)

    # inline math, handed to KaTeX at runtime
    def math_span(match: re.Match) -> str:
        return protected.stash(
            f'<span class="math-inline">${html.escape(match.group(1))}$</span>'
        )

    text = re.sub(r"(?<!\\)\$([^$\n]+?)(?<!\\)\$", math_span, text)

    text = html.escape(text)

    # images before links — same bracket shape, longer token wins
    text = re.sub(
        r"!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)",
        lambda m: f'<img src="{m.group(2)}" alt="{m.group(1)}" loading="lazy">',
        text,
    )

    def link(match: re.Match) -> str:
        label, url = match.group(1), match.group(2)
        external = url.startswith(("http://", "https://"))
        attrs = ' target="_blank" rel="noopener"' if external else ""
        return f'<a href="{url}"{attrs}>{label}</a>'

    text = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", link, text)

    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<em>\1</em>", text)

    # ---- {some aside}{cfyb} — "closed for your best" ----
    # A clause the reader is invited to skip: blog.js collapses it to a pill
    # that expands on click. Runs last, so the aside can contain any other
    # inline markup. Emitted as phrasing content only — <details> is flow
    # content and would make the browser split the surrounding <p> in two.
    #
    # The body ships *visible*; blog.js hides it on load. With JavaScript off
    # the sentence simply reads in full, which is the correct failure.
    text = re.sub(
        r"\{([^{}]+)\}\{cfyb\}",
        lambda m: f'<span class="cfyb"><span class="cfyb-body">{m.group(1)}</span></span>',
        text,
    )

    text = text.replace(" -- ", " — ")
    return text


def render_markdown(source: str) -> tuple[str, bool]:
    """Return (html, uses_math). Block-level parse, line by line."""
    protected = Protected()
    lines = source.split("\n")
    out: list[str] = []
    i = 0
    uses_math = "$" in source

    def inline(text: str) -> str:
        return protected.restore(render_inline(text, protected))

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        # ---- fenced code ----
        if stripped.startswith("```"):
            lang = stripped[3:].strip()
            i += 1
            block: list[str] = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                block.append(lines[i])
                i += 1
            i += 1
            code = "\n".join(block)
            label = f' data-lang="{html.escape(lang)}"' if lang else ""
            out.append(
                f'<div class="code-block"{label}>'
                f"<pre><code>{highlight_code(code, lang)}</code></pre></div>"
            )
            continue

        # ---- display math ----
        if stripped == "$$":
            i += 1
            block = []
            while i < len(lines) and lines[i].strip() != "$$":
                block.append(lines[i])
                i += 1
            i += 1
            body = html.escape("\n".join(block))
            out.append(f'<div class="math-display">$${body}$$</div>')
            uses_math = True
            continue

        # ---- optional section: `{` … `}{cfyb: Button label}` ----
        # The block-sized cfyb. Everything between the two lines is ordinary
        # markdown, rendered recursively; blog.js hides it behind a large
        # button carrying the label. Ships visible, like the inline form.
        #
        # `}{cfyb row: Name — one-line description}` is the compact variant:
        # a list row rather than a banner, for several in a stack.
        # `}{cfyb card: Name — description}` is the same row, drawn larger, for
        # core content (a lemma, a theorem) rather than an optional aside.
        # `}{cfyb paper: Name — description}` stacks the two on separate lines;
        # `}{cfyb paper post: …}` also marks the entry as having a post.
        if stripped == "{":
            i += 1
            block = []
            label = None
            in_fence = False
            # Blocks may nest: a `{` line inside opens a child block, and only
            # the closer at depth 0 ends this one. The child is rendered by the
            # recursive render_markdown call below.
            depth = 0
            while i < len(lines):
                inner = lines[i].strip()
                if inner.startswith("```"):
                    in_fence = not in_fence
                closer = None if in_fence else re.fullmatch(
                    r"\}\{cfyb(?:\s+(row|card|paper|code))?(\s+post)?(?::\s*(.*?))?\s*\}", inner
                )
                if not in_fence and inner == "{":
                    depth += 1
                elif closer and depth > 0:
                    depth -= 1
                    closer = None
                if closer:
                    variant = {
                        "row": " cfyb-row",
                        "card": " cfyb-row cfyb-card",
                        # `paper`: the card, with name and summary stacked on
                        # two lines so every button in a list is one height.
                        "paper": " cfyb-row cfyb-card cfyb-paper",
                        # `code`: the card in green, for a worked code example.
                        "code": " cfyb-row cfyb-card cfyb-code",
                    }.get(closer.group(1), "")
                    # `post` after the variant marks an entry I have written
                    # about: blog.js adds a "my post" mark to its button.
                    if closer.group(2):
                        variant += " has-post"
                    label = closer.group(3) or "closed for your best"
                    break
                block.append(lines[i])
                i += 1
            if label is None:
                raise ValueError(
                    f"optional section opened with '{{' is never closed "
                    f"with '}}{{cfyb: …}}'"
                )
            i += 1
            body, inner_math = render_markdown("\n".join(block))
            uses_math = uses_math or inner_math
            out.append(
                f'<div class="cfyb-block{variant}" data-label="{html.escape(label)}">'
                f'<div class="cfyb-block-body">\n{body}\n</div></div>'
            )
            continue

        # ---- raw HTML block (figures, embeds, demos) ----
        if stripped.startswith("<"):
            block = []
            while i < len(lines) and lines[i].strip():
                block.append(lines[i])
                i += 1
            out.append("\n".join(block))
            continue

        # ---- heading ----
        heading = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if heading:
            level = len(heading.group(1))
            text = heading.group(2).strip()
            anchor = slugify(text)
            out.append(
                f'<h{level} id="{anchor}">'
                f'<a class="heading-anchor" href="#{anchor}" aria-hidden="true">#</a>'
                f"{inline(text)}</h{level}>"
            )
            i += 1
            continue

        # ---- horizontal rule ----
        if re.fullmatch(r"(\*\s*){3,}|(-\s*){3,}", stripped):
            out.append("<hr>")
            i += 1
            continue

        # ---- blockquote ----
        if stripped.startswith(">"):
            block = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                block.append(lines[i].strip()[1:].strip())
                i += 1
            out.append(f"<blockquote><p>{inline(' '.join(block))}</p></blockquote>")
            continue

        # ---- table ----
        if stripped.startswith("|") and i + 1 < len(lines) and set(
            lines[i + 1].strip()
        ) <= set("|-: "):
            def cells(row: str) -> list[str]:
                return [c.strip() for c in row.strip().strip("|").split("|")]

            header = cells(lines[i])
            i += 2
            body_rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                body_rows.append(cells(lines[i]))
                i += 1
            head_html = "".join(f"<th>{inline(c)}</th>" for c in header)
            body_html = "".join(
                "<tr>" + "".join(f"<td>{inline(c)}</td>" for c in row) + "</tr>"
                for row in body_rows
            )
            out.append(
                '<div class="table-wrap"><table><thead><tr>'
                f"{head_html}</tr></thead><tbody>{body_html}</tbody></table></div>"
            )
            continue

        # ---- lists ----
        bullet = re.match(r"^[-*]\s+(.*)$", stripped)
        numbered = re.match(r"^\d+\.\s+(.*)$", stripped)
        if bullet or numbered:
            ordered = numbered is not None
            pattern = r"^\d+\.\s+(.*)$" if ordered else r"^[-*]\s+(.*)$"
            items: list[str] = []
            while i < len(lines) and lines[i].strip():
                match = re.match(pattern, lines[i].strip())
                if match:
                    items.append(match.group(1))
                elif items:
                    items[-1] += " " + lines[i].strip()  # lazy continuation
                else:
                    break
                i += 1
            tag = "ol" if ordered else "ul"
            body = "".join(f"<li>{inline(item)}</li>" for item in items)
            out.append(f'<{tag} class="prose-list">{body}</{tag}>')
            continue

        # ---- standalone image becomes a figure ----
        figure = re.fullmatch(
            r'!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)', stripped
        )
        if figure:
            alt, src, caption = figure.group(1), figure.group(2), figure.group(3)
            caption_html = (
                f"<figcaption>{inline(caption)}</figcaption>" if caption else ""
            )
            out.append(
                f'<figure><img src="{src}" alt="{html.escape(alt)}" '
                f"loading=\"lazy\">{caption_html}</figure>"
            )
            i += 1
            continue

        # ---- paragraph ----
        block = []
        while i < len(lines) and lines[i].strip():
            nxt = lines[i].strip()
            if (nxt.startswith(("```", "#", ">", "|", "$$")) or nxt == "{") and block:
                break
            block.append(nxt)
            i += 1
        out.append(f"<p>{inline(' '.join(block))}</p>")

    return "\n".join(out), uses_math


# ============================================================
# Posts
# ============================================================

def find_cover(slug: str) -> str:
    """Site-root-relative path to a post's index cover, or "" if it has none.

    A file at assets/covers/<slug>.<ext> is preferred, so covers can be swapped
    by dropping in an image. Falls back to assets/posts/<slug>/thumb.svg.
    """
    for ext in COVER_EXTENSIONS:
        candidate = COVERS_DIR / f"{slug}{ext}"
        if candidate.exists():
            return candidate.relative_to(ROOT).as_posix()

    fallback = Path("assets") / "posts" / slug / "thumb.svg"
    return fallback.as_posix() if (ROOT / fallback).exists() else ""


class Post:
    def __init__(self, path: Path) -> None:
        raw = path.read_text(encoding="utf-8")
        meta, body = parse_front_matter(raw)

        self.path = path
        self.meta = meta
        self.title = meta.get("title") or path.stem
        self.draft = bool(meta.get("draft", False))
        self.tags = meta.get("tags") or []
        # `live: true` marks a post that is kept up to date as new papers
        # appear. Its "last updated" date is `updated:` from the front matter,
        # or else the day the markdown file was last saved.
        self.live = bool(meta.get("live", False))
        updated_value = str(meta.get("updated", "")).strip()
        try:
            self.updated = dt.date.fromisoformat(updated_value)
        except ValueError:
            self.updated = dt.date.fromtimestamp(path.stat().st_mtime)

        date_value = str(meta.get("date", "")).strip()
        try:
            self.date = dt.date.fromisoformat(date_value)
        except ValueError:
            raise SystemExit(
                f"{path.name}: needs a front-matter `date: YYYY-MM-DD` "
                f"(got {date_value!r})"
            )

        # Optional: the date the paper under discussion was released. When present it
        # is what the card and the post header show, and what the index sorts on, so
        # the blog reads as a timeline of the literature rather than of the writing.
        paper_value = str(meta.get("paper", "")).strip()
        if paper_value:
            try:
                self.paper_date = dt.date.fromisoformat(paper_value)
            except ValueError:
                raise SystemExit(
                    f"{path.name}: `paper:` must be YYYY-MM-DD (got {paper_value!r})"
                )
        else:
            self.paper_date = None

        stem = re.sub(r"^\d{4}-\d{2}-\d{2}-", "", path.stem)
        self.slug = meta.get("slug") or slugify(stem)

        # Cover image, in order of precedence: an explicit `image:` path, a
        # drop-in file in assets/covers/, then the generated placeholder.
        self.image = str(meta.get("image") or "").strip()
        if not self.image:
            self.image = find_cover(self.slug)

        self.html, self.uses_math = render_markdown(body)

        # Count only what a reader reads: drop code blocks, LaTeX source (an
        # inline formula counts as one word), inline SVG, link URLs and tags.
        readable = re.sub(r"```.*?```", " ", body, flags=re.S)
        readable = re.sub(r"\$\$.*?\$\$", " ", readable, flags=re.S)
        readable = re.sub(r"\$[^$\n]+\$", " x ", readable)
        readable = re.sub(r"<svg.*?</svg>", " ", readable, flags=re.S)
        readable = re.sub(r"\]\([^)]*\)", "]", readable)
        readable = re.sub(r"<[^>]+>", " ", readable)
        words = len(re.findall(r"\b\w+\b", readable))
        self.reading_time = max(1, round(words / WORDS_PER_MINUTE))

        summary = meta.get("summary")
        if not summary:
            first = next(
                (p for p in body.split("\n\n") if p.strip() and not p.startswith(("#", "!", "`", "{", "}{", "<", "|"))),
                "",
            )
            summary = re.sub(r"\s+", " ", re.sub(r"[*`\[\]]", "", first)).strip()
            if len(summary) > 180:
                summary = summary[:177].rsplit(" ", 1)[0] + "…"
        self.summary = summary

    @property
    def url(self) -> str:
        return f"/writing/{self.slug}/"

    @property
    def shown_date(self) -> dt.date:
        """What the reader sees, and what the index sorts on. A live post
        shows a single date, its last update."""
        if self.live:
            return self.updated
        return self.paper_date or self.date

    @property
    def display_date(self) -> str:
        stamp = self.shown_date.strftime("%b %-d, %Y")
        if self.live:
            return f"Updated {stamp}"
        return f"paper · {stamp}" if self.paper_date else stamp


# ============================================================
# Rendering
# ============================================================

def load_template(name: str) -> str:
    return (TEMPLATE_DIR / name).read_text(encoding="utf-8")


def fill(template: str, values: dict) -> str:
    for key, value in values.items():
        template = template.replace("{{" + key + "}}", str(value))
    return template


KATEX = """  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" integrity="sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+" crossorigin="anonymous">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" integrity="sha384-7zkQWkzuo3B5mTepMUcHkMB5jZaolc2xDwL6VFqjFALcbeS9Ggm/Yr2r3Dy4lfFg" crossorigin="anonymous"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js" integrity="sha384-43gviWU0YVjaDtb/GhzOouOXtZMP/7XUzwPTstBeZFe/+rCMvRwr4yROQP43s0Xk" crossorigin="anonymous" onload="renderMathInElement(document.body, {delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}], throwOnError:false});"></script>"""


LABEL_SLOTS = 5
LABEL_COLOURS: dict[str, str] = {}


def assign_label_colours(posts: list[Post]) -> None:
    """Deal colours round-robin over the sorted label set.

    Hashing the name would keep a label's colour fixed forever, but with only
    a handful of tags it clusters badly — three tags landing on the same slot
    while two go unused. Dealing in order guarantees neighbours differ, which
    is the thing a reader actually notices.
    """
    tags = sorted({tag for post in posts for tag in post.tags})
    for index, tag in enumerate(tags):
        LABEL_COLOURS[tag] = f"label-{index % LABEL_SLOTS + 1}"


def label_class(tag: str) -> str:
    return LABEL_COLOURS.get(tag, "label-1")


def label_pills(tags: list[str]) -> str:
    return "".join(
        f'<span class="label {label_class(tag)}">{html.escape(tag)}</span>'
        for tag in tags
    )


def label_filter(posts: list[Post]) -> str:
    counts: dict[str, int] = {}
    for post in posts:
        for tag in post.tags:
            counts[tag] = counts.get(tag, 0) + 1

    if len(counts) < 2:
        return ""

    chips = [
        '<button class="label-chip is-active" type="button" data-label="*">'
        f'All<span class="label-count">{len(posts)}</span></button>'
    ]
    for tag in sorted(counts):
        chips.append(
            f'<button class="label-chip {label_class(tag)}" type="button" '
            f'data-label="{slugify(tag)}">{html.escape(tag)}'
            f'<span class="label-count">{counts[tag]}</span></button>'
        )

    return (
        '<div class="label-filter" role="group" aria-label="Filter posts by label">'
        + "".join(chips)
        + "</div>"
    )


def updated_stamp(post: Post, cls: str) -> str:
    """A separate 'Updated …' stamp. Unused for now: a live post's only date
    is already its last update (see Post.display_date)."""
    if not post.live or post.shown_date == post.updated:
        return ""
    shown = f"{post.updated:%b} {post.updated.day}, {post.updated.year}"
    return (
        f'<span class="{cls}">Updated '
        f'<time datetime="{post.updated.isoformat()}">{shown}</time></span>'
    )


def live_badge(post: Post, focusable: bool = True) -> str:
    """The pulsing LIVE pill for posts marked `live: true`, with a hover note."""
    if not post.live:
        return ""
    note = "I keep updating it as new papers come out."
    tab = ' tabindex="0"' if focusable else ""
    return (
        f'<span class="live-badge has-tip" data-tip="{html.escape(note)}"'
        f' aria-label="{html.escape(note)}"{tab}>'
        '<span class="live-dot" aria-hidden="true"></span>Live</span>'
    )


def external_links_new_tab(content: str) -> str:
    """Open every external link in a new tab, including links written as raw
    HTML (figure captions), which the markdown link rule never sees."""
    return re.sub(
        r'<a href="(https?://[^"]+)"(?![^>]*\btarget=)',
        r'<a href="\1" target="_blank" rel="noopener"',
        content,
    )


def build_post(post: Post, template: str) -> None:
    directory = OUT_DIR / post.slug
    directory.mkdir(parents=True, exist_ok=True)
    page = fill(
        template,
        {
            "root": "../../",
            "title": html.escape(post.title),
            "summary": html.escape(post.summary),
            # date_iso stays the publication date for the article metadata; the
            # visible byline shows the paper's date, so it needs its own stamp.
            "date_iso": post.date.isoformat(),
            "shown_iso": post.shown_date.isoformat(),
            "date_display": post.display_date,
            # Live posts keep growing, so they show no reading time.
            "reading_time": "" if post.live else f"· {post.reading_time} min read",
            # Labels are not shown on the page; they only drive the index filter.
            "tags": "",
            "live_badge": live_badge(post),
            "updated": updated_stamp(post, "post-updated"),
            "content": external_links_new_tab(post.html),
            "math": KATEX if post.uses_math else "",
            "url": SITE_URL + post.url,
            "site": SITE_URL,
            "author": AUTHOR,
            "blog_title": BLOG_TITLE,
            "draft_banner": (
                '<p class="draft-banner">Draft: not listed publicly.</p>'
                if post.draft
                else ""
            ),
        },
    )
    (directory / "index.html").write_text(page, encoding="utf-8")


def index_row(post: Post) -> str:
    draft_mark = (
        '<span class="label label-draft">draft</span>' if post.draft else ""
    )
    labels = " ".join(slugify(tag) for tag in post.tags)
    thumb = (
        f'\n          <span class="post-thumb" aria-hidden="true">'
        f'<img src="../{post.image}" alt="" loading="lazy" decoding="async"></span>'
        if post.image
        else ""
    )
    return f"""      <li class="post-row" data-labels="{labels}">
        <a class="post-link" href="{post.slug}/">{live_badge(post, focusable=False)}{thumb}
          <span class="post-body">
            <span class="post-line">
              <time class="post-date" datetime="{post.shown_date.isoformat()}">{post.display_date}</time>{updated_stamp(post, "post-updated")}
              {"" if post.live else f'<span class="post-read">{post.reading_time} min</span>'}
            </span>
            <span class="post-title">{html.escape(post.title)}</span>
            <span class="post-summary">{html.escape(post.summary)}</span>
            {f'<span class="post-meta">{draft_mark}</span>' if draft_mark else ""}
          </span>
        </a>
      </li>"""


def build_index(posts: list[Post], template: str) -> None:
    # Live posts are not blog posts in the usual sense: they keep changing.
    # The main list shows the regular posts; the live ones sit in their own
    # panel below it, closed by default.
    regular = [post for post in posts if not post.live]
    live = [post for post in posts if post.live]
    if posts:
        chips = label_filter(regular)
        # The label filter sits in a panel of its own, closed by default.
        listing = (
            (
                '<details class="filter-panel">\n'
                '      <summary class="filter-panel-head">'
                '<span class="filter-panel-title">Filter</span>'
                '<span class="live-panel-chevron" aria-hidden="true"></span>'
                "</summary>\n      "
                + chips
                + "\n    </details>\n    "
                if chips
                else ""
            )
            + '<ul class="post-list post-list-main">\n'
            + "\n".join(index_row(post) for post in regular)
            + "\n    </ul>"
            + '\n    <p class="filter-empty" hidden>No posts with that label.</p>'
        )
        if live:
            listing += (
                '\n    <details class="live-panel">\n'
                '      <summary class="live-panel-head">'
                '<span class="live-dot" aria-hidden="true"></span>'
                '<span class="live-panel-title">Live posts</span>'
                f'<span class="label-count">{len(live)}</span>'
                '<span class="live-panel-note">kept up to date as new papers come out</span>'
                '<span class="live-panel-chevron" aria-hidden="true"></span>'
                "</summary>\n"
                '      <ul class="post-list">\n'
                + "\n".join(index_row(post) for post in live)
                + "\n      </ul>\n    </details>"
            )
        count = f"{len(regular)} post{'s' if len(regular) != 1 else ''}"
    else:
        listing = (
            '<p class="post-empty">Nothing published yet. '
            "Drop a markdown file in <code>posts/</code> and run "
            "<code>python3 build.py</code>.</p>"
        )
        count = "no posts yet"

    page = fill(
        template,
        {
            "root": "../",
            "blog_title": BLOG_TITLE,
            "blog_description": html.escape(BLOG_DESCRIPTION),
            "count": count,
            "listing": listing,
            "url": f"{SITE_URL}/writing/",
            "site": SITE_URL,
        },
    )
    (OUT_DIR / "index.html").write_text(page, encoding="utf-8")


# ============================================================
# Entry point
# ============================================================

# Sources that should trigger a rebuild while --serve is running. assets/ is
# in here because a dropped-in cover changes the index even though no markdown
# did — see find_cover().
WATCH_DIRS = (POSTS_DIR, TEMPLATE_DIR, ROOT / "assets")
WATCH_FILES = (
    ROOT / "blog.css",
    ROOT / "blog.js",
    ROOT / "transitions.js",
    ROOT / "styles.css",
    ROOT / "theme.js",
    ROOT / "header.js",
    Path(__file__).resolve(),
)

# Bumped by the watcher; polled by the page. A change means "reload".
# Seeded from the clock so a restarted server also reads as a change.
_generation = [time.time_ns()]

RELOAD_SNIPPET = """<script>
/* dev-server only: injected by build.py --serve, never written to disk */
(function () {
  var seen = null;
  setInterval(function () {
    fetch("/__reload", { cache: "no-store" })
      .then(function (r) { return r.text(); })
      .then(function (value) {
        if (seen === null) { seen = value; return; }
        if (value !== seen) { location.reload(); }
      })
      .catch(function () {});
  }, 500);
})();
</script>"""


def _fingerprint() -> dict:
    """mtime + size for every watched file. Cheap enough to poll on a site
    this size, and needs no third-party watcher library."""
    stamps = {}
    for directory in WATCH_DIRS:
        if not directory.exists():
            continue
        for path in directory.rglob("*"):
            if path.is_file() and not path.name.startswith("."):
                try:
                    stat = path.stat()
                except OSError:
                    continue
                stamps[str(path)] = (stat.st_mtime_ns, stat.st_size)
    for path in WATCH_FILES:
        if path.exists():
            stat = path.stat()
            stamps[str(path)] = (stat.st_mtime_ns, stat.st_size)
    return stamps


def _restart_if_builder_changed(previous: dict, current: dict) -> None:
    """The running server holds the old build.py in memory, so an edit to
    the builder itself only takes effect after a restart. Re-exec in place —
    unless the new file does not even compile, in which case keep serving."""
    me = str(Path(__file__).resolve())
    if previous.get(me) == current.get(me):
        return
    try:
        compile(Path(me).read_text(encoding="utf-8"), me, "exec")
    except SyntaxError as error:
        print(f"build.py has a syntax error, not restarting: {error}", file=sys.stderr)
        return
    print("\nbuild.py changed — restarting the server\n")
    os.environ["BUILD_PY_RESTARTED"] = "1"  # don't open another browser tab
    sys.stdout.flush()
    os.execv(sys.executable, [sys.executable, me, *sys.argv[1:]])


def _watch(drafts: bool) -> None:
    previous = _fingerprint()
    while True:
        time.sleep(0.4)
        current = _fingerprint()
        if current == previous:
            continue
        _restart_if_builder_changed(previous, current)
        previous = current
        try:
            build_all(drafts)
        except SystemExit as error:
            # A malformed post raises SystemExit from Post(); keep the server
            # up and let the next save fix it.
            print(f"build failed: {error}", file=sys.stderr)
        except Exception as error:  # noqa: BLE001 - the watcher must not die
            print(f"build failed: {error!r}", file=sys.stderr)
        else:
            _generation[0] += 1


def serve(port: int, drafts: bool = False) -> None:
    """Preview locally over http, which is the only way clean URLs like
    /writing/ resolve to index.html — opening files directly gives you a
    directory listing instead.

    Rebuilds on every edit and reloads the open tab. The reload script is
    injected into responses only, so writing/ on disk stays exactly what
    gets committed."""
    import http.server
    import socketserver
    import threading
    import webbrowser

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT), **kwargs)

        def log_message(self, fmt, *args):
            if "/__reload" not in (self.path or ""):
                super().log_message(fmt, *args)

        def do_GET(self):
            if self.path.startswith("/__reload"):
                payload = str(_generation[0]).encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/plain")
                self.send_header("Content-Length", str(len(payload)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(payload)
                return

            target = Path(self.translate_path(self.path))
            if target.is_dir():
                target = target / "index.html"
            if target.suffix == ".html" and target.is_file():
                body = target.read_bytes()
                marker = b"</body>"
                if marker in body:
                    body = body.replace(
                        marker, RELOAD_SNIPPET.encode() + marker, 1
                    )
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)
                return

            super().do_GET()

    socketserver.TCPServer.allow_reuse_address = True

    try:
        with socketserver.TCPServer(("", port), Handler) as httpd:
            url = f"http://localhost:{port}/"
            print(f"\nserving {ROOT.name}/ at {url}")
            print(f"        writing at {url}writing/")
            print("watching posts/, templates/, assets/ and the css/js — "
                  "save a file and the page reloads itself")
            print("ctrl-c to stop\n")
            threading.Thread(target=_watch, args=(drafts,), daemon=True).start()
            if not os.environ.get("BUILD_PY_RESTARTED"):
                webbrowser.open(url)
            httpd.serve_forever()
    except OSError as error:
        print(f"could not bind port {port}: {error}", file=sys.stderr)
        print(f"try: python3 build.py --serve --port {port + 1}", file=sys.stderr)
    except KeyboardInterrupt:
        print("\nstopped")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the writing section.")
    parser.add_argument("--drafts", action="store_true", help="include drafts")
    parser.add_argument("--clean", action="store_true", help="wipe writing/ first")
    parser.add_argument(
        "--serve", action="store_true", help="build, then preview on localhost"
    )
    parser.add_argument("--port", type=int, default=8000, help="port for --serve")
    args = parser.parse_args()

    if not POSTS_DIR.exists():
        print(f"no posts/ directory at {POSTS_DIR}", file=sys.stderr)
        return 1

    if args.clean and OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)

    build_all(args.drafts)

    if args.serve:
        serve(args.port, args.drafts)
    return 0


def build_all(drafts: bool) -> None:
    """One full build. Split out from main() so --serve can call it again on
    every edit without re-parsing arguments."""
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    posts = [Post(p) for p in sorted(POSTS_DIR.glob("*.md"))]
    posts.sort(key=lambda p: p.shown_date, reverse=True)

    visible = [p for p in posts if not p.draft or drafts]

    # Deal colours over the posts that actually ship — a hidden draft's tags must
    # not shift the colours of published ones.
    assign_label_colours(visible)

    post_template = load_template("post.html")
    index_template = load_template("index.html")

    for post in visible:
        build_post(post, post_template)

    build_index(visible, index_template)

    # writing/ is generated output, so reconcile it: a post that was deleted or
    # flipped to draft must stop being reachable at its old URL.
    wanted = {post.slug for post in visible}
    pruned = 0
    for entry in OUT_DIR.iterdir():
        if entry.is_dir() and entry.name not in wanted:
            shutil.rmtree(entry)
            pruned += 1

    skipped = len(posts) - len(visible)
    print(f"built {len(visible)} page(s) → {OUT_DIR.relative_to(ROOT)}/")
    if pruned:
        print(f"removed {pruned} stale page(s)")
    if skipped:
        print(f"skipped {skipped} draft(s) — use --drafts to preview them")
    if not HAS_PYGMENTS:
        print("note: pygments not installed, code blocks are unhighlighted")


if __name__ == "__main__":
    raise SystemExit(main())
