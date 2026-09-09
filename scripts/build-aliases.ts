/**
 * Makes the short names of the stations of the catalogue.
 *
 * RFI writes the official name in the title of the monitor, and it writes a
 * short name in the list of the stops of a train: `TORINO PORTA SUSA` becomes
 * `TORINO P.S.` for one operator and `TORINO P. SUSA` for another one. The
 * application needs those names, because it finds the station of arrival in
 * that list.
 *
 * RFI supplies no table of the short names. This script makes one with a join:
 *
 * 1. the monitor of arrivals of a station gives the train and the hour of
 *    arrival at that station, with the official name;
 * 2. the list of the stops of a train, on the monitor of departures of another
 *    station, gives the short name of that station with the same hour.
 *
 * The hour of the list is the hour of arrival, thus the key `(train, hour)`
 * gives the two names of the same station. A key that gives two stations goes
 * away: two trains of the country can hold the same number at the same minute.
 *
 * The script keeps the short names of the catalogue and it adds the new ones.
 * Two runs at two hours of the day thus give more stations than one run: the
 * board of a station holds 40 trains only.
 *
 * ```
 * npm run data:aliases
 * ```
 */

import { LIST_TITLE, parseBoard } from "../src/shared/monitor.ts";
import { normalise, type Station } from "../src/shared/stations.ts";
import { readCatalogue, writeCatalogue } from "./catalogue.ts";
import { monitorUrl, pool, read } from "./rfi.ts";

/** The quantity of calls at one time. */
const WORKERS = 12;

/** The mark of a key that gives more than one station. */
const AMBIGUOUS = -1;

const stations = await readCatalogue();
console.log(`the catalogue holds ${stations.length} stations`);

/** `train|hour` of an arrival, and the station of that arrival. */
const arrivals = new Map<string, number>();
/** `train|hour` of a stop, and each short name of that stop. */
const stops = new Map<string, Set<string>>();

let failed = 0;

await pool(
	stations,
	WORKERS,
	async (station) => {
		try {
			const [departures, incoming] = await Promise.all([
				read(monitorUrl(station.id, false)),
				read(monitorUrl(station.id, true)),
			]);

			for (const row of parseBoard(incoming).rows) {
				const key = keyOf(row.train, row.clock);
				if (key === null) {
					continue;
				}
				const before = arrivals.get(key);
				arrivals.set(
					key,
					before === undefined || before === station.id
						? station.id
						: AMBIGUOUS,
				);
			}

			for (const row of parseBoard(departures).rows) {
				for (const stop of row.stops) {
					const key = keyOf(row.train, stop.clock);
					if (key === null) {
						continue;
					}
					const names = stops.get(key) ?? new Set<string>();
					names.add(stop.name);
					stops.set(key, names);
				}
			}
		} catch (error) {
			failed += 1;
			console.log(`${station.name} (${station.id}) gives no answer: ${error}`);
		}
	},
	(done, total) => {
		if (done % 100 === 0 || done === total) {
			console.log(`${done}/${total} stations`);
		}
	},
);

console.log(
	`${arrivals.size} arrivals, ${stops.size} lists of stops, ${failed} stations with no answer`,
);

/** The short names of each station, from the join of the two maps. */
const found = new Map<number, Set<string>>();
for (const [key, names] of stops) {
	const id = arrivals.get(key);
	if (id === undefined || id === AMBIGUOUS) {
		continue;
	}
	const set = found.get(id) ?? new Set<string>();
	for (const name of names) {
		set.add(name);
	}
	found.set(id, set);
}
console.log(`the join gives a name to ${found.size} stations`);

/**
 * A name of two stations goes away.
 *
 * Such a name gives a train that stops at another station, and that answer is
 * an error. The map holds the official name of each station also: a short name
 * that is the official name of another station is the same error, and the
 * search of `isStation` reads the two names of one station together.
 */
const owners = new Map<string, Set<number>>();
for (const station of stations) {
	const names = new Set([
		station.name,
		...(found.get(station.id) ?? []),
		...station.aliases,
	]);
	for (const name of names) {
		const key = normalise(name);
		const set = owners.get(key) ?? new Set<number>();
		set.add(station.id);
		owners.set(key, set);
	}
}
const shared = new Set(
	[...owners].filter(([, ids]) => ids.size > 1).map(([key]) => key),
);
for (const key of shared) {
	const ids = owners.get(key) ?? new Set<number>();
	const names = [...ids].map(
		(id) => stations.find((one) => one.id === id)?.name ?? String(id),
	);
	console.log(`the name ${key} gives ${names.join(" and ")}: it goes away`);
}

/**
 * The short names of one station, with no name that gives nothing.
 *
 * A name goes away with one of these four rules:
 *
 * 1. the name is the official name of the station;
 * 2. the name is the name of another station;
 * 3. the name holds the title of the list. A run before the correction of
 *    `parseStops` wrote `HAELT IN MONGUELFO/WELSBERG-GSIES`, and no station
 *    holds that name;
 * 4. another name of the station gives the same form of `normalise`. RFI writes
 *    the apostrophe of `CAPO D'ORLANDO` in three ways, and `isStation` reads the
 *    three as one name.
 */
function aliasesOf(station: Station): string[] {
	const official = normalise(station.name);
	const names = [...(found.get(station.id) ?? []), ...station.aliases].sort();
	const kept = new Map<string, string>();
	for (const name of names) {
		const key = normalise(name);
		if (key === "" || key === official || shared.has(key)) {
			continue;
		}
		if (LIST_TITLE.test(name)) {
			continue;
		}
		if (!kept.has(key)) {
			kept.set(key, name);
		}
	}
	return [...kept.values()];
}

let added = 0;
const next = stations.map((station) => {
	const aliases = aliasesOf(station);
	added += Math.max(0, aliases.length - station.aliases.length);
	return { ...station, aliases };
});

await writeCatalogue(next);
const withAlias = next.filter((one) => one.aliases.length > 0).length;
console.log(
	`${withAlias} stations hold a short name, ${added} names are new, ${shared.size} names go away`,
);

/** Gives the key of the join, or `null` for a row with no train or no hour. */
function keyOf(train: string, clock: string): string | null {
	const number = train.trim();
	return number === "" || clock.trim() === ""
		? null
		: `${number}|${clock.trim()}`;
}
