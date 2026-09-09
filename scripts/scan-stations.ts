/**
 * Makes the catalogue of the stations of the monitor of RFI.
 *
 * RFI supplies no list of the stations. The page `iechub.rfi.it/arrivipartenze`
 * holds a list in a `select`, but that list is not complete: it holds no
 * MILANO CENTRALE, and the monitor of that station answers. Therefore this
 * script reads the two sources:
 *
 * 1. the `select` of the page, for each identifier and each name;
 * 2. each identifier of a range, with the official name of the title of the
 *    page of the monitor.
 *
 * The name of the title wins: it is the name that the station shows. The script
 * keeps the short names of the catalogue, thus `build-aliases.ts` needs no
 * second run.
 *
 * ```
 * npm run data:stations            # the identifiers from 1 to 6500
 * npm run data:stations -- 1 9000  # another range
 * ```
 */

import { readCatalogue, writeCatalogue } from "./catalogue.ts";
import { HOME, monitorUrl, pool, read } from "./rfi.ts";

/** The characters of the page that hold the title with the name. */
const PREFIX = 12000;

/** The quantity of calls at one time. */
const WORKERS = 12;

const OPTION = /<option value="(\d+)">([^<]*)<\/option>/g;
const TITLE = /<h1 class="nomestazione"[^>]*>([\s\S]*?)<\/h1>/;

/** Reads the five entities of XML and the numeric entities. */
function decode(text: string): string {
	return text
		.replace(/&#(\d+);/g, (_, code: string) =>
			String.fromCodePoint(Number(code)),
		)
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, "&");
}

/** Reads the list of the stations of the page of RFI. */
async function fromList(): Promise<Map<number, string>> {
	const page = await read(HOME);
	const found = new Map<number, string>();
	OPTION.lastIndex = 0;
	let one = OPTION.exec(page);
	while (one !== null) {
		found.set(Number(one[1]), decode(one[2] ?? "").trim());
		one = OPTION.exec(page);
	}
	return found;
}

/** Reads the official name of one identifier, or `null`. */
async function nameOf(placeId: number): Promise<string | null> {
	const head = await read(monitorUrl(placeId, false), { limit: PREFIX });
	const title = TITLE.exec(head);
	const name = title?.[1] === undefined ? "" : decode(title[1]).trim();
	return name === "" ? null : name;
}

const [lowText, highText] = process.argv.slice(2);
const low = Number(lowText ?? 1);
const high = Number(highText ?? 6500);

const list = await fromList();
console.log(`the page of RFI gives ${list.size} stations`);

const ids = [...new Set([...list.keys(), ...range(low, high)])].sort(
	(a, b) => a - b,
);
console.log(`the script reads ${ids.length} identifiers`);

const names = new Map<number, string>();
await pool(
	ids,
	WORKERS,
	async (placeId) => {
		const name = await nameOf(placeId);
		if (name !== null) {
			names.set(placeId, name);
		}
	},
	(done, total) => {
		if (done % 250 === 0 || done === total) {
			console.log(`${done}/${total} — ${names.size} stations`);
		}
	},
);

// A call that fails gives no name. The list of the page then keeps that
// station: a station of the list is a station of RFI.
for (const [placeId, name] of list) {
	if (!names.has(placeId)) {
		console.log(
			`the title gives no name for ${placeId}: the list gives ${name}`,
		);
		names.set(placeId, name);
	}
}

const before = new Map(
	(await readCatalogue()).map((one) => [one.id, one.aliases]),
);
const stations = [...names]
	.map(([id, name]) => ({ id, name, aliases: before.get(id) ?? [] }))
	.sort((a, b) => a.name.localeCompare(b.name, "it"));

await writeCatalogue(stations);
console.log(`the catalogue holds ${stations.length} stations`);

/** Gives each number of a range. */
function range(from: number, to: number): number[] {
	return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}
