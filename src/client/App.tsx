import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { type StationSummary, TRAINS } from "../shared/api.ts";
import { DepartureBoard } from "./components/board/DepartureBoard.tsx";
import { SplitFlapText } from "./components/board/SplitFlapText.tsx";
import { SoundToggle } from "./components/SoundToggle.tsx";
import { StationField } from "./components/StationField.tsx";
import { Button } from "./components/ui/button.tsx";
import { fetchJourneys } from "./lib/api.ts";
import { armSound } from "./lib/sound.ts";
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

	const [from, setFrom] = useState<StationSummary | null>(null);
	const [to, setTo] = useState<StationSummary | null>(null);

	const ready = from !== null && to !== null && from.id !== to.id;
	const board = useQuery({
		queryKey: ["journeys", from?.id, to?.id],
		queryFn: () => fetchJourneys(from?.id ?? 0, to?.id ?? 0),
		enabled: ready,
		refetchInterval: REFRESH,
	});

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
				<section className="grid gap-4 sm:grid-cols-2">
					<StationField
						label={text.from}
						placeholder={text.fromPlaceholder}
						value={from}
						onChange={setFrom}
					/>
					<StationField
						label={text.to}
						placeholder={text.toPlaceholder}
						value={to}
						onChange={setTo}
					/>
				</section>

				<div className="flex gap-3">
					<Button
						variant="outline"
						disabled={from === null && to === null}
						onClick={() => {
							setFrom(to);
							setTo(from);
						}}
					>
						{text.swap}
					</Button>
					<Button
						variant="outline"
						disabled={!ready || board.isFetching}
						onClick={() => board.refetch()}
					>
						{text.refresh}
					</Button>
				</div>
			</div>

			{/* The board is always on the page. Before the first answer it shows
			    its rows with no character, as an empty board of a station, and
			    its flaps turn when the answer arrives. */}
			<main className="flex flex-col gap-3">
				<DepartureBoard
					journeys={board.data?.journeys ?? []}
					from={board.data?.from.name}
					to={board.data?.to.name}
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
