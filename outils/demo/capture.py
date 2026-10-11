"""Capture les différences app → démo dans demo_patch.json (à relancer seulement si on change volontairement une partie propre à la démo)."""
import difflib, json, sys
app=open(sys.argv[1]).read().split("\n"); demo=open(sys.argv[2]).read().split("\n")
hunks=[]
for tag,i1,i2,j1,j2 in difflib.SequenceMatcher(None,app,demo,autojunk=False).get_opcodes():
    if tag=="equal": continue
    hunks.append({"before":app[i1-1] if i1>0 else None,"old":app[i1:i2],"new":demo[j1:j2],"after":app[i2] if i2<len(app) else None})
json.dump(hunks,open(sys.argv[3],"w"),ensure_ascii=False,indent=1)
print(len(hunks),"différences enregistrées")
