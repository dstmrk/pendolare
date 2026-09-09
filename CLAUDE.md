# CLAUDE.md

Rules for work in this repository. This file is in ASD-STE100 Simplified Technical
English.

## The project

Pendolare shows the next trains that depart from one station and stop at another
station. The source is the monitor of arrivals and departures of RFI. The
application has no account and no database.

Read [`docs/architecture.md`](docs/architecture.md) before you write code. That
document gives the stack, the shape of the data of RFI and the rules of the
board.

## Language rules

| Item | Language |
|---|---|
| Documents (`*.md`) | English. Use ASD-STE100 Simplified Technical English. |
| User interface text | Italian. |
| Code, identifiers, comments | English. |
| Commit messages, PR text | English. |

ASD-STE100 gives these rules for the documents:

- Write one instruction in one sentence.
- Keep procedural sentences to a maximum of 20 words. Keep descriptive sentences
  to a maximum of 25 words.
- Keep a maximum of 6 sentences in a descriptive paragraph.
- Use the active voice.
- Use the simple present tense when it is possible.
- Do not use the `-ing` form as a noun.
- Use the same word for the same thing. Do not use two words for one thing.
- Use `must` for a requirement. Use `can` for a possibility. Do not use `should`.
- Do not use idioms and do not use technical slang.

Keep the Italian text of the interface in `src/client/text.ts`. Do not put
Italian text in the code of the Worker.

The head of `index.html` is the one exception. The title, the description and the
tags of Open Graph are Italian, because a static file imports no module and a
crawler of an assistant reads no JavaScript. Paragraph 5 of
`docs/architecture.md` gives the reason. Add no other Italian text to that file.

## Stack

- Node 22 LTS for the scripts, TypeScript, Zod
- Client: Vite, React 19, TanStack Query
- User interface: Tailwind CSS v4
- Server: Hono, on Cloudflare Workers with static assets
- Tests: Vitest. Lint and format: Biome.

The project has one `package.json`. Do not add a monorepo tool. The application
holds one page: do not add a router.

Write the extension `.ts` in a relative import: `import { x } from "./x.ts"`.

## Rules for the work

1. **Ask when a requirement is not clear.** Do not write code with an
   assumption. The section Questions gives the operations that always need a
   question.
2. **Write the test first.** Write the test before the implementation. Each file
   with logic has a test file.
3. **Examine the edge cases after each implementation.** Make a list of the edge
   cases. Add a test for each one. Do these operations before the commit.
4. **Divide a large task.** If a task changes more than 3 files, stop. Then
   divide the task into sub-tasks.
5. **Find the cause of a correction.** If the user corrects you, find the reason
   for the error. Then prevent the same error.
6. **Keep this file correct.** If you solve a difficult problem, write the lesson
   here or in `docs/architecture.md`. Do this operation without a request from
   the user.
7. **Keep the work minimal.** Write the smallest change that gives the requested
   result. Do not add a function for a future requirement. Keep the text of the
   user interface short.

## Rules for the data

These rules prevent the most dangerous defects in this application:

1. **RFI is the source.** Do not write an hour, a name or a ratio from memory.
   The application reads the page of RFI, and the two scripts of `scripts/` make
   the catalogue.
2. **One station holds more than one short name.** The short name of a station
   comes from the operator of the train. A short name can also be longer than the
   official name: `RHO FIERA` gives `RHO FIERA MILANO`. Keep a list of names, not
   a rule of abbreviation. Paragraph 3.3.2 of `docs/architecture.md` gives the
   method.
3. **A short name of two stations goes away.** Such a name gives a train that
   stops at another station, and that answer is an error.
4. **The hour of arrival is a calculation.** The application adds the delay of
   the departure to the hour of the timetable. The delay changes along the line.
   Each surface that shows that hour also shows that rule.
5. **The board of RFI holds 40 trains.** An empty answer does not say that no
   train exists. It says that no train of those 40 stops at the station of
   arrival.
6. **Do not invent an hour.** A train with no list of stops receives no hour of
   arrival.

The logic of the calculation is in `src/shared/`. The functions must be pure and
must do no I/O. Write a unit test for each new rule.

## Rules for the user interface

- Use a component of `src/client/components/ui/` when one exists. Do not change
  those files.
- Put the components of the theme in `src/client/components/board/`.
- Keep all the tokens in `src/client/styles/theme.css`, with the directive
  `@theme` of Tailwind CSS v4.
