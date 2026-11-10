"""Check public HTTP discovery signals; no forms, assistant sessions or leads are sent."""
import argparse
import json
import re
import subprocess
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

ORIGIN = "https://csshvac.com"


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.meta, self.canonicals, self.graph, self.text = {}, [], [], []
        self.script = None
        self.block = 0
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta":
            self.meta[a.get("name", a.get("property"))] = a.get("content")
        if tag == "link" and a.get("rel") == "canonical":
            self.canonicals.append(a.get("href"))
        if tag == "script":
            self.block += 1
            self.script = "" if a.get("type") == "application/ld+json" else None
        if tag == "style":
            self.block += 1

    def handle_endtag(self, tag):
        if tag == "script" and self.script is not None:
            data = json.loads(self.script)
            self.graph.extend(data.get("@graph", [data]))
            self.script = None
        if tag in ("script", "style"):
            self.block = max(0, self.block - 1)

    def handle_data(self, data):
        if self.script is not None:
            self.script += data
        if not self.block:
            self.text.append(data)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--directory", type=Path)
    ap.add_argument("--output", type=Path)
    args = ap.parse_args()

    def get(path, head=False):
        if args.directory:
            f = args.directory / path.lstrip("/")
            if path.endswith("/"):
                f /= "index.html"
            return f.read_text(encoding="utf-8") if not head else ""
        cmd = ["curl.exe", "-fsSI" if head else "-fsS", "--max-time", "25", ORIGIN + path]
        return subprocess.run(cmd, check=True, capture_output=True).stdout.decode("utf-8")

    checks = []
    sitemap = get("/sitemap.xml")
    paths = [n.text.removeprefix(ORIGIN) for n in ET.fromstring(sitemap).iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
    assert len(paths) == len(set(paths)) == 12
    assert all(p.startswith("/") and "?" not in p and p not in ("/assistant/", "/privacy/") for p in paths)
    for path in paths:
        page = Page(get(path))
        assert page.canonicals == [ORIGIN + path], path
        assert page.meta.get("description") and page.meta.get("og:image"), path
        assert page.meta.get("twitter:title") == page.meta.get("og:title"), path
        assert "noindex" not in page.meta.get("robots", ""), path
        types = [n["@type"] for n in page.graph]
        assert all(t in types for t in ("HVACBusiness", "WebSite", "WebPage")), path
        if path != "/":
            assert "BreadcrumbList" in types, path
        if path.startswith("/services/"):
            assert "Service" in types, path
        visible = re.sub(r"\s+", " ", "".join(page.text))
        for faq in [n for n in page.graph if n["@type"] == "FAQPage"]:
            for q in faq["mainEntity"]:
                assert re.sub(r"\s+", " ", q["name"]) in visible, path
                assert re.sub(r"\s+", " ", q["acceptedAnswer"]["text"]) in visible, path
        assert not re.search(r"aggregateRating|reviewRating|streetAddress|priceCurrency", json.dumps(page.graph))
        checks.append({"path": path, "passed": True, "schema_types": types})
    robots = get("/robots.txt")
    assert "Disallow: /\n" not in robots and f"Sitemap: {ORIGIN}/sitemap.xml" in robots
    guide = get("/llms.txt")
    assert "Online requests are not confirmed appointments" in guide
    for p in paths:
        assert f"]({ORIGIN}{p})" in guide, p
    for p in ("/assistant/", "/privacy/"):
        assert "noindex" in Page(get(p)).meta.get("robots", ""), p
    if not args.directory:
        for p in ("/robots.txt", "/sitemap.xml", "/llms.txt"):
            assert re.search(r"HTTP/\S+ 200", get(p, head=True)), p
    result = {"origin": ORIGIN, "mode": "local" if args.directory else "production", "pages_passed": len(checks), "checks": checks, "discovery_files_passed": True, "private_pages_noindex": True, "indexing_confirmed": False}
    if args.output:
        args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in result.items() if k != "checks"}, indent=2))


if __name__ == "__main__":
    main()
