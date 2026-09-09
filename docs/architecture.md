# The architecture of Pendolare

This document gives the decisions of the project. `CLAUDE.md` gives the rules of
the work. This file is in ASD-STE100 Simplified Technical English.

## 1. The product

### 1.1 What Pendolare does

A person selects a station of departure and a station of arrival. Pendolare
shows the first five trains that depart from the first station and stop at the
second station. Each train holds the number, the destination, the hour of
departure, the delay, the platform, the mark of the departure and the hour of
arrival.

The surface of the answer is a departure board with split-flap displays. A
person in a station reads such a board, and this application gives the same
image.

### 1.2 What Pendolare does not do

Pendolare has no account and no database. It holds no value of a person.

Pendolare sells no ticket and it plans no journey with a change of train. It
reads one board of one station.

Pendolare is not the official source. RFI is the official source, and the
application shows the moment of the data of RFI.

## 2. The stack and the deployment

### 2.1 The stack

- Node 22 LTS for the scripts, TypeScript, Zod
- Client: Vite, React 19, TanStack Query
- User interface: Tailwind CSS v4
- Server: Hono, on Cloudflare Workers
- Tests: Vitest. Lint and format: Biome.

The project has one `package.json`. The project has no router: the application
holds one page.

Write the extension `.ts` in a relative import: `import { x } from "./x.ts"`.
The scripts run with `node --experimental-strip-types`, and Node resolves the
path exactly as you write it.

### 2.2 One origin: the Worker and the static files

The application has one origin. The address `/api/*` goes to the Worker, and
each other address takes a static file of `dist/client`.

The Worker is necessary. The client of the browser cannot read the monitor of
RFI: the answer of RFI holds no header of CORS, and its content is HTML and not
JSON. The Worker reads that page, and it gives JSON to the client.

`wrangler.jsonc` holds `assets.run_worker_first` with `/api/*`. Thus the Worker
does not start for the page, for the font and for the file of JavaScript.

The plugin `@cloudflare/vite-plugin` makes one build for the client and for the
Worker, and it runs the Worker in workerd during the development. Thus `/api`
answers with the same code in development and in production.

The root of Vite is the root of the repository, and `index.html` is there. The
plugin reads `wrangler.jsonc` from the root of Vite: with a root of `src/client`
the plugin finds no configuration, and it makes a Worker of the static files
only. The client stays in `src/client`.

### 2.3 The build and the release

`npm run build` writes two directories:

- `dist/client`, with the page, the file of JavaScript, the CSS and the font;
- `dist/pendolare`, with the Worker and a configuration of Wrangler for the
  deployment.

`npm run deploy` makes the build and then calls `wrangler deploy`.

## 3. The data of RFI

### 3.1 The source

The source is the monitor of arrivals and departures of RFI:

```
https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor?Arrivals=False&PlaceId=3163
```

RFI supplies no API and no file of data. The page of `rfi.it` holds that address
in a frame. RFI writes that the data of the page can hold three minutes of delay
against the boards of the station.

The application makes no other call: it reads one page for one answer.

### 3.2 The page of the monitor

The page holds a table with one row for each train. `src/shared/monitor.ts`
reads it. These parts of the page hold the data:

| Part | Content |
|---|---|
| `<h1 class="nomestazione">` | The official name of the station. |
| `aggiornato il … alle ore …` | The moment of the data. |
| `<tr name="treno">` | One train. |
| `<td id="RTreno">` | The number of the train. |
| `<td id="RStazione">` | The last station of the train. |
| `<td id="ROrario">` | The hour of departure of the timetable. |
| `<td id="RRitardo">` | The delay. |
| `<td id="RBinario">` | The platform. |
| `<td id="RExLampeggio">` | The mark of the departure, as `alt="Si"`. |
| `Fermate successive` | The stops after this station, with the hour. |

Three rules of that page are not evident:

1. The cell of the delay holds four values: an empty cell, a quantity of
   minutes, `RITARDO` and `Cancellato`. `RITARDO` says that the train is late
   and that RFI gives no quantity. A negative quantity is an advance.
