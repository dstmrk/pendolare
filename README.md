# Pendolare 🚆

Pendolare shows the next trains that depart from one station and stop at another
station.

You select the station of departure and the station of arrival. Pendolare gives
the first five trains that make that journey, on a departure board with
split-flap displays.

| Column | Content |
|---|---|
| Treno | The number of the train. |
| Destinazione | The last station of the train. |
| Orario | The hour of departure of the timetable. |
| Ritardo | The delay at the station of departure. |
| Binario | The platform. |
| Arrivo previsto | The hour of arrival at your station. |

## What Pendolare is not

Pendolare is not the official source. The source is the monitor of arrivals and
departures of RFI, and the page shows the moment of the data.

Pendolare has no account and no database. It holds no value of a person.

Pendolare sells no ticket and it plans no journey with a change of train. It
reads one board of one station.

## Two limits of the data

**The hour of arrival is a calculation.** Pendolare adds the delay at the station
of departure to the hour of the timetable. A train can take that delay back along
the line.

**The board of RFI holds 40 trains.** At a large station those trains are the
next two hours. An empty answer does not say that no train exists: it says that
no train of those 40 stops at your station.

## Development

```bash
npm install
npm run dev     # http://localhost:5173
npm test
npm run build
npm run deploy  # Cloudflare Workers
```

`docs/architecture.md` gives the decisions of the project. `CLAUDE.md` gives the
rules of the work.

## Licence

MIT. Refer to [`LICENSE`](LICENSE).

The font of the board is [JetBrains Mono](https://www.jetbrains.com/lp/mono/)
of the JetBrains Mono Project, with the SIL Open Font License 1.1.

The mark, the two icons of the sound and the two icons of the buttons are
`train-front`, `volume-2`, `volume-off`, `arrow-down-up` and `refresh-cw` of
[Lucide](https://lucide.dev), with the ISC licence.
