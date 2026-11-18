# Family app

A phone-first family PWA: shared calendar, weekly plan, meals and recipes, to-dos, shopping, notes, wishlists and a health log. Data stays on the phone first and can sync over Firebase. No analytics or trackers.

**Live:** https://looier.github.io/family-app/

Install on Android (Chrome): open the live URL → ⋮ → **Add to Home screen / Install app**. Sign in with Google (Settings) so both phones share the same family data. Firestore rules must be published in the Firebase console before sync will be allowed (see `firestore.rules` and SETUP-SYNC.md).

## Run on Windows PC (PowerShell)
PowerShell blocks `npm.ps1`, so use `npm.cmd`:
```powershell
cd "C:\Users\thinu\Grok bot\family-app"
npm.cmd install
npm.cmd run dev -- --host
```
It prints a `Network:` address (e.g. `http://192.168.1.50:5180`). Open that on the phones on the same Wi-Fi.
Allow Node through Windows Firewall when asked (Private networks).

Production build: `npm.cmd run build` → static files in `dist/` (`npm.cmd run preview -- --host` to serve them).

## Install on Android (S24/S26 Ultra)
Open **https://looier.github.io/family-app/** in Chrome → ⋮ menu → **Add to Home screen / Install app**. Then Settings → Sign in with Google.

## Using it
**＋ Log**: tap child → mood → pain (location chips appear if pain > 0) → rash / constipated → meds → notes → Save. Multiple entries per day are fine; last child is remembered. "+ Add med" adds permanently (synced).
**Day**: entries for a day (‹ › or date picker), delete with ✕. **Week**: mood/pain chart, rash & constipation days, med counts, pain-location frequency; ‹ › weeks.
Sample data for local testing (dev server only): open `…/#demo` on a fresh browser.

## Data & privacy
Local-first IndexedDB; optional Firebase Firestore sync (`src/sync-firebase.ts`) behind a `SyncAdapter` interface (`src/sync.ts`) so Supabase/self-hosted can replace it. No analytics, no trackers, no third-party scripts.


## v2.0 (family-v2.0 / 0.2.0) – all sections live
- **Home** – Today dashboard: today's events, tonight's supper, due/overdue to-dos, shopping count, big "Log health" button, module tiles. Set **"This phone is Thinus / Juazel"** at the bottom of Home (stored on the phone; drives the "Mine" to-do filter).
- **Calendar** – month + agenda views; events with date, all-day/time, who (colour-coded Family/Thinus/Juazel/Phoebe/Jocelyn), repeat weekly/monthly/yearly, notes. Google/Outlook calendar sync is planned for later.
- **Meals** – Mon–Sun supper planner (tick "Plan lunches too" for lunch), recipe book (ingredients with qty, steps, tags, servings, small photo), "Add to shopping" from a recipe or the whole week.
- **To-dos** – shared lists, assignee, due date, repeat daily/weekly/monthly (ticking advances the due date), filters All/Mine/Overdue.
- **Shopping** – Checkers / Woolworths / Clicks (+ your own lists), grouped by aisle, quick-add with autocomplete from past items, ticked items drop to "In the trolley", "Clear ticked".
- Health data and its storage are unchanged. Still no analytics or trackers.

## v2.1 (family-v2.1 / 0.2.1) – visual refresh
Warm design system (CSS variables, light-first + cosy dark mode), SVG icon nav with active pill, floating bottom tabs, person colours + initial avatars everywhere, gradient Home tiles, emoji mood faces, colour-gradient pain scale, gradient-filled charts, recipe placeholder art, aisle icons, animated ticks (swipe right or tap to tick), friendly empty states, new app icon + splash. Respects reduced-motion. No data or sync changes.


## v2.2 (family-v2.2 / 0.2.2) – weekly plan, family health, owners

- **Weekly Plan** (new main tab) – sit-down planner for the week (Mon–Sun, previous/next). Each day: supper (picked from recipes or typed; **same meal plan as Meals**, not a second copy) plus who’s cooking; kids’ activities; play dates (with whom, where, time); school drop-off and pick-up (who’s doing each); and a notes line. Week-level **This week** notes and goals, plus **Copy last week**. **Plan mode** is one big swipeable day at a time. **Summary** is a compact, printable week view. Activities, play dates and school runs also appear on the Calendar and on Home’s Today list (merged at display time, not stored twice).
- **Health** is now per family member, with a person switcher on Log / Day / Week / Month. Default members: **Thinus, Juazel, Phoebe and Jocelyn**. Add, rename or remove people in **Settings**. Existing health entries keep the person already stored on them. Kid-friendly log: mood, pain (with Nothing reported), sleep, temperature/fever, tummy ache, nausea, rash, cough, runny nose, tired, emotional, appetite, medicine with dose and time, notes. Home shows a **Today card per kid**.
- **To-dos** have **Assigned to**: Thinus, Juazel, Both, or Unassigned (coloured avatar chips). Filters: All, Mine, the other person’s, Overdue. **Who am I on this phone** lives in Settings (and still on Home until you pick). Shopping items can optionally be assigned the same way.
- **Settings** (gear): who am I, family members, and sync. Still no analytics or trackers. Older records stay compatible (new fields are optional).