2. The list of the stops holds an hour with one digit for the hours: a stop at
   `(3:23)` in the night. The name of a station can hold a hyphen, and the
   hyphen is also the separator of the list.
3. The expression of one cell must stop at the first `</td>`. The cell after the
   mark of the departure holds `alt="Maggiori informazioni treno"`, thus an
   expression with no limit gives the mark to each train.

### 3.3 The names of the stations

#### 3.3.1 The catalogue

The catalogue is `src/data/stations.json`. Each station holds the `placeId` of
RFI, the official name and the short names.

The script `scripts/scan-stations.ts` makes that file. The script reads two
sources:

1. the list of the page `iechub.rfi.it/arrivipartenze`, in a `select`;
2. the title of the page of the monitor, for each identifier of a range.

The two sources are necessary. The list of the page holds no MILANO CENTRALE,
and the monitor of that station answers at the identifier 1728. The range holds
no STABIO, because that station holds the identifier 85099. The name of the
title wins, because that name is the name that the station shows.

#### 3.3.2 The short names

The list of the stops holds a short name: `TORINO PORTA SUSA` becomes `TORINO
P.S.` The application must find the station of arrival in that list, thus it
needs those names.

One station holds more than one short name. The short name comes from the
operator of the train, not from the station:

| Official name | Short names |
|---|---|
| `TORINO PORTA SUSA` | `TORINO P.S.`, `TORINO P. SUSA` |
| `MILANO ROGOREDO` | `MI ROGOREDO` |
| `REGGIO EMILIA AV MEDIOPADANA` | `REGGIO AV M.`, `REGGIO E. AV MP.` |
| `MILANO GRECO PIRELLI` | `MILANO G. P.`, `MI.GRECO PIRELLI`, `MILANO GRECO` |
| `RHO FIERA` | `RHO FIERA MILANO` |

The last row shows that a short name can be longer than the official name.
Therefore the file holds a list of names, not a rule of abbreviation.

RFI supplies no table of those names. The script `scripts/build-aliases.ts`
makes one with a join:

1. the monitor of arrivals of a station gives the train and the hour of arrival
   at that station, with the official name of the title;
2. the list of the stops of the same train, on the monitor of departures of
   another station, gives the short name of that station with the same hour.

The hour of the list is the hour of arrival, thus the key `(train, hour)` gives
the two names of the same station. A key that gives two stations goes away: two
trains of the country can hold the same number at the same minute. A short name
of two stations also goes away, because such a name gives a train that stops at
another station.

The board of a station holds 40 trains only. Therefore one run finds the
stations of that moment of the day. The script keeps the names of the catalogue
and it adds the new ones, thus a second run at another hour gives more stations.

### 3.4 The selection of the trains

`src/shared/journey.ts` reads the board and it gives the trains that stop at the
station of arrival. A train enters the answer with one of these two rules:

1. the list of the stops holds a name of the station of arrival;
2. the last station of the train is the station of arrival. The column of the
   destination holds the official name, thus this rule finds the station also
   with a short name that the catalogue does not hold. The train then receives
   the hour of the last stop.

The board holds a maximum of 40 rows. At a large station those rows are two
hours, and at a small station they are five hours. Therefore the answer can hold
fewer than five trains, and it can be empty while a train exists after the last
row. The application shows the quantity of the rows of the board with the empty
answer.

A train that RFI cancels stays in the answer, with its state. A person who waits
for that train must read it.

### 3.5 The hour of arrival

The list of the stops gives the hour of the timetable. The application adds the
delay of the departure to that hour, and it shows the result.

That value is a calculation, not a measure of RFI. The delay changes along the
line: the train 9323 held 55 minutes at Torino Porta Susa and 45 minutes at
Milano Porta Garibaldi. The application writes that rule below the board, and
the amber marks the hour of a train with a delay.

A train with a delay that RFI does not measure receives the hour of the
timetable, because the application has no quantity to add. A train that RFI
cancels receives no hour: that train arrives at no hour.

