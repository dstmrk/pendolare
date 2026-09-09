import { Hono } from "hono";
import { z } from "zod";
import catalogue from "../data/stations.json";
import {
	type JourneysAnswer,
	type StationsAnswer,
	TRAINS,
} from "../shared/api.ts";
import { findJourneys } from "../shared/journey.ts";
import { parseBoard } from "../shared/monitor.ts";
import { type Station, searchStations } from "../shared/stations.ts";

/**
 * The API of the application.
 *
 * The Worker holds the catalogue of the stations and it reads the monitor of
 * RFI. The client of the browser cannot read that monitor: the answer of RFI
 * holds no header of CORS, and the content is HTML. Paragraph 2.2 of
 * `docs/architecture.md` gives the reason.
 *
 * `wrangler.jsonc` sends `/api/*` to this Worker. Each other address takes a
 * static file, thus the Worker does not start for the page and for the font.
 */

const stations: Station[] = catalogue;
const byId = new Map(stations.map((one) => [one.id, one]));

/** The address of the monitor of departures of one station. */
const MONITOR =
	"https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor";

/**
 * The time of the answer of RFI in the cache of Cloudflare.
 *
 * RFI writes that the data of the page can hold three minutes of delay against
 * the boards of the station, thus a short time gives no better value. One
 * answer serves each pair of stations that starts at the same station.
 */
const CACHE_SECONDS = 45;

/** The quantity of stations of the field of search. */
const SUGGESTIONS = 8;

const search = z.object({
	q: z.string().min(1).max(60),
	limit: z.coerce.number().int().min(1).max(20).default(SUGGESTIONS),
});

const journey = z.object({
	from: z.coerce.number().int().positive(),
	to: z.coerce.number().int().positive(),
	limit: z.coerce.number().int().min(1).max(20).default(TRAINS),
});

/** Reads the page of the monitor of departures of one station. */
async function fetchBoard(placeId: number): Promise<string> {
	const url = `${MONITOR}?Arrivals=False&PlaceId=${placeId}`;
	const answer = await fetch(url, {
		headers: {
			// RFI supplies the page to a browser. The name of the application
			// says who asks, thus RFI can find this traffic in its log.
			"User-Agent": "pendolare (+https://github.com/dstmrk/pendolare)",
			"Accept-Language": "it",
		},
		cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
	});
	if (!answer.ok) {
		throw new Error(`RFI ${answer.status}`);
	}
	return answer.text();
}

const app = new Hono();

/** Gives the stations that match the text of the field. */
app.get("/api/stations", (c) => {
	const query = search.safeParse(c.req.query());
	if (!query.success) {
		return c.json({ error: "query" }, 400);
	}
	const found = searchStations(stations, query.data.q, query.data.limit);
	// The catalogue changes with a new build only, thus the browser and the
	// edge of Cloudflare keep the answer.
	c.header("Cache-Control", "public, max-age=3600");
	const answer: StationsAnswer = {
		stations: found.map((one) => ({ id: one.id, name: one.name })),
	};
	return c.json(answer);
});

/** Gives the first trains from one station to another station. */
app.get("/api/journeys", async (c) => {
	const query = journey.safeParse(c.req.query());
	if (!query.success) {
		return c.json({ error: "query" }, 400);
	}
	const from = byId.get(query.data.from);
	const to = byId.get(query.data.to);
	if (from === undefined || to === undefined) {
		return c.json({ error: "station" }, 404);
	}
	if (from.id === to.id) {
		return c.json({ error: "same" }, 400);
	}

	let board: ReturnType<typeof parseBoard>;
	try {
		board = parseBoard(await fetchBoard(from.id));
	} catch {
		return c.json({ error: "rfi" }, 502);
	}

	c.header("Cache-Control", `public, max-age=${CACHE_SECONDS}`);
	const answer: JourneysAnswer = {
		from: { id: from.id, name: from.name },
		to: { id: to.id, name: to.name },
		updatedAt: board.updatedAt,
		scanned: board.rows.length,
		journeys: findJourneys(board, to, query.data.limit),
	};
	return c.json(answer);
});

app.all("/api/*", (c) => c.json({ error: "notFound" }, 404));

export default app;
