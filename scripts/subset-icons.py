"""Build step: shrink the Material Symbols icon font to just the icons the app uses (about 25 KB instead of 1.4 MB).

Reads the whole font (scripts/fonts/), finds every icon name written in src/, keeps only those icons and the FILL axis
(filled hearts and stars), and writes public/fonts/material-symbols-subset.woff2.
Run it again after using a new icon name:   python scripts/subset-icons.py     (needs: pip install fonttools brotli)

An icon is written by its NAME (for example "location_on"). In the font several names can point at one drawing
(location_on is drawn by the glyph "place"), so names are matched through the font's own name-to-drawing rules, not by glyph name.
"""
import glob, os, re
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

ROOT = (os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + os.sep).replace(os.sep, '/')
FULL = ROOT + 'scripts/fonts/material-symbols-full.woff2'  # the whole font, kept out of public/ so it is never served
OUT = ROOT + 'public/fonts/material-symbols-subset.woff2'


def name_to_glyph(font):
    """Every icon name the font understands -> the glyph that draws it (from its ligature rules)."""
    cmap = font.getBestCmap(); rev = {}
    for cp, g in cmap.items():
        rev.setdefault(g, cp)
    out = {}
    for lk in font['GSUB'].table.LookupList.Lookup:
        for st in lk.SubTable:
            st = getattr(st, 'ExtSubTable', st)
            if hasattr(st, 'ligatures'):
                for first, ligs in st.ligatures.items():
                    for lig in ligs:
                        try:
                            out[''.join(chr(rev[g]) for g in [first] + list(lig.Component)).lower()] = lig.LigGlyph
                        except KeyError:
                            pass
    return out


font = TTFont(FULL)
icons = name_to_glyph(font)  # name -> glyph

used = set()
for f in glob.glob(ROOT + 'src/**/*', recursive=True):
    if not f.endswith(('.ts', '.tsx', '.css', '.js', '.json')):
        continue
    text = open(f, encoding='utf-8', errors='ignore').read()
    for m in re.finditer(r"""["'`]([a-z0-9_]+)["'`]""", text):  # every quoted word that is an icon name
        if m.group(1) in icons:
            used.add(m.group(1))
# icons the app picks from data at run time (product and service pictures, shop kinds)
used |= {n for n in ('checkroom', 'dry_cleaning', 'local_cafe', 'bakery_dining', 'chair', 'sell', 'diamond', 'steps', 'self_improvement', 'inventory_2', 'storefront', 'celebration', 'pending', 'radio_button_unchecked', 'check_circle', 'category', 'more_horiz') if n in icons}
glyphs = sorted({icons[n] for n in used})
print(len(used), 'icon names used, drawn by', len(glyphs), 'glyphs')

opts = subset.Options()
opts.layout_features = ['*']
opts.notdef_outline = True
opts.glyph_names = True
opts.layout_closure = False  # do NOT pull in every icon that can be spelled from the kept letters
opts.hinting = False
opts.drop_tables += ['STAT', 'gasp', 'prep']
sub = subset.Subsetter(opts)
sub.populate(glyphs=glyphs, unicodes=[ord(c) for c in 'abcdefghijklmnopqrstuvwxyz0123456789_'])
sub.subset(font)
inst = instancer.instantiateVariableFont(font, {'opsz': 24}, inplace=False)  # keep FILL free
inst.flavor = 'woff2'
inst.save(OUT)
print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB')

# check: every used name must still turn into an icon in the small font
have = name_to_glyph(TTFont(OUT))
missing = sorted(n for n in used if n not in have)
print('icon names that would show blank:', missing if missing else 'none')
open(os.path.join(os.environ.get('TEMP', '.'), 'subset_icons.json'), 'w').write(__import__('json').dumps(sorted(have)))
