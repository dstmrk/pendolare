import type { JourneyView } from "../../../shared/api.ts";
import {
	arrivalField,
	clockField,
	column,
	delayField,
	type Field,
	platformField,
	trainField,
} from "../../lib/board.ts";
import { useShortNames } from "../../lib/media.ts";
import { text } from "../../text.ts";
import { SplitFlapText } from "./SplitFlapText.tsx";

/** The classes of a column that a small screen does not show. */
const WIDE_ONLY = "hidden md:table-cell";

/**
 * The table of the departures, with one row for each train.
 *
 * The columns are the columns of the monitor of RFI, with no carrier, no
 * category and no mark of the departure. The platform comes before the delay: a
 * person who runs to a train reads the platform first. The last column holds the
 * hour of arrival at the station of the user, and that column is the reason of
 * the application.
 *
 * A small screen shows five of the six columns, and a screen below the
 * breakpoint `xl` shows the short name of the destination. Paragraph 5.3 of
 * `docs/architecture.md` gives the three sizes.
 *
 * Each column takes the quantity of flaps of its longest value, thus the columns
 * of two rows stay one under the other and no row holds an empty flap that no
 * value needs.
 */
export function DepartureBoard({
	journeys,
	from,
	to,
}: {
	journeys: readonly JourneyView[];
	from: string;
	to: string;
}) {
	const short = useShortNames();
	const columns = {
		train: column(journeys.map(trainField)),
		destination: column(
			journeys.map((one) => ({
				text: short ? one.destinationShort : one.destination,
				tone: "text" as const,
				// The screen reader always reads the official name.
				label: one.destination,
			})),
		),
		departure: column(journeys.map((one) => clockField(one.departure))),
		platform: column(
			journeys.map((one) => platformField(one.platform)),
			"right",
		),
		delay: column(journeys.map((one) => delayField(one.delay))),
		arrival: column(journeys.map(arrivalField)),
	};

	return (
		<div className="overflow-x-auto rounded-lg border border-board-line bg-board-panel">
			<table className="w-full border-collapse">
				<caption className="sr-only">{text.caption(from, to)}</caption>
				<thead>
					<tr className="border-board-line border-b">
						<Head className={WIDE_ONLY}>{text.columnTrain}</Head>
						<Head>{text.columnDestination}</Head>
						<Head>{text.columnTime}</Head>
						<Head>{text.columnPlatform}</Head>
						<Head>{text.columnDelay}</Head>
						<Head short={text.columnArrivalShort}>{text.columnArrival}</Head>
					</tr>
				</thead>
				<tbody>
					{journeys.map((journey, row) => (
						<tr
							key={`${journey.train}-${journey.departure}`}
							className="border-board-line/60 border-b last:border-b-0"
						>
							<Cell className={WIDE_ONLY} field={columns.train[row]} />
							<Cell field={columns.destination[row]} />
							<Cell field={columns.departure[row]} />
							<Cell field={columns.platform[row]} />
							<Cell field={columns.delay[row]} />
							<Cell field={columns.arrival[row]} />
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

/**
 * The head of one column.
 *
 * A head that is longer than its column makes that column wider: `ARRIVO
 * PREVISTO` is 15 characters and its value holds five flaps. `short` gives a
 * second head for a screen below the breakpoint `xl`.
 */
function Head({
	children,
	short,
	className,
}: {
	children: string;
	short?: string;
	className?: string;
}) {
	return (
		<th
			scope="col"
			className={`whitespace-nowrap px-0.5 py-2 text-left font-board text-[11px] text-board-muted uppercase tracking-widest md:px-2 ${className ?? ""}`}
		>
			{short === undefined ? (
				children
			) : (
				<>
					<span className="xl:hidden">{short}</span>
					<span className="hidden xl:inline">{children}</span>
				</>
			)}
		</th>
	);
}

function Cell({ field, className }: { field?: Field; className?: string }) {
	return (
		<td className={`px-0.5 py-1.5 align-middle md:px-2 ${className ?? ""}`}>
			{field !== undefined && (
				<SplitFlapText
					text={field.text}
					tone={field.tone}
					label={field.label}
				/>
			)}
		</td>
	);
}
