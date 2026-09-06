
import json, sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]/"web"/"locales"
en=json.loads((root/"en.json").read_text(encoding="utf-8"))
ok=True
for code in ["fr","es","ewe","kab"]:
    d=json.loads((root/f"{code}.json").read_text(encoding="utf-8"))
    missing=[k for k in en if k not in d]
    if missing:
        ok=False
        print(code,"MISSING",len(missing))
    else:
        print(code,"OK",len(en),"keys")
sys.exit(0 if ok else 1)
