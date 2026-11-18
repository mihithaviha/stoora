# Fonts

Self-hosted, so the design looks the same offline and loads without calling Google.

| File | Font | Used for |
| --- | --- | --- |
| `bricolage-*.woff2` | Bricolage Grotesque (600 to 800, variable) | Headings and big numbers |
| `lexend-*.woff2` | Lexend (400 to 700, variable) | Body text, buttons, forms |
| `fraunces-*.woff2` | Fraunces (900) | The "stoora.in" wordmark |
| `material-symbols-subset.woff2` | Material Symbols Rounded, only the icons the app uses (about 30 KB instead of 1.4 MB) | Every icon |

`latin` covers English; `latin-ext` carries the rupee sign (₹). All four families are open source (SIL Open Font License / Apache 2.0).
The `@font-face` rules are in `src/styles/fonts.css`.

**Adding a new icon:** the icon font only holds the icons the app uses. After using a new icon name anywhere in `src/`, run `python scripts/subset-icons.py` (needs `pip install fonttools brotli`). It reads every icon name in the source and rebuilds `material-symbols-subset.woff2` from the full font in `scripts/fonts/`. An icon missing from the font shows as blank space, not as its name.
