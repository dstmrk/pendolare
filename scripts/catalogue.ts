/**
 * The file of the catalogue: `src/data/stations.json`.
 *
 * The two scripts of the data read and write that file. `scan-stations.ts`
 * writes the stations, and `build-aliases.ts` writes the short names.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Station } from "../src/shared/stations.ts";

const FILE = fileURLToPath(
	new URL("../src/data/stations.json", import.meta.url),
);

/** Reads the catalogue. A file that does not exist gives an empty catalogue. */
export async function readCatalogue(): Promise<Station[]> {
	try {
		return JSON.parse(await readFile(FILE, "utf8")) as Station[];
	} catch {
		return [];
	}
}

/**
 * Writes the catalogue, in the order of the name.
 *
 * The file holds one station on one line: a difference of git then shows the
 * stations that change, not one line of 140 kilobytes.
 */
export async function writeCatalogue(stations: Station[]): Promise<void> {
	const order = [...stations].sort((a, b) =>
		a.name.localeCompare(b.name, "it"),
	);
	const lines = order.map((one) => `\t${JSON.stringify(one)}`);
	await writeFile(FILE, `[\n${lines.join(",\n")}\n]\n`, "utf8");
}
