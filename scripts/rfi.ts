/**
 * The calls to the pages of RFI, for the scripts of the data.
 *
 * A script reads many pages, thus it holds a pool of calls and it waits after
 * an error. These functions run on Node, not on the Worker.
 */

/** The address of the monitor of one station. */
const MONITOR =
	"https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor";

/** The address of the page with the list of the stations. */
export const HOME = "https://iechub.rfi.it/arrivipartenze";

const HEADERS = {
	"User-Agent": "pendolare-data (+https://github.com/dstmrk/pendolare)",
	"Accept-Language": "it",
};

/** Waits a quantity of milliseconds. */
export function wait(ms: number): Promise<void> {
	return new Promise((done) => setTimeout(done, ms));
}

/**
 * Reads one page and gives its text.
 *
 * `limit` gives the maximum quantity of characters. The name of the station is
 * in the first 12000 characters, and one page is 350000 characters: a probe of
 * each identifier then reads 30 times less.
 *
 * The function waits after an error and it asks again. RFI gives an error to
 * one call of a group, and a script of 5000 calls then stops without this rule.
 */
export async function read(
	url: string,
	{ limit, tries = 3 }: { limit?: number; tries?: number } = {},
): Promise<string> {
	let last: unknown;
	for (let attempt = 0; attempt < tries; attempt += 1) {
		try {
			const answer = await fetch(url, { headers: HEADERS });
			if (!answer.ok) {
				throw new Error(`status ${answer.status}`);
			}
			if (limit === undefined) {
				return await answer.text();
			}
			return await readPrefix(answer, limit);
		} catch (error) {
			last = error;
			await wait(1500 * (attempt + 1));
		}
	}
	throw last;
}

/** Reads the first characters of an answer and stops the rest. */
async function readPrefix(answer: Response, limit: number): Promise<string> {
	const body = answer.body;
	if (body === null) {
		return "";
	}
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let text = "";
	while (text.length < limit) {
		const part = await reader.read();
		if (part.done) {
			break;
		}
		text += decoder.decode(part.value, { stream: true });
	}
	await reader.cancel();
	return text;
}

/** The address of the monitor of departures or of arrivals of one station. */
export function monitorUrl(placeId: number, arrivals: boolean): string {
	return `${MONITOR}?Arrivals=${arrivals ? "True" : "False"}&PlaceId=${placeId}`;
}

/**
 * Calls one function for each item, with a maximum quantity at one time.
 *
 * The pool keeps RFI at a quantity of calls that one browser also makes.
 */
export async function pool<T, R>(
	items: readonly T[],
	workers: number,
	job: (item: T, index: number) => Promise<R>,
	onProgress?: (done: number, total: number) => void,
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let next = 0;
	let done = 0;

	async function run(): Promise<void> {
		while (next < items.length) {
			const index = next;
			next += 1;
			const item = items[index] as T;
			results[index] = await job(item, index);
			done += 1;
			onProgress?.(done, items.length);
		}
	}

	await Promise.all(
		Array.from({ length: Math.min(workers, items.length) }, run),
	);
	return results;
}
