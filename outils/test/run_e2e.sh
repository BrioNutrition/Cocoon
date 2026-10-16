#!/bin/bash
# Lance toute la suite de tests (depuis n'importe où). Une ligne « exit=0 » par test réussi, « DONE » à la fin.
cd "$(dirname "$0")/.."; mkdir -p /tmp/dk
for t in test/e2e*.py test/perf_entry.py; do
  pkill -f "m http[.]server 87" 2>/dev/null; sleep 0.5
  python3 test/waitport.py "$t"
  echo "=== $t"
  timeout 240 python3 "$t" > /tmp/cocoon_last_test.txt 2>&1; rc=$?
  grep -v "agent-proxy\|fonts.google\|For details\|DeprecationWarning\|utcnow" /tmp/cocoon_last_test.txt | tail -5
  echo "exit=$rc"
done
pkill -f "m http[.]server 87" 2>/dev/null; echo DONE
