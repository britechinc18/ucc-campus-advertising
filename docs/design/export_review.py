"""Reproduce the offline design-review pack; no application/API access required."""

import argparse
import functools
import http.server
import json
from pathlib import Path
import tempfile
import threading
import zipfile

import fitz
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parent
SCREENS = [
    "home", "explore", "detail", "businesses", "business", "post",
    "adverts", "admin", "queue", "review", "empty",
]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def text(page, x, y, value, size=12, color=(0.09, 0.15, 0.14), bold=False):
    page.insert_text((x, y), value, fontsize=size,
                     fontname="hebo" if bold else "helv", color=color)


def new_page(doc, title, subtitle):
    page = doc.new_page(width=1120, height=820)
    page.draw_rect(page.rect, color=None, fill=(0.967, 0.973, 0.961))
    text(page, 40, 30, "UCC MED MARKET / PHASE 3 VISUAL REVIEW", 9,
         color=(0.07, 0.43, 0.38), bold=True)
    text(page, 40, 64, title, 25, bold=True)
    text(page, 40, 87, subtitle, 11, color=(0.33, 0.4, 0.37))
    page.draw_line((40, 109), (1080, 109), color=(0.86, 0.9, 0.87))
    text(page, 40, 798, "Fictional design content only. No live adverts, accounts, metrics or transactions.", 9)
    text(page, 1035, 798, f"{len(doc):02d}", 10)
    return page


def insert_image(page, path, rect):
    page.insert_image(fitz.Rect(*rect), filename=str(path), keep_proportion=True)


