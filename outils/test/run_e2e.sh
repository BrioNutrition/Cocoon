cd "$(dirname "$0")/web"
for t in test/e2e*.py test/perf_entry.py; do
  pkill -f "m http[.]server 876" 2>/dev/null; sleep 0.5
  python3 ../waitport.py "$t"
  echo "=== $t"
  timeout 240 python3 "$t" > /tmp/claude-0/-home-claude/61c834a4-69f7-5166-946e-0ff240ec20f0/scratchpad/last_t.txt 2>&1; rc=$?
  grep "GATEFAIL" /tmp/claude-0/-home-claude/61c834a4-69f7-5166-946e-0ff240ec20f0/scratchpad/last_t.txt | cut -c1-400
  grep -v "agent-proxy\|fonts.google\|For details\|DeprecationWarning\|utcnow" /tmp/claude-0/-home-claude/61c834a4-69f7-5166-946e-0ff240ec20f0/scratchpad/last_t.txt | tail -5
  echo "exit=$rc"
done
pkill -f "m http[.]server 876" 2>/dev/null
echo DONE
