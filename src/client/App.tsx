import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { type StationSummary, TRAINS } from "../shared/api.ts";
import { DepartureBoard } from "./components/board/DepartureBoard.tsx";
import { SplitFlapText } from "./components/board/SplitFlapText.tsx";
import { SoundToggle } from "./components/SoundToggle.tsx";
import { StationField } from "./components/StationField.tsx";
import { Button } from "./components/ui/button.tsx";
import { fetchJourneys, fetchStation } from "./lib/api.ts";
import { armSound } from "./lib/sound.ts";
import { presetStation, readStationIds, stationSearch } from "./lib/url.ts";
import { text } from "./text.ts";

/** The time between two readings of the monitor of RFI. */
const REFRESH = 60 * 1000;

/**
 * The page of the application.
 *
 * The person selects the station of departure and the station of arrival, and
 * the board shows the first trains that go from one to the other. The
 * application asks for no account: it holds no value of a person.
 *
 * The board reads the monitor of RFI again each minute. RFI writes that its
 * data can hold three minutes of delay against the boards of the station.
 */
export function App() {
	// A browser plays no sound before an action of the person. The first action
	// on this page makes the sound ready, thus the first answer knocks.
	useEffect(armSound, []);

	// The address of the page can hold the identifier of the two stations, for
	// a journey that the person makes each day. The field shows no name before
	// the answer of the board: the application knows the identifier only.
	const [from, setFrom] = useState<StationSummary | null>(() =>
		presetStation(readStationIds(window.location.search).from),
	);
	const [to, setTo] = useState<StationSummary | null>(() =>
		presetStation(readStationIds(window.location.search).to),
	);

	const ready = from !== null && to !== null && from.id !== to.id;
	const board = useQuery({
		queryKey: ["journeys", from?.id, to?.id],
		queryFn: () => fetchJourneys(from?.id ?? 0, to?.id ?? 0),
		enabled: ready,
		refetchInterval: REFRESH,
	});

	// The address of the page can give a station with no name. The application
	// asks the name at the load of the page, thus the field shows it at once
	// and the person does not wait for the board.
	const fromLookup = useQuery({
		queryKey: ["station", from?.id],
		queryFn: () => fetchStation(from?.id ?? 0),
		enabled: from !== null && from.name === "",
		staleTime: 60 * 60 * 1000,
	});
	const toLookup = useQuery({
		queryKey: ["station", to?.id],
		queryFn: () => fetchStation(to?.id ?? 0),
		enabled: to !== null && to.name === "",
		staleTime: 60 * 60 * 1000,
	});

	// The answer of the lookup, or the answer of the board, gives the name of
	// the two stations. The field of a station that the address of the page
	// gave with no name then shows it.
	useEffect(() => {
		const name = fromLookup.data ?? board.data?.from;
		if (
			from !== null &&
			name !== undefined &&
			name !== null &&
			from.id === name.id &&
			from.name === ""
		) {
			setFrom(name);
		}
	}, [fromLookup.data, board.data, from]);
	useEffect(() => {
		const name = toLookup.data ?? board.data?.to;
		if (
			to !== null &&
			name !== undefined &&
			name !== null &&
			to.id === name.id &&
			to.name === ""
		) {
			setTo(name);
		}
	}, [toLookup.data, board.data, to]);

	// The address of the page keeps the identifier of the two stations, thus a
	// person can bookmark the journey and open the link again.
	useEffect(() => {
		const url = `${window.location.pathname}${stationSearch(from?.id ?? null, to?.id ?? null)}`;
		window.history.replaceState(null, "", url);
	}, [from?.id, to?.id]);

	return (
		<div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 px-3 pt-safe pb-safe sm:px-4">
			<header className="flex items-start justify-between gap-3">
				<div>
					<h1 className="flex items-center gap-3">
						{/* The mark holds the colour of the page, thus the square of
					    the icon does not show on this surface. */}
						<img src="/icon.svg" alt="" width="36" height="36" />
						<SplitFlapText text={text.title} moves={false} size="md" />
					</h1>
					<p className="mt-2 text-board-muted text-sm">{text.tagline}</p>
				</div>
				<SoundToggle />
			</header>

			<div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
				<section className="grid grid-cols-[1fr_auto] grid-rows-2 gap-x-3 gap-y-3 sm:grid-cols-[1fr_auto_1fr] sm:grid-rows-1">
					<div className="col-start-1 row-start-1">
						<StationField
							label={text.from}
							placeholder={text.fromPlaceholder}
							value={from}
							onChange={setFrom}
						/>
					</div>
					<div className="col-start-1 row-start-2 sm:col-start-3 sm:row-start-1">
						<StationField
							label={text.to}
							placeholder={text.toPlaceholder}
							value={to}
							onChange={setTo}
						/>
					</div>
					<div className="col-start-2 row-span-2 row-start-1 flex items-center justify-center sm:row-span-1">
						<Button
							variant="outline"
							disabled={from === null && to === null}
							aria-label={text.swap}
							title={text.swap}
							className="h-11 w-11 shrink-0 p-0"
							onClick={() => {
								setFrom(to);
								setTo(from);
							}}
						>
							<ArrowDownUpIcon />
						</Button>
					</div>
				</section>

				<Button
					variant="outline"
					disabled={!ready || board.isFetching}
					className="mx-auto"
					onClick={() => board.refetch()}
				>
					<RefreshCwIcon />
					{text.refresh}
				</Button>
			</div>

			{/* The board is always on the page. Before the first answer it shows
			    its rows with no character, as an empty board of a station, and
			    its flaps turn when the answer arrives. */}
			<main className="flex flex-col gap-3">
				<DepartureBoard
					journeys={board.data?.journeys ?? []}
					from={board.data?.from.name}
					to={board.data?.to.name}
					loading={ready && board.isPending}
				/>

				{from !== null && to !== null && from.id === to.id && (
					<Message>{text.same}</Message>
				)}
				{ready && board.isPending && <Note>{text.loading}</Note>}
				{board.isError && <Message tone="alert">{text.failed}</Message>}
				{board.data !== undefined && board.data.journeys.length === 0 && (
					<>
						<Message>{text.empty}</Message>
						<Note>{text.scanned(board.data.scanned)}</Note>
					</>
				)}
				{board.data !== undefined && board.data.journeys.length > 0 && (
					<>
						<Note>{text.estimate}</Note>
						{board.data.journeys.length < TRAINS && (
							<Note>
								{text.partial(board.data.journeys.length, board.data.scanned)}
							</Note>
						)}
						{board.data.updatedAt !== null && (
							<Note>{text.updatedAt(board.data.updatedAt)}</Note>
						)}
					</>
				)}
			</main>
		</div>
	);
}

function Message({
	children,
	tone = "muted",
}: {
	children: string;
	tone?: "muted" | "alert";
}) {
	return (
		<p
			className={`rounded-lg border border-board-line bg-board-panel px-4 py-3 text-sm ${
				tone === "alert" ? "text-board-alert" : "text-board-muted"
			}`}
		>
			{children}
		</p>
	);
}

function Note({ children }: { children: string }) {
	return <p className="text-board-muted text-xs">{children}</p>;
}

/**
 * The icon `arrow-down-up` of Lucide, with the ISC licence. `README.md` gives
 * that note.
 */
function ArrowDownUpIcon() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			width="20"
			height="20"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="m3 16 4 4 4-4" />
			<path d="M7 20V4" />
			<path d="m21 8-4-4-4 4" />
			<path d="M17 4v16" />
		</svg>
	);
}

/**
 * The icon `refresh-cw` of Lucide, with the ISC licence. `README.md` gives
 * that note.
 */
function RefreshCwIcon() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			width="18"
			height="18"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
			<path d="M3 3v5h5" />
			<path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
			<path d="M16 16h5v5" />
		</svg>
	);
}
