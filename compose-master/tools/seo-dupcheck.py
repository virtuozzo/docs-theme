# Usage: hugo --minify -D -d /tmp/out && python3 seo-dupcheck.py /tmp/out [N_examples]
# Reports duplicate <title> / meta description among indexable pages, per language.
import os, re, sys, html, collections, json
root = sys.argv[1]
LANGS = {"de-de","es-es","ja-jp","pt-br","tr-tr","zh-cn"}
rx = {k: re.compile(p, re.S|re.I) for k,p in {
 "title": r"<title>(.*?)</title>",
 "desc": r'<meta name="?description"? content=(?:"(.*?)"|([^ >]*))',
 "robots": r'<meta name="?robots"? content=(?:"(.*?)"|([^ >]*))',
 "canon": r'<link rel="?canonical"? href=(?:"(.*?)"|([^ >]*))'}.items()}
pages = []
for d, _, fs in os.walk(root):
    if "index.html" not in fs: continue
    p = os.path.join(d, "index.html")
    s = open(p, encoding="utf-8", errors="ignore").read(200000)
    m = {k: (html.unescape(next(x for x in r.search(s).groups() if x is not None)).strip() if r.search(s) else "") for k, r in rx.items()}
    if not m["title"] or "noindex" in m["robots"]: continue
    rel = os.path.relpath(d, root).replace(os.sep, "/")
    first = rel.split("/")[0]
    m["lang"] = first if first in LANGS else "en"
    m["path"] = rel; m["size"] = os.path.getsize(p)
    pages.append(m)
out = {"pages": len(pages)}
for key in ("title", "desc"):
    g = collections.defaultdict(list)
    for m in pages:
        if m[key]: g[(m["lang"], m[key])].append(m["path"])
    dups = {k: v for k, v in g.items() if len(v) > 1}
    out[key + "_groups"] = len(dups); out[key + "_pages"] = sum(len(v) for v in dups.values())
    out[key + "_examples"] = [[k[0], k[1], v[:4]] for k, v in sorted(dups.items(), key=lambda x: -len(x[1]))[:int(sys.argv[2]) if len(sys.argv) > 2 else 8]]
out["empty_desc"] = sum(1 for m in pages if not m["desc"])
out["avg_html_kb"] = round(sum(m["size"] for m in pages) / max(1, len(pages)) / 1024)
out["title_suffix_virtuozzo"] = sum(1 for m in pages if m["title"].endswith("| Virtuozzo"))
out["title_no_suffix"] = sum(1 for m in pages if "|" not in m["title"])
import os as _o
if _o.environ.get("DUMP"): json.dump(pages, open(_o.environ["DUMP"],"w"), ensure_ascii=False)
print(json.dumps(out, ensure_ascii=False, indent=1))
