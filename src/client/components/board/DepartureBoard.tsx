import type { Journey } from "../../../shared/journey.ts";
import {
	arrivalField,
	columnWidth,
	delayField,
	type Field,
	leavingField,
	pad,
	platformField,
	trainField,
	WIDTH,
} from "../../lib/board.ts";
import { text } from "../../text.ts";
import { SplitFlapText } from "./SplitFlapText.tsx";

/**
 * The table of the departures, with one row for each train.
 *
 * The columns are the columns of the monitor of RFI, with no carrier and no
 * category. The last column holds the hour of arrival at the station of the
 * user: that column is the reason of the application.
 *
 * Each field holds a fixed quantity of flaps, thus the columns of two rows stay
 * one under the other, as on a board of a station. The column of the
 * destination takes the length of the longest name of the answer.
 *
 * The table is wider than a telephone. The surface around it moves to the side,
 * thus the page never moves to the side: the person moves the board, as a
 * person in a station moves the eyes.
 */
export function DepartureBoard({
	journeys,
	from,
	to,
}: {
	journeys: readonly Journey[];
	from: string;
	to: string;
}) {
	const wide = columnWidth(journeys.map((one) => one.destination));

	return (
		<div className="overflow-x-auto rounded-lg border border-board-line bg-board-panel">
			<table className="w-full border-collapse">
				<caption className="sr-only">{text.caption(from, to)}</caption>
				<thead>
					<tr className="border-board-line border-b">
						<Head>{text.columnTrain}</Head>
						<Head>{text.columnDestination}</Head>
						<Head>{text.columnTime}</Head>
						<Head>{text.columnDelay}</Head>
						<Head>{text.columnPlatform}</Head>
						<Head>{text.columnLeaving}</Head>
						<Head>{text.columnArrival}</Head>
					</tr>
				</thead>
				<tbody>
					{journeys.map((journey) => (
						<tr
							key={`${journey.train}-${journey.departure}`}
							className="border-board-line/60 border-b last:border-b-0"
						>
							<Cell field={trainField(journey)} />
							<Cell
								field={{
									text: pad(journey.destination, wide),
									tone: "text",
									label: journey.destination,
								}}
							/>
							<Cell
								field={{
									text: pad(journey.departure, WIDTH.clock),
									tone: "text",
									label: journey.departure,
								}}
							/>
							<Cell field={delayField(journey.delay)} />
							<Cell field={platformField(journey.platform)} />
							<Cell field={leavingField(journey.leaving)} />
							<Cell field={arrivalField(journey)} />
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function Head({ children }: { children: string }) {
	return (
		<th
			scope="col"
			className="whitespace-nowrap px-2 py-2 text-left font-board text-[11px] text-board-muted uppercase tracking-widest"
		>
			{children}
		</th>
	);
}

function Cell({ field }: { field: Field }) {
	return (
		<td className="px-2 py-1.5 align-middle">
			<SplitFlapText text={field.text} tone={field.tone} label={field.label} />
		</td>
	);
}