## v2.3 (family-v2.3 / 0.2.3) – shopping categories and a calmer app

- **Shopping categories** (synced, editable): Food / Groceries, Household, Maintenance / Hardware, Christmas & Gifts, Kids & School, Other. Each has an icon and colour. You can add, rename, reorder, archive or hide them. Existing items are sorted into a category automatically (ambiguous ones go to Other). Store lists (Checkers, Woolworths, Clicks) are still there as “Shop at”, tucked behind More details on an item.
- Each category is a **collapsible** section with a remaining-item count. Collapse / expand and **Hide from my view** are saved on that phone only, so Juazel can keep Maintenance and Christmas collapsed or hidden without changing Thinus’s phone. Filter chips at the top: All, or one category.
- **Quick add**: one input, plus a category picker that remembers the last one you used, and suggestions from past items. Qty, note and assignee sit behind a tap. Bought items move to a collapsed **In trolley / bought** area with **Clear bought**.
- Home shows remaining counts only for categories that are not hidden on that phone.
- Shopping items can be **sorted within each category** by name, date added, or your own order (up / down). Categories themselves can be reordered in Manage. **＋ New category** is also on the quick-add category picker, so you can make a list (e.g. Holiday) without leaving the add flow.
- **Recipe categories** (synced): Quick, Kids’ favourites, Braai, Everyday, Other — plus any you add. The recipe book can be filtered and grouped by category, and **＋ New category** is on the chips and on the recipe form. Older free-text tags (quick, kids, braai) still match the built-in names.
- **Quick add**: a ＋ button on every main screen opens a small sheet. Pick Shopping item, To-do, Calendar event, Note or Wishlist item; fill in a name plus at most one or two essentials (category, date/time, who) and save with Enter. The last type and category you used are remembered.
- **Notes** (new, under More): shared title + text, can be pinned, synced with the rest of the family data.
- **Wishlists** (new, under More and Quick add): a list per family member. Each wish has a name, occasion (Birthday / Christmas / Anytime / custom), optional link, price, notes and priority. Marking something “Bought by ___” hides it from the person whose list it is, based on **Who am I on this phone**, so the gift stays a surprise. Sections collapse by person and by occasion.
- **Calendar export**: each saved event has **Add to my Google Calendar** (opens a Google Calendar template link) and **Download .ics**. Two-way Google / Outlook calendar sync is not in this version; it is a later option.
- Family members default to **Thinus, Juazel, Phoebe and Jocelyn** (the kids). A leftover “Karri” member with no health logs is removed; existing Phoebe and Jocelyn health entries stay attached to them.
- **A calmer layout.** Bottom navigation has five tabs: Home, Plan, Calendar, Shop, More. Health, Meals & recipes, To-dos, Notes, Wishlists and Settings live in the More sheet. To-dos are still one tap from Home via the Today card. Home itself is a short Today view (events, supper, a single line per kid unless something is flagged, due to-dos with yours first, shopping counts), capped at about three rows with See all. Forms show the essentials first, with advanced fields behind More details. The floating ＋ is Quick add, on every main screen. Still no analytics or trackers; older records stay compatible.

## v2.3.1 (family-v2.3.1 / 0.2.4) – Android back button

- The Android system back button and back gesture (Chrome and the installed PWA on Galaxy S24/S26 Ultra) now go to the previous screen. Every screen, tab, detail view, form, Quick Add sheet and the More grid pushes a history entry (`#/…` routes). Back closes a sheet or form first, then returns through the screens you opened. Scroll position is restored.
- In-app back arrows and Cancel / Done / close buttons call the same `history.back()` path, so they behave like the system button.
- At Home (the first screen in the stack) back is not trapped — the app can close, or Chrome can leave the page. Unsaved form changes ask “Discard unsaved changes?”; canceling the prompt keeps you on the form.
- Refresh and deep links work on any route (for example `#/wishes`, `#/shopping/manage`, `#/plan/plan`). The service worker still serves the app shell; no pathname rewrites are required.
