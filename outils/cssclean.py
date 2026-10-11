"""Nettoyage sûr du CSS de Cocoon : supprime uniquement les déclarations qui sont
forcément écrasées plus loin (même contexte @media/@supports, même sélecteur, même
propriété, priorité au moins égale), puis les règles et blocs devenus vides.
Usage : python3 cssclean.py entree.html sortie.html"""
import re, sys

RISKY = re.compile(r"color-mix\(|dvh|svh|lvh|clamp\(|min\(|max\(|env\(|-webkit-|-moz-|light-dark\(|oklch|@|:has\(", re.I)
KEEP_RAW = ("@keyframes", "@-webkit-keyframes", "@font-face", "@page", "@property", "@counter-style")
GROUP = ("@media", "@supports", "@container", "@layer", "@document")

def strip_comments(css):
    out, i, n = [], 0, len(css)
    while i < n:
        c = css[i]
        if c in "\"'":
            j = i + 1
            while j < n and css[j] != c:
                j += 2 if css[j] == "\\" else 1
            out.append(css[i:j + 1]); i = j + 1
        elif css.startswith("/*", i):
            j = css.find("*/", i + 2); i = n if j < 0 else j + 2
        else:
            out.append(c); i += 1
    return "".join(out)

def find_block_end(css, i):
    """css[i] == '{' ; renvoie l'index du '}' correspondant."""
    depth, n = 0, len(css)
    while i < n:
        c = css[i]
        if c in "\"'":
            j = i + 1
            while j < n and css[j] != c:
                j += 2 if css[j] == "\\" else 1
            i = j + 1; continue
        if c == "{": depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0: return i
        i += 1
    raise ValueError("bloc non fermé")

def parse(css):
    items, i, n = [], 0, len(css)
    while i < n:
        while i < n and css[i] in " \t\r\n": i += 1
        if i >= n: break
        # prélude jusqu'à { ou ; (hors chaînes/parenthèses)
        j, depth = i, 0
        while j < n:
            c = css[j]
            if c in "\"'":
                k = j + 1
                while k < n and css[k] != c:
                    k += 2 if css[k] == "\\" else 1
                j = k + 1; continue
            if c == "(": depth += 1
            elif c == ")": depth -= 1
            elif depth == 0 and c in "{;}": break
            j += 1
        if j >= n: break
        pre = css[i:j].strip()
        if css[j] == ";":
            items.append(("raw", pre + ";")); i = j + 1; continue
        if css[j] == "}":
            i = j + 1; continue
        end = find_block_end(css, j)
        body = css[j + 1:end]
        low = pre.lower()
        if low.startswith(GROUP):
            items.append(("group", pre, parse(body)))
        elif low.startswith("@") or "{" in body:
            items.append(("raw", pre + "{" + body + "}"))
        else:
            items.append(("rule", pre, split_decls(body)))
        i = end + 1
    return items

def split_top(s, sep):
    parts, depth, cur, i, n = [], 0, [], 0, len(s)
    while i < n:
        c = s[i]
        if c in "\"'":
            k = i + 1
            while k < n and s[k] != c:
                k += 2 if s[k] == "\\" else 1
            cur.append(s[i:k + 1]); i = k + 1; continue
        if c in "([": depth += 1
        elif c in ")]": depth -= 1
        if c == sep and depth == 0:
            parts.append("".join(cur)); cur = []
        else:
            cur.append(c)
        i += 1
    parts.append("".join(cur))
    return parts

def split_decls(body):
    out = []
    for d in split_top(body, ";"):
        d = d.strip()
        if not d: continue
        if ":" not in d:
            out.append({"raw": d, "prop": None}); continue
        p, v = d.split(":", 1)
        imp = bool(re.search(r"!\s*important\s*$", v, re.I))
        out.append({"raw": p.strip() + ":" + v.strip(), "prop": p.strip().lower(), "val": v.strip(), "imp": imp})
    return out

def norm_sel(sel):
    return [re.sub(r"\s+", " ", s).strip() for s in split_top(sel, ",") if s.strip()]

def ctx_key(ctx):
    return tuple(re.sub(r"\s+", " ", c).strip().lower() for c in ctx)

def collect(items, ctx, flat):
    for it in items:
        if it[0] == "rule": flat.append((ctx_key(ctx), it))
        elif it[0] == "group": collect(it[2], ctx + [it[1]], flat)

def prune(items):
    flat = []; collect(items, [], flat)
    seen = {}  # (ctx, sel, prop) -> True si la déclaration plus loin est !important
    removed = 0
    for ctx, rule in reversed(flat):
        sels = norm_sel(rule[1])
        keep = []
        decls = rule[2]
        # dans la règle elle-même, on ne touche à rien (repli volontaire possible) : on traite seulement par rapport aux règles suivantes
        later_in_rule = {}
        for d in decls:
            if d["prop"]: later_in_rule[d["prop"]] = later_in_rule.get(d["prop"], 0) + 1
        new = []
        for d in decls:
            p = d["prop"]
            if p and all((ctx, s, p) in seen and (seen[(ctx, s, p)] or not d["imp"]) for s in sels):
                removed += 1; continue
            new.append(d)
        # enregistre ce que cette règle définit, pour les règles précédentes
        if re.search(r"::?-(webkit|moz|ms)-", rule[1]): new_ok = False
        else: new_ok = True
        for d in (new if new_ok else []):
            p = d["prop"]
            if not p or RISKY.search(d.get("val", "")): continue
            for s in sels:
                k = (ctx, s, p)
                seen[k] = seen.get(k, False) or d["imp"]
        rule[2][:] = new
    return removed

def clean(items):
    out = []
    for it in items:
        if it[0] == "rule":
            if it[2]: out.append(it)
        elif it[0] == "group":
            kids = clean(it[2])
            if kids: out.append(("group", it[1], kids))
        else:
            out.append(it)
    return out

def emit(items, ind=""):
    lines = []
    for it in items:
        if it[0] == "rule":
            lines.append(ind + re.sub(r"\s*\n\s*", " ", it[1]) + "{" + ";".join(d["raw"] for d in it[2]) + "}")
        elif it[0] == "group":
            lines.append(ind + it[1] + "{")
            lines.append(emit(it[2], ind + "  "))
            lines.append(ind + "}")
        else:
            lines.append(ind + it[1])
    return "\n".join(lines)

def process_css(css):
    items = parse(strip_comments(css))
    n = prune(items)
    return "\n" + emit(clean(items)) + "\n", n

if __name__ == "__main__":
    html = open(sys.argv[1]).read()
    total = [0]
    def rep(m):
        css, n = process_css(m.group(2)); total[0] += n
        return m.group(1) + css + m.group(3)
    out = re.sub(r"(<style[^>]*>)(.*?)(</style>)", rep, html, count=1, flags=re.S)  # seulement la feuille principale (les autres sont dans du JS)
    open(sys.argv[2], "w").write(out)
    print("déclarations écrasées supprimées :", total[0], "| taille", len(html), "->", len(out))