### 3.6 The cache

The Worker writes the answer of RFI in the cache of the data centre, with the
Cache API and a time of 45 seconds. One answer then serves each pair of stations
that starts at the same station: RFI receives one call for each station, and not
one call for each person.

The option `cf: { cacheTtl }` of `fetch` is not sufficient. RFI answers with
`Cache-Control: private`, and that value stops the cache of Cloudflare.
Therefore the Worker writes the cache itself: it removes each header of the
answer that stops the cache, and it writes its own value.

The answer of `/api/journeys` holds 45 seconds of cache, and the answer of
`/api/stations` holds one hour: the catalogue changes with a new build only.

The client reads the board again each minute.

## 4. The API

| Address | Answer |
|---|---|
| `GET /api/stations?q=<text>&limit=<n>` | The stations that match the text. |
| `GET /api/journeys?from=<id>&to=<id>&limit=<n>` | The first trains from one station to the other. |

`src/shared/api.ts` holds the shape of the two answers. The Worker and the
client read that file, thus the two hold the same shape.

The Worker holds the catalogue and it makes the search. Thus the browser takes
no file of 2400 stations, and the catalogue has one place only.

## 5. The user interface

The interface is Italian. `src/client/text.ts` holds each Italian text. The head
of `index.html` is the one exception: a static file imports no module, and a
crawler of an assistant reads no JavaScript, thus the title and the description
must be there.

### 5.1 The components

- `src/client/components/ui/` holds the standard components of shadcn/ui. Do not
  change those files.
- `src/client/components/board/` holds the components of the theme. Those
  components use the components of `ui/`.
- `src/client/styles/theme.css` holds each token of the theme, with the
  directive `@theme` of Tailwind CSS v4.

The project has no `jsdom` and no library for the tests of a component.
Therefore the logic of the client stays in `src/client/lib/`, with a test file.
A file `.tsx` then holds the elements and the state only.

### 5.2 The split-flap board

The theme is a departure board of a station. The palette is dark only, and the
characters are white. The amber marks the delay and the mark of the departure:
those two values change while the person reads. The red marks a train that RFI
cancels.

A flap of Solari is a card with two halves, and the card turns on an axis at the
middle of the housing. The board holds one card for each character of the drum,
and the cards fall one after the other until the correct character arrives. A
surface that turns one time is not a Solari.

**The line of the axis takes no space of the character.** The two halves hold
one half of the height each, and the line comes from `::after` of the housing,
above the card. A half that stops before the middle removes a part of the
character: it removes the bar of the `A`, of the `E`, of the `B` and of the
`8`. JetBrains Mono is a smooth font, and its capital letters sit at the same
distance from the ascent and from the descent. The CSS gives the same space
above and below the character at each size of the font, thus the line of the
axis stays at the middle of the capital letters. On a real board the two
halves of the card touch, and the reader sees a shadow: the card loses no ink.

The drum holds the empty position, the letters, the digits and the punctuation:
`" ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:'/-"`. It holds the two points, because
the board shows an hour. It holds the point, the apostrophe, the solidus and the
hyphen, because the names of the stations hold them.

`TURN_MS` and `STEP_MS` of `src/client/lib/flaps.ts` give the two times of the
movement: one turn of the drum holds 160 milliseconds, and each flap waits 70
milliseconds for the flap before it. A turn of 60 milliseconds gives 16 cards
each second, and the eye then reads one movement and no card. `SplitFlapText`
writes those two values in `--board-turn` and `--board-step`, and
`styles/theme.css` reads them: the two files hold one source, and the sound of
the flaps reads the same constants.

Each flap starts eight characters before its character, and not at the empty
position. A drum of 42 characters gives 41 turns, and each turn holds four
elements: one board of five trains then holds more than 20000 elements, and the
telephone stops. The eye reads no separate character of a fast turn: it reads
the movement.

