# Set up shared sync (Google Firebase – free Spark plan)

The live app is at **https://looier.github.io/family-app/**. Firebase is already configured in `src/firebase-config.ts` (project `family-app-71ea8`, family space `devilliers`). `looier.github.io` is an authorized Auth domain.

Until the Firestore rules are published, the app will show a **sign in** banner and Google sign-in will work, but reads and writes will be denied. That is expected.


1. Go to https://console.firebase.google.com → **Add project** → name it `family-app` → you can switch **Google Analytics OFF** (we don't use it) → Create.
2. **Build → Firestore Database → Create database** → choose location `europe-west` (or `africa-south1` if offered) → start in **production mode**.
3. **Build → Authentication → Get started** → Sign-in method → enable **Google** (and/or **Email/Password**).
   Under Authentication → Settings → **Authorized domains**, add the address you open the app from (e.g. `192.168.1.50` for the PC on Wi-Fi, or your hosting domain).
4. **Firestore → Rules** → paste the contents of `firestore.rules` (replace `YOUR_GMAIL@gmail.com` and `PARTNER_GMAIL@gmail.com` with the two family Gmail addresses) and **Publish**.
   (Google accounts are always verified. For email/password accounts you'd need email verification — Google sign-in is simplest.)
5. The web app config is already in `src/firebase-config.ts`. Keep `FAMILY_ID` (`devilliers`) the same on both phones.
6. On each phone open https://looier.github.io/family-app/ → **More → Settings** → **Sign in with Google**. Shared data appears on both phones; offline changes upload when back online.

### Important: HTTPS
Android only installs PWAs / allows Google sign-in popups reliably on **https** or `localhost`. Use the live GitHub Pages site (https://looier.github.io/family-app/). A plain `http://192.168.x.x` LAN address works in the browser but won't install as an app. Sign-in uses a popup, and falls back to a redirect only if the popup is blocked.


## v2 collections
New data lives under `families/devilliers/`: `events`, `recipes`, `mealPlan`, `todoLists`, `todos`, `shopLists`, `shopItems` (alongside `healthEntries` and `config/meds`). The existing rule `match /families/{fid}/{document=**}` already covers them, so **no rule change is needed**. If you wrote narrower rules, make sure all of these collections are allowed for both emails.


## v2.2 collections
Added under `families/devilliers/`: `members`, `weekPlans`, `dayPlans`. Supper “who’s cooking” is an optional `cook` field on existing `mealPlan` documents. To-do / shopping `who` values may now be `Thinus`, `Juazel`, `Both` or `Unassigned` (older `Family` still means Both). Health entries may include optional `memberId`, `fever`, `temp`, `tummy`, `cough`, `runnyNose`, `appetite` and `medDoses` (name, dose, time) — older entries without them still load. The existing rule `match /families/{fid}/{document=**}` already covers the new collections, so **no rule change is needed**.


## v2.3 collections
Added under `families/devilliers/`: `shopCats` (shared shopping categories), `recipeCats` (shared recipe / meal categories), `notes` (shared notes) and `wishes` (wishlist items). Shopping items may include optional `groupId` (the category), `note`, `order` and `createdAt`. Older items without `groupId` are sorted into a category on the phone (aisle and name are used as a guide; anything unclear goes to Other). Recipe `tags` stay on the recipe document and are now the category names (older tags such as “quick” or “kids” are mapped to the built-in names). Notes have `title`, `text` and optional `pinned`. Wishes have `who`, `name`, `occasion`, and optional `link`, `price`, `notes`, `priority` and `boughtBy`. Collapse / expand, “Hide from my view”, shopping sort order and “Who am I on this phone” are **not** synced — they live in that phone’s local storage (so a bought gift stays hidden on the list owner’s phone). Default family members are Thinus, Juazel, Phoebe and Jocelyn. The existing rule `match /families/{fid}/{document=**}` already covers the new collections, so **no rule change is needed**. Two-way Google / Outlook calendar sync is not included yet; events can be exported with a Google Calendar template link or a .ics file.
