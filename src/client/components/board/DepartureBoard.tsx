import type { JourneyView } from "../../../shared/api.ts";
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
import { useNarrowScreen } from "../../lib/media.ts";
import { text } from "../../text.ts";
import { SplitFlapText } from "./SplitFlapText.tsx";

/** The classes of a column that a telephone does not show. */
const WIDE_ONLY = "hidden md:table-cell";

/**
 * The table of the departures, with one row for each train.
 *
 * The columns are the columns of the monitor of RFI, with no carrier and no
 * category. The platform comes before the delay: a person who runs to a train
 * reads the platform first. The last column holds the hour of arrival at the
 * station of the user, and that column is the reason of the application.
 *
 * A telephone shows five columns. The number of the train and the mark of the
 * departure go away: a person who knows the two stations reads the hour, and
 * those two values are secondary. The destination takes its short name, as on a
 * board of a station: `MILANO P.GAR`. Paragraph 5.3 of `docs/architecture.md`
 * gives the rules.
 *
 * Each field holds a fixed quantity of flaps, thus the columns of two rows stay
 * one under the other. The column of the destination takes the length of the
 * longest name of the answer.
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
	const narrow = useNarrowScreen();
	const destinationOf = (journey: JourneyView) =>
		narrow ? journey.destinationShort : journey.destination;
	const wide = columnWidth(journeys.map(destinationOf));

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
						<Head className={WIDE_ONLY}>{text.columnLeaving}</Head>
						<Head short={text.columnArrivalShort}>{text.columnArrival}</Head>
					</tr>
				</thead>
				<tbody>
					{journeys.map((journey) => (
						<tr
							key={`${journey.train}-${journey.departure}`}
							className="border-board-line/60 border-b last:border-b-0"
						>
							<Cell className={WIDE_ONLY} field={trainField(journey)} />
							<Cell
								field={{
									text: pad(destinationOf(journey), wide),
									tone: "text",
									// The screen reader always reads the official name.
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
							<Cell field={platformField(journey.platform)} />
							<Cell field={delayField(journey.delay)} />
							<Cell
								className={WIDE_ONLY}
								field={leavingField(journey.leaving)}
							/>
							<Cell field={arrivalField(journey)} />
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
 * `short` gives a head for a telephone. A head that is longer than its column
 * makes that column wider: `ARRIVO PREVISTO` is 15 characters, and the value of
 * that column holds five flaps.
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
					<span className="md:hidden">{short}</span>
					<span className="hidden md:inline">{children}</span>
				</>
			)}
		</th>
	);
}

function Cell({ field, className }: { field: Field; className?: string }) {
	return (
		<td className={`px-0.5 py-1.5 align-middle md:px-2 ${className ?? ""}`}>
			<SplitFlapText text={field.text} tone={field.tone} label={field.label} />
		</td>
	);
}