Give the text of the board a size of `text-[11px]` or `text-[22px]`, and write
the size as an arbitrary value with a length, not as a token of the theme. A
token `text-flap-sm` has the shape of a colour, thus `tailwind-merge` removes
it and keeps `text-board-amber`.

Give `aria-hidden` to the flaps. Put the correct value in an element that is not
visible: a reader of five separate cells says "one, four, two points, five,
zero".

If the user selects `prefers-reduced-motion`, the flaps show the new value
immediately. The state with no animation is the state at the end of the turn,
thus the animation needs no second rule for that user.

The font of the board is JetBrains Mono, in `src/client/fonts/`. The board
shows the bold weight only, thus the repository holds that weight only. Keep
the font files in the repository. Do not use an external CDN.

### 5.3 The table

The board is always on the page. Before the first answer it shows five rows with
no character on their flaps, as an empty board of a station, and those flaps turn
when the answer arrives. `MINIMUM` of `src/client/lib/board.ts` gives the
quantity of flaps of each column of that board, thus the columns hold their place
before the answer.

Each column takes the quantity of flaps of its longest value, and `column` of
`src/client/lib/board.ts` gives that quantity to each row. The columns of two
rows then stay one under the other, and no row holds an empty flap that no value
needs.

The quantity comes from the answer and not from a constant. The values of RFI
hold a long tail. An examination of 8522 rows gives these numbers:

| Column | Values | Longest value |
|---|---|---|
| Binario | 89% hold no character or one character, 96.5% hold two | `2 F.E.R.`, of eight characters |
| Ritardo | 87.8% hold no character | `CANC` and `+120`, of four characters |

A constant of five flaps thus gives three empty flaps to each platform, and it
breaks the column of the platform `2 F.E.R.`.

The delay holds three flaps at the minimum and not four. The value `CANC` and a
delay of more than 99 minutes hold four characters, and that column then takes
one flap more: those two values are 1.5 per cent of the rows, and four flaps for
each row make the table wider than a telephone.

The column of the platform holds the space before its value. The platform is a
number, and a number reads better at the right side of its column.

The columns are the columns of the monitor of RFI, with no carrier, no category
and no mark of the departure. The platform comes before the delay: a person who
runs to a train reads the platform first. The last column holds the hour of
arrival at the station of the user, and that column is the reason of the
application.

The board holds three sizes:

| Item | Below `md` | `md` to `xl` | `xl` and more |
|---|---|---|---|
| Treno | no | yes | yes |
| Destinazione | short name | short name | official name |
| Head of the arrival | `Arrivo` | `Arrivo` | `Arrivo previsto` |

A telephone shows five of the six columns. The number of the train goes away: a
person who knows the two stations reads the hour, and that value is secondary.

The destination takes the short name of RFI below `xl`: `MILANO P.GAR` and not
`MILANO PORTA GARIBALDI`. A board of a station writes the same name, and the
catalogue holds it. A station with no short name keeps its official name, and a
station of another country also: the catalogue holds no such station.

A head that is longer than its column makes that column wider. `ARRIVO PREVISTO`
is 15 characters against five flaps, thus that head becomes `Arrivo` below `xl`.
Measure the width of the table after a change of a column.

`useShortNames` of `src/client/lib/media.ts` reads the width in JavaScript. A
rule of CSS also hides a column, but the two names of the destination then stay
both in the page: the flaps of that column are 40 per cent of the elements of
the board.

With those rules the table needs no movement to the side at 390, 768, 1024, 1280
and 1440 pixels. A name of more than 27 characters at `xl` is wider than the
page: the surface around the table then moves to the side.

The width of the page is `max-w-6xl`. At `max-w-5xl` the seven columns of a name
of 27 characters are 1018 pixels against 990 pixels of the page.

### 5.4 The telephone

The height of a control is 44 pixels. That size is the smallest control for a
finger.

The size of the text of a field is 16 pixels. Safari on iOS makes the page
larger when the text of a field is below that size.

### 5.5 The mark

The mark of the application is the icon `train-front` of Lucide, on the colour
of the page. Lucide holds the ISC licence, and `README.md` gives that note.

