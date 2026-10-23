# RateCalc – Freelance Hourly Rate Calculator

Free, static, browser-only calculator that turns a freelancer's income goal into the hourly / daily / weekly / monthly rate they actually need to charge — after taxes, business expenses, a profit buffer and all the hours they can't bill.

**Live URL:** https://__SITE_URL__/ (placeholder — replace after deploy)

Primary keyword: *freelance hourly rate calculator*.

## Features

Free
- Live recalculation on every input: take-home goal, currency (USD/EUR/GBP/CAD/AUD/INR), expenses, tax rate, buffer margin, billable hours/day (slider + number), days/week, weeks off.
- Derived non-billable share of an 8-hour day.
- Outputs: minimum hourly rate, daily, weekly, monthly revenue target, annual gross revenue, billable hours/year, "real" hourly (take-home ÷ all hours worked).
- Hand-built inline SVG breakdown bar: take-home / taxes / expenses / buffer.
- Project quote helper: estimated hours × rate × rush multiplier → fixed price + value-based range (×1.2–1.5).
- Copy summary, Share link (inputs encoded in the query string, read on load), Reset.
- Inputs persist in `localStorage`; URL params override.
- 1 saved rate profile.

Pro (one-time, lifetime; gated with `isPro()`)
- Unlimited named rate profiles (load / delete).
- Printable rate report (PDF via `window.print()` with dedicated print CSS).
- Compare two profiles side-by-side.

Also: dark/light theme, SEO content + FAQ with JSON-LD (`WebApplication` + `FAQPage`), privacy + terms pages, AdSense slots, optional affiliate partner section.

## Formula

```
preTax   = income / (1 − taxRate)
taxes    = preTax − income
base     = preTax + expenses
buffer   = base × margin
gross    = base + buffer
billable = hoursPerDay × daysPerWeek × (52 − weeksOff)
hourly   = gross / billable
```

## Run locally

```bash
npx serve .
```

Then open the printed URL (usually http://localhost:3000). No build step, no dependencies.

## Deploy

Deploy the folder as-is to Vercel (`vercel.json` enables clean URLs and security headers). After the first deploy, replace the `__SITE_URL__` placeholder with the real domain:

```bash
grep -rl "__SITE_URL__" . | xargs sed -i 's/__SITE_URL__/ratecalc.example.com/g'
```

## Monetization setup

All switches live in `config.js`.

1. **Google AdSense** – once the site is approved, set `ADSENSE_CLIENT: "ca-pub-XXXXXXXXXXXXXXXX"`. The three `.ad-slot` placeholders (`sidebar-1`, `sidebar-2`, `below-tool`) are filled automatically by `monetize.js`. Optionally create matching ad units and put their IDs in each slot's `data-slot`.
2. **Pro checkout** – create a one-time product (Lemon Squeezy, Gumroad or a Stripe Payment Link) and set `PRO_CHECKOUT_URL`. Set `PRO_PRICE` to the displayed price. The license gate in `monetize.js` accepts any key of 8+ characters — replace `activateLicense` with a real license check (e.g. Lemon Squeezy License API) before going live.
3. **Google Analytics 4** – set `GA_ID: "G-XXXXXXXXXX"`. Events tracked: `tool_view`, `copy`, `share`, `reset`, `save_profile`, `load_profile`, `compare`, `report`, `pro_click`, `begin_checkout`, `affiliate_click`.
4. **Affiliate links** – fill `AFFILIATE_LINKS.wise`, `.payoneer`, `.deel` with your referral URLs. Partner cards render only for non-empty links (`rel="sponsored noopener"`); the whole "Get paid faster, worldwide" section stays hidden if all are empty.

## File structure

```
index.html     main tool page (SEO complete, JSON-LD, FAQ, printable report block)
styles.css     _shared/base.css + app-specific rules
app.js         calculator logic, profiles, compare, report, partners
monetize.js    shared theme / toast / GA / AdSense / Pro helpers (copy of _shared)
config.js      window.APP_CONFIG
privacy.html   privacy policy
terms.html     terms of use
robots.txt, sitemap.xml, vercel.json, favicon.svg, .gitignore
```

## Disclaimer

Outputs are estimates and not financial or tax advice.
