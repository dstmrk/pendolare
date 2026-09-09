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
import {
	normalise,
	type Station,
	searchStations,
	shortestName,
} from "../shared/stations.ts";

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

/**
 * The stations by their official name.
 *
 * The column of the destination of RFI holds the official name, and the page
 * needs the short name of that station. A train to another country holds a
 * station that the catalogue does not have, and that train keeps its official
 * name.
 */
const byName = new Map(stations.map((one) => [normalise(one.name), one]));

/** Gives the short name of a station of the column of the destination. */
function shortNameOf(name: string): string {
	const station = byName.get(normalise(name));
	return station === undefined ? name : shortestName(station);
}

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

/**
 * The maximum time of the call to RFI.
 *
 * RFI answers in two seconds. A page that does not arrive gives an error, and
 * the person then reads a message and asks again. Without that limit the
 * person waits for the limit of the platform.
 */
const TIMEOUT_MS = 10_000;

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

/**
 * Reads the page of the monitor of departures of one station.
 *
 * The answer of RFI goes in the cache of the data centre, with the time of
 * `CACHE_SECONDS`. One answer then serves each pair of stations that starts at
 * the same station, and RFI receives one call for each station and not one call
 * for each person.
 *
 * The function writes the cache itself, with the Cache API. The option
 * `cf.cacheTtl` is not sufficient: RFI answers with `Cache-Control: private`,
 * and that value stops the cache of Cloudflare. The function removes each
 * header of the answer that stops the cache, and it writes its own value.
 */
async function fetchBoard(
	placeId: number,
	later: { waitUntil(promise: Promise<unknown>): void },
): Promise<string> {
	const url = `${MONITOR}?Arrivals=False&PlaceId=${placeId}`;
	const key = new Request(url, { method: "GET" });
	const cache = caches.default;

	const stored = await cache.match(key);
	if (stored !== undefined) {
		return stored.text();
	}

	const answer = await fetch(url, {
		headers: {
			// RFI supplies the page to a browser. The name of the application
			// says who asks, thus RFI can find this traffic in its log.
			"User-Agent": "pendolare (+https://github.com/dstmrk/pendolare)",
			"Accept-Language": "it",
		},
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});
	if (!answer.ok) {
		throw new Error(`RFI ${answer.status}`);
	}

	const fresh = new Response(answer.body, answer);
	fresh.headers.set("Cache-Control", `max-age=${CACHE_SECONDS}`);
	// The Cache API writes no answer with a cookie, and RFI can send one.
	fresh.headers.delete("Set-Cookie");
	later.waitUntil(cache.put(key, fresh.clone()));
	return fresh.text();
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
		board = parseBoard(await fetchBoard(from.id, c.executionCtx));
		// Each page of the monitor holds the name of the station in its title.
		// A page with no name is no monitor: RFI gives such a page for an error
		// of its own. Without this rule the person reads `no train stops at
		// that station`, and that answer is not correct.
		if (board.station === "") {
			throw new Error("RFI gives no monitor");
		}
	} catch {
		return c.json({ error: "rfi" }, 502);
	}

	c.header("Cache-Control", `public, max-age=${CACHE_SECONDS}`);
	const answer: JourneysAnswer = {
		from: { id: from.id, name: from.name },
		to: { id: to.id, name: to.name },
		updatedAt: board.updatedAt,
		scanned: board.rows.length,
		journeys: findJourneys(board, to, query.data.limit).map((one) => ({
			...one,
			destinationShort: shortNameOf(one.destination),
		})),
	};
	return c.json(answer);
});

app.all("/api/*", (c) => c.json({ error: "notFound" }, 404));

export default app;