- Keep the font files in the repository. Do not use an external CDN. The font of
  the board is Departure Mono, in `src/client/fonts/`.
- Show each character of the board with `SplitFlapText`: one flap for one
  character. A flap is a card with two halves, and it turns through the drum. A
  surface that turns one time is not a Solari. Paragraph 5.2 of
  `docs/architecture.md` gives the rules.
- The characters of the board are white. The amber marks the delay and the hour
  of arrival of a train with a delay. The red marks a train that RFI cancels.
- Give a size of a multiple of 11 pixels to each text of the board:
  `text-[11px]`, `text-[22px]`. Departure Mono is a pixel font. Write the size as
  an arbitrary value with a length. A token `text-flap-sm` has the shape of a
  colour, thus `tailwind-merge` removes it and keeps `text-board-amber`.
- Give `aria-hidden` to the flaps. Put the correct value in an element that is
  not visible.
- The line of the axis of a flap goes above the character. Do not make it with a
  half that stops before the middle: that half removes the bar of the `A`, of
  the `E` and of the `B`. Paragraph 5.2 of `docs/architecture.md` gives the
  examination.
- A telephone shows five of the six columns, and a screen below `xl` shows the
  short name of the destination. Paragraph 5.3 of `docs/architecture.md` gives
  the three sizes.
- Measure the width of the table after a change of a column. The head of a
  column that is longer than its value makes that column wider.
- If the user selects `prefers-reduced-motion`, show the new value immediately.
- The board is always on the page. Before the first answer it shows its rows with
  no character, and those flaps turn when the answer arrives.
- `TURN_MS` and `STEP_MS` of `src/client/lib/flaps.ts` hold the two times of the
  movement. Do not write a time in `styles/theme.css`: that file reads
  `--board-turn` and `--board-step`, and the sound of the flaps reads the same
  constants.
- Give each column the quantity of flaps of its longest value, with `column` of
  `src/client/lib/board.ts`. The columns of two rows then stay one under the
  other, and no row holds an empty flap that no value needs. A constant of five
  flaps gives three empty flaps to each platform and it breaks the column of the
  platform `2 F.E.R.`.

The project has no `jsdom` and no library for the tests of a component.
Therefore keep the logic of the client in `src/client/lib/`, with a test file.
Then a `.tsx` file holds only the elements and the state.

Biome examines one file. It cannot follow the properties through a component. A
component with a role of the WAI-ARIA needs a suppression with the reason, and
that suppression must hold the name of the correct rule: a suppression of a rule
that gives no error is also an error.

## Commands

Run these commands before each commit:

```bash
npm test          # Vitest, one time
npm run typecheck # tsc, one time for each environment
npm run check     # Biome, examination only
npm run fix       # Biome, it writes the corrections
```

The project holds one configuration of TypeScript for each environment:
`tsconfig.client.json`, `tsconfig.worker.json` and `tsconfig.node.json`. The
library DOM gives a `CacheStorage` with no `default`, and the Worker holds
`caches.default`. Paragraph 6 of `docs/architecture.md` gives the reason. Add a
new file to the correct configuration.

Biome writes tab indentation. Run `npm run fix` after you add a file. Biome
examines no file of `src/data/`, because the scripts write those files. Biome
examines no `src/shared/monitor.fixture.html`, because that file is the markup of
RFI: a correction of that file gives a test that examines no real page.

Run these commands for the development and for the deployment:

```bash
npm run dev     # Vite and the Worker in workerd, on the port 5173
npm run build   # dist/client and dist/pendolare
npm run deploy  # the build and then wrangler deploy
npm run types   # wrangler types, after a change of wrangler.jsonc
```

Run these commands for the data. The two write `src/data/stations.json`:

```bash
npm run data:stations  # the catalogue of the stations
npm run data:aliases   # the short names of the stations
```

`data:stations` reads 6500 pages of RFI and it needs 30 minutes. `data:aliases`
reads two pages for each station and it needs 40 minutes. Run `data:aliases` at
two hours of the day: the board of a station holds 40 trains, thus one run finds
the stations of that moment only.

## Git

- Do work on a feature branch. Do not commit to `main`.
- Write a commit message in the imperative form. Give the reason for the change.
- Commit the file `src/data/stations.json`.
- Do not commit `dist/`, `.wrangler/` or a `.dev.vars` file.

## Questions

Ask the user before you do these operations:

- add a new dependency
- change the source of the data or the address of RFI
- change a decision in `docs/architecture.md`
