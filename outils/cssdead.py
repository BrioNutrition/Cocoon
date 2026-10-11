"""Repère (et supprime avec --apply) les règles CSS dont un sélecteur vise une classe/un id qui n'existe nulle part ailleurs dans le fichier (HTML ou JS)."""
import re, sys
sys.path.insert(0, __import__("os").path.dirname(__file__))
from cssclean import parse, strip_comments, split_top, emit, clean
html = open(sys.argv[1]).read()
m = re.search(r"(<style[^>]*>)(.*?)(</style>)", html, re.S)
import os
here = os.path.dirname(os.path.abspath(__file__))
extra = "".join(open(os.path.join(here, f)).read() for f in ("build.py", "src/cocoon-runtime.js") if os.path.exists(os.path.join(here, f)))
rest = html[:m.start(2)] + html[m.end(2):] + extra
dyn = set(re.findall(r'["\'`]([a-zA-Z][\w-]*-)["\'`]\s*\+', rest)) | set(re.findall(r'["\'`]([a-zA-Z][\w-]*-)\$\{', rest))
cache = {}
def exists(tok):
    if tok in cache: return cache[tok]
    ok = bool(re.search(r"(?<![\w-])" + re.escape(tok) + r"(?![\w-])", rest)) or any(tok.startswith(p) for p in dyn)
    cache[tok] = ok; return ok
def dead_selector(sel):
    sel = re.sub(r":(not|is|where|has)\((?:[^()]|\([^()]*\))*\)", "", sel)  # ignore les négations / tests
    sel = re.sub(r"\[[^\]]*\]", "", sel)
    for t in re.findall(r"[.#](-?[_a-zA-Z][\w-]*)", sel):
        if not exists(t): return t
    return None
dead = []
def walk(items):
    for it in items:
        if it[0] == "rule":
            sels = [s.strip() for s in split_top(it[1], ",") if s.strip()]
            why = [dead_selector(s) for s in sels]
            if all(why):
                dead.append((it[1][:90], why[0])); it[2][:] = []
        elif it[0] == "group": walk(it[2])
items = parse(strip_comments(m.group(2))); walk(items)
if "-v" in sys.argv:
    for d in dead: print("mort :", d[1], "|", d[0])
print(len(dead), "règles mortes")
if "--apply" in sys.argv:
    out = html[:m.start(2)] + "\n" + emit(clean(items)) + "\n" + html[m.end(2):]
    open(sys.argv[2], "w").write(out); print("taille", len(html), "->", len(out))
