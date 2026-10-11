"""Fabrique la démo à partir de l'app : python3 make_demo.py app.html demo.html
Applique demo_patch.json (les seules parties propres à la démo). Échoue bruyamment si l'app a changé à un de ces endroits."""
import json, os, sys
here=os.path.dirname(os.path.abspath(__file__))
app=open(sys.argv[1]).read(); hunks=json.load(open(os.path.join(here,"demo_patch.json")))
def block(h,key):
    parts=([h["before"]] if h["before"] is not None else [])+h[key]+([h["after"]] if h["after"] is not None else [])
    return "\n".join(parts)
out=app
for n,h in enumerate(hunks):
    a,b=block(h,"old"),block(h,"new")
    c=out.count(a)
    if c!=1: sys.exit("Différence démo n°%d introuvable ou ambiguë (%d) — autour de : %s" % (n+1,c,(h["before"] or "")[:120]))
    out=out.replace(a,b)
open(sys.argv[2],"w").write(out)
print("démo fabriquée :",len(hunks),"différences appliquées")