`src/client/public/icon.svg` is the one file of the mark. The head of
`index.html` gives it to the tab of the browser, and the masthead of the page
shows the same file. The square of the icon holds the colour of the page, thus
that square does not show on a surface of the application.

`icon-192.png` is for a browser that reads no SVG icon. `icon-180.png` is for
iOS: that system asks for 180 pixels and it applies its own mask, thus that file
holds no rounded corner.

`vite.config.ts` holds `publicDir`. The root of Vite is the root of the
repository, thus the directory of the static files needs its path: without it
Vite reads `./public`, and the three files never arrive in `dist/client`.

### 5.6 The address of the two stations

A person can bookmark a journey with `?from=<id>&to=<id>` in the address of
the page, with the `placeId` of RFI of the two stations. `src/client/lib/url.ts`
reads the two identifiers at the load of the page, and `App.tsx` gives each
field a station with no name: the answer of `/api/journeys` holds the name of
the two stations, and the field then shows it. The application asks no new
address of the API for the name, because that answer already holds it.

The address of the page changes again when the person selects a station or
uses the button of the swap, with `history.replaceState`. Thus the address
always matches the two stations of the fields, and a person can bookmark the
new journey.

### 5.7 The sound of the flaps

A board of Solari knocks each time a card falls. The application makes that
knock with the Web Audio API: it holds no file of sound, thus it needs no
licence and no download. `lib/sound.ts` makes a noise of 45 milliseconds that
goes away quickly, through a filter of band at 1800 hertz.

The board holds 1015 cards for one answer. One source of audio for each card is
too much for a telephone, thus `clackTimes` of `src/client/lib/clack.ts` gives
one moment and not one card. Each surface of flaps starts its places at zero,
thus the moments of two surfaces are the same: one answer gives 93 moments for
1015 cards, and the quantity of cards of a moment gives the volume.

`turningFlaps` gives the flaps that change their character. A flap turns when
its value changes, because `SplitFlapText` reads the place and the character
together as the key of React. A refresh that changes one delay thus turns the
flaps of that column and of the hour of arrival, and it knocks for those flaps
only.

The sound starts on, and the button of the masthead stops it. The choice stays
in the store of the browser, with the key `pendolare:suono`.

Two rules stop the sound:

- A browser plays no sound before an action of the person. `armSound` makes the
  AudioContext at the first action on the page. The person writes the name of a
  station first, thus the board knocks at the first answer and never at the
  load.
- A person who asks for `prefers-reduced-motion` sees no movement of the flaps.
  That person hears no knock: a knock with no card that falls says nothing.

## 6. The configuration of TypeScript

The project holds one configuration for each environment:

| File | Content | Library |
|---|---|---|
| `tsconfig.client.json` | `src/client` and `src/shared` | DOM |
| `tsconfig.worker.json` | `src/worker` and `src/shared` | no DOM |
| `tsconfig.node.json` | `scripts` and the files of configuration | no DOM |

The three are necessary. The library DOM gives a `CacheStorage` with no
`default`, and the Worker holds `caches.default`. With one configuration the
Worker reads the type of the browser, and that type is not correct. The three
files also stop an error: a file of the Worker that reads `document` now gives
an error of the compiler.

`npm run typecheck` calls `tsc` one time for each file.

## 7. The tests

Vitest examines the pure functions of `src/shared/` and of `src/client/lib/`.
Each file with logic has a test file.

`vitest.config.ts` is separate from `vite.config.ts`. The configuration of Vite
starts the plugin of Cloudflare, and that plugin starts workerd: the tests need
no Worker.

`src/shared/monitor.fixture.html` holds real rows of the monitor of RFI. The
images of the carrier hold `src="LOGO"` in the place of the data URI, because
that URI is 40 kilobytes.

## 8. The release

`compatibility_date` of `wrangler.jsonc` fixes the behaviour of the runtime. Do
not change that date without a reason.

The application needs no secret and no binding, except the binding of the static
files.