def build_pdf(images):
    doc = fitz.open()
    cover = new_page(doc, "A marketplace that feels made for campus.",
                     "UCC Med Market / Primary reference: Campus Market Complete Design System V2")
    insert_image(cover, images["home-mobile-light"], (50, 140, 325, 735))
    insert_image(cover, images["home-mobile-dark"], (365, 140, 640, 735))
    text(cover, 65, 760, "LIGHT / 390px", 10, bold=True)
    text(cover, 380, 760, "DARK / 390px", 10, bold=True)
    for y, label, color in [
        (165, "Warm canvas / F7F8F5", (247/255, 248/255, 245/255)),
        (235, "Campus teal / 126E61", (18/255, 110/255, 97/255)),
        (305, "Ink / 172724", (23/255, 39/255, 36/255)),
        (375, "Dark canvas / 101C1B", (16/255, 28/255, 27/255)),
        (445, "Dark accent / 93D9C5", (147/255, 217/255, 197/255)),
    ]:
        cover.draw_rect(fitz.Rect(700, y, 745, y+36), fill=color,
                        color=(0.86, 0.9, 0.87))
        text(cover, 760, y+23, label, 12)
    for y, line in enumerate([
        "Search first. Fresh listings next.",
        "Two columns on phones.",
        "Clear prices and direct contact.",
        "One system across every dashboard.",
        "Review these visuals before UI coding.",
    ]):
        text(cover, 700, 550+y*28, line, 13, bold=y == 0)

    spreads = [
        ("Home / desktop", "Compact discovery, four-column listings and a bounded content width.", ["home-desktop-light"]),
        ("Browse and contact / mobile", "Explore filters open in a sheet. The detail contact bar replaces bottom tabs.", ["explore-mobile-light", "detail-mobile-light"]),
        ("Explore / desktop", "Persistent sidebar filters, useful sorting and consistent listing cards.", ["explore-desktop-light"]),
        ("Advert detail / desktop", "Photography, price, advertiser context and contact actions lead the page.", ["detail-desktop-light"]),
        ("Posting / three guided steps", "Details -> Photos & contact -> Review & submit. Publication always requires approval.", ["post-mobile-light", "post-2-mobile-light", "post-3-mobile-light"]),
        ("Posting / desktop", "One focused form, clear progress and a useful posting-allowance sidebar.", ["post-desktop-light"]),
        ("My adverts / mobile and desktop", "Status-led management; counts in this review pack are fictional.", ["adverts-desktop-light", "adverts-mobile-light"]),
        ("Campus businesses / mobile", "Approved profiles, direct contact and listings. Initials are the logo fallback.", ["businesses-mobile-light", "business-mobile-light"]),
        ("Business profile / desktop", "A useful business identity without decorative banners or invented verification.", ["business-desktop-light"]),
        ("Administration / desktop", "Operational overview, real-data contracts and a consistent moderation shell.", ["admin-desktop-light"]),
        ("Moderation / mobile", "Stacked review rows, full submission content, then the decision panel further down the page.", ["queue-mobile-light", "review-mobile-light", "review-decision-mobile-light"]),
        ("Advert review / desktop", "Full submission content and advertiser context beside a reasoned moderation decision.", ["review-desktop-light"]),
        ("Dark theme / desktop", "Rich ink surfaces, readable metadata, mint accents and unchanged product photography.", ["home-desktop-dark"]),
        ("Dark theme / advertiser and admin", "The same tokens and status hierarchy extend across both dashboards.", ["adverts-mobile-dark", "admin-mobile-dark", "detail-mobile-dark"]),
        ("Empty and unavailable states", "Browsing remains useful even when there are no results or sign-in is unavailable.", ["empty-desktop-light", "empty-mobile-light"]),
    ]
    for title, subtitle, keys in spreads:
        page = new_page(doc, title, subtitle)
        if len(keys) == 1:
            insert_image(page, images[keys[0]], (65, 125, 1055, 775))
        elif len(keys) == 2 and "desktop" in keys[0]:
            insert_image(page, images[keys[0]], (40, 160, 800, 725))
            insert_image(page, images[keys[1]], (825, 125, 1100, 775))
        elif len(keys) == 2:
            insert_image(page, images[keys[0]], (215, 125, 505, 765))
            insert_image(page, images[keys[1]], (615, 125, 905, 765))
        else:
            for index, key in enumerate(keys):
                insert_image(page, images[key], (65+index*350, 125, 355+index*350, 765))
    doc.set_metadata({"title": "UCC Med Market - Phase 3 Design Review",
                      "subject": "Mobile, desktop and dark-theme mockups. Fictional design content only.",
                      "author": "UCC Campus Advertising Platform"})
    doc.save(ROOT / "UCC-Med-Market-Design-Review.pdf", garbage=4, deflate=True)
    doc.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chromium", default="/usr/bin/chromium")
    parser.add_argument("--screenshots", type=Path)
    args = parser.parse_args()
    output = args.screenshots or Path(tempfile.mkdtemp(prefix="ucc-design-review-"))
    output.mkdir(parents=True, exist_ok=True)
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_port}/review.html"
    images = {}
    checks = []
    errors = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=args.chromium,
                                         args=["--no-sandbox"])
            for theme in ["light", "dark"]:
                for width in [320, 390, 768, 1024, 1440]:
                    height = 844 if width < 600 else 1000
                    context = browser.new_context(viewport={"width": width, "height": height},
                                                  color_scheme=theme)
                    page = context.new_page()
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    for screen in SCREENS + ["post-2", "post-3"]:
                        route = "post" if screen.startswith("post-") else screen
                        page.goto(f"{url}#{route}", wait_until="load")
                        page.evaluate("document.body.classList.add('captured')")
                        if route == "post":
                            page.evaluate("postStep = 1; render()")
                        if screen == "post-2":
                            page.click('[data-step="2"]')
                        if screen == "post-3":
                            page.click('[data-step="2"]')
                            page.click('[data-step="3"]')
                        page.evaluate("window.scrollTo(0,0)")
                        result = page.evaluate("""() => ({
                            horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
                            brokenImages: [...document.images].filter(i=>!i.complete||i.naturalWidth===0).length,
                            width: innerWidth,
                            scrollWidth: document.documentElement.scrollWidth,
                            h1: document.querySelector('main h1')?.textContent.trim() || ''
                        })""")
                        checks.append({"theme":theme,"screen":screen,**result})
                        assert not result["horizontalOverflow"], checks[-1]
                        assert result["brokenImages"] == 0, checks[-1]
                        assert result["h1"], checks[-1]
                        if width in [390, 1440]:
                            device = "mobile" if width == 390 else "desktop"
                            key = f"{screen}-{device}-{theme}"
                            path = output / f"{key}.jpg"
                            page.screenshot(path=str(path), type="jpeg", quality=88)
                            images[key] = path
                            if screen == "review" and width == 390 and theme == "light":
                                page.locator('.review-decision').scroll_into_view_if_needed()
                                decision = output / "review-decision-mobile-light.jpg"
                                page.screenshot(path=str(decision), type="jpeg", quality=88)
                                images["review-decision-mobile-light"] = decision
                                page.evaluate("window.scrollTo(0,0)")
                            if screen == "home" and theme == "light":
                                page.screenshot(path=str(ROOT / f"home-{device}.png"))
                    context.close()
            browser.close()
        assert not errors, errors
        (ROOT / "checks.json").write_text(json.dumps({
            "artifact":"Design-review prototype only; not production/frontend integration tests",
            "browser":"Chromium", "layoutCases":len(checks), "pageErrors":errors,
            "checks":checks,
        }, indent=2)+"\n")
        build_pdf(images)
        with zipfile.ZipFile(ROOT / "ucc-med-market-prototype.zip", "w",
                             compression=zipfile.ZIP_DEFLATED) as archive:
            for name in ["review.html", "review.css", "review.js", "photos.js"]:
                archive.write(ROOT / name, name)
            archive.writestr("README.txt", (
                "UCC Med Market - visual-review prototype\n\n"
                "Open review.html in a modern browser. No installation, server or account is needed.\n"
                "Use the screen selector, navigation links and moon/sun theme button.\n"
                "All listings, people, businesses and counts are fictional design content.\n"
                "This prototype makes no API calls and cannot save, publish or contact anyone.\n"
                "The PDF pack and implementation blueprint are in the repository's docs/design directory.\n"
                "Sample photography: Unsplash. Never seed these examples into production.\n"
            ))
        print(json.dumps({"layoutCases":len(checks),"pageErrors":len(errors),
                          "screenshots":str(output), "pdf":str(ROOT / "UCC-Med-Market-Design-Review.pdf")}))
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
