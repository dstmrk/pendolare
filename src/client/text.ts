/**
 * The Italian text of the user interface.
 *
 * The interface is Italian and the code is English. This file is the only place
 * that holds Italian text, thus a change of a word needs one file only.
 */
export const text = {
	title: "PENDOLARE",
	tagline: "I prossimi treni da una stazione all'altra",

	from: "Partenza",
	to: "Arrivo",
	fromPlaceholder: "Cerca la stazione di partenza",
	toPlaceholder: "Cerca la stazione di arrivo",
	swap: "Inverti le due stazioni",
	noStation: "Nessuna stazione con questo nome",

	caption: (from: string, to: string) => `Prossimi treni da ${from} a ${to}`,

	columnTrain: "Treno",
	columnDestination: "Destinazione",
	columnTime: "Orario",
	columnDelay: "Ritardo",
	columnPlatform: "Binario",
	columnLeaving: "In partenza",
	columnArrival: "Arrivo previsto",

	loading: "Lettura del tabellone…",
	empty:
		"Nessuno dei prossimi treni in partenza ferma alla stazione di arrivo.",
	failed: "Il monitor di RFI non risponde. Riprova fra poco.",
	same: "Scegli due stazioni diverse.",

	updatedAt: (moment: string) => `Dati RFI del ${moment}`,
	estimate:
		"L'orario di arrivo è calcolato: orario di lavagna più il ritardo alla partenza. Il ritardo può cambiare lungo il percorso.",
	scanned: (rows: number) =>
		`Il tabellone di RFI mostra ${rows} treni: un treno più tardi può non essere ancora in elenco.`,
	partial: (found: number, rows: number) =>
		found === 1
			? `Un solo treno fra i ${rows} del tabellone di RFI ferma alla stazione di arrivo.`
			: `Solo ${found} treni fra i ${rows} del tabellone di RFI fermano alla stazione di arrivo.`,
} as const;
