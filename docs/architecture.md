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

The Worker asks the page of RFI with `cf: { cacheTtl: 45, cacheEverything: true }`.
One answer then serves each pair of stations that starts at the same station.

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

The drum holds the empty position, the letters, the digits and the punctuation:
`" ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:'/-"`. It holds the two points, because
the board shows an hour. It holds the point, the apostrophe, the solidus and the
hyphen, because the names of the stations hold them.

Each flap starts eight characters before its character, and not at the empty
position. A drum of 42 characters gives 41 turns, and each turn holds four
elements: one board of five trains then holds more than 20000 elements, and the
telephone stops. The eye reads no separate character of a fast turn: it reads
the movement.

Give a size of a multiple of 11 pixels to each text of the board: `text-[11px]`,
`text-[22px]`. Departure Mono is a pixel font. Write the size as an arbitrary
value with a length. A token `text-flap-sm` has the shape of a colour, thus
`tailwind-merge` removes it and keeps `text-board-amber`.

Give `aria-hidden` to the flaps. Put the correct value in an element that is not
visible: a reader of five separate cells says "one, four, two points, five,
zero".

If the user selects `prefers-reduced-motion`, the flaps show the new value
immediately. The state with no animation is the state at the end of the turn,
thus the animation needs no second rule for that user.

The font of the board is Departure Mono, in `src/client/fonts/`. Keep the font
files in the repository. Do not use an external CDN.

### 5.3 The table

Each field of the board holds a fixed quantity of flaps, thus the columns of two
rows stay one under the other. The column of the destination takes the length of
the longest name of the answer. `src/client/lib/board.ts` gives those values.

A value that is longer than its field keeps its characters. A board that cuts a
value gives a value that is not correct.

The table is wider than a telephone. The surface around the table moves to the
side, thus the page never moves to the side.

### 5.4 The telephone

The height of a control is 44 pixels. That size is the smallest control for a
finger.

The size of the text of a field is 16 pixels. Safari on iOS makes the page
larger when the text of a field is below that size.

## 6. The tests

Vitest examines the pure functions of `src/shared/` and of `src/client/lib/`.
Each file with logic has a test file.

`vitest.config.ts` is separate from `vite.config.ts`. The configuration of Vite
starts the plugin of Cloudflare, and that plugin starts workerd: the tests need
no Worker.

`src/shared/monitor.fixture.html` holds real rows of the monitor of RFI. The
images of the carrier hold `src="LOGO"` in the place of the data URI, because
that URI is 40 kilobytes.

## 7. The release

`compatibility_date` of `wrangler.jsonc` fixes the behaviour of the runtime. Do
not change that date without a reason.

The application needs no secret and no binding, except the binding of the static
files.
