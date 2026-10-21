"""Check prototype interactions only; this does not test the production app."""

import functools
import http.server
import json
from pathlib import Path
import threading

from playwright.sync_api import expect, sync_playwright
from export_review import QuietHandler


ROOT = Path(__file__).resolve().parent


def main():
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}/"
    checks = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path="/usr/bin/chromium",
                                         args=["--no-sandbox"])
            page = browser.new_page(viewport={"width": 390, "height": 844},
                                     color_scheme="light")
            requests = []
            page.on("request", lambda request: requests.append(request.url))
            page.goto(base + "review.html#home")
            expect(page.locator("html")).to_have_attribute("data-theme", "light")
            checks.append("Uses OS light preference initially")
            page.locator("[data-theme-toggle]").click()
            expect(page.locator("html")).to_have_attribute("data-theme", "dark")
            page.reload()
            expect(page.locator("html")).to_have_attribute("data-theme", "dark")
            checks.append("Manual dark override persists on reload")

            page.locator('.bottom-nav a[href="#explore"]').click()
            expect(page.locator("h1")).to_have_text("Explore adverts")
            checks.append("Mobile navigation opens Explore")
            trigger = page.locator('[data-open="filters"]').first
            trigger.click()
            expect(page.locator('[role="dialog"]')).to_be_visible()
            assert page.locator("#app").evaluate("e => e.inert")
            page.keyboard.press("Tab")
            assert page.locator(".sheet").evaluate("e => e.contains(document.activeElement)")
            page.keyboard.press("Escape")
            expect(page.locator('[role="dialog"]')).to_have_count(0)
            assert trigger.evaluate("e => e === document.activeElement")
            checks.append("Filter sheet blocks background, contains focus and restores trigger on Escape")

            page.goto(base + "review.html#detail")
            expect(page.locator(".bottom-nav")).to_have_count(0)
            expect(page.locator(".contact-bar")).to_be_visible()
            checks.append("Mobile detail uses contact bar without bottom tabs")
            page.locator('[data-open="report"]').click()
            page.locator('[data-demo="Design preview only. No report was sent."]').click()
            expect(page.locator("#notice")).to_contain_text("No report was sent")
            page.keyboard.press("Escape")
            checks.append("Report action explicitly stays in preview mode")

            page.goto(base + "review.html#post")
            page.locator('[data-step="2"]').click()
            expect(page.locator(".form-panel h2")).to_have_text("Photos & contact")
            page.locator('[data-step="3"]').click()
            expect(page.locator(".form-panel h2")).to_have_text("Looking good?")
            page.locator('[data-step="2"]').click()
            expect(page.locator(".form-panel h2")).to_have_text("Photos & contact")
            checks.append("All three posting steps and Back navigation work")

            page.goto(base + "review.html#adverts")
            page.locator('[data-ad-filter="pending"]').click()
            expect(page.locator(".advert-row")).to_have_count(1)
            page.locator('[data-open="manage"]').click()
            expect(page.locator('[role="dialog"]')).not_to_contain_text("Mark as sold")
            page.keyboard.press("Escape")
            checks.append("Status filters work and pending management excludes mark-sold")

            page.goto(base + "review.html#admin")
            page.locator('[data-open="admin-menu"]').click()
            expect(page.locator('[role="dialog"] .admin-links')).to_be_visible()
            page.keyboard.press("Escape")
            checks.append("Mobile administration opens its menu")
            assert all(url.startswith(base) or url.startswith("data:") for url in requests)
            checks.append("No external network, API or provider requests")
            browser.close()
        (ROOT / "interaction-checks.json").write_text(json.dumps({
            "artifact": "Design-review prototype only", "passed": checks,
        }, indent=2) + "\n")
        print(json.dumps({"checksPassed": len(checks), "checks": checks}, indent=2))
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
