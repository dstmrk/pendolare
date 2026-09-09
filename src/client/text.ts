/**
 * The Italian text of the user interface.
 *
 * The interface is Italian and the code is English. This file is the only place
 * that holds Italian text, thus a change of a word needs one file only.
 */
export const text = {
	title: "PENDOLARE",
	tagline: "I prossimi treni da una stazione all'altra",

	from: "Stazione di partenza",
	to: "Stazione di arrivo",
	fromPlaceholder: "Parti da",
	toPlaceholder: "Vai a",
	swap: "Inverti le due stazioni",
	refresh: "Aggiorna il tabellone",
	soundOn: "Attiva il suono dei flap",
	soundOff: "Disattiva il suono dei flap",
	noStation: "Nessuna stazione con questo nome",

	caption: (from: string, to: string) => `Prossimi treni da ${from} a ${to}`,
	captionEmpty: "Tabellone in attesa delle due stazioni",

	columnTrain: "Treno",
	columnDestination: "Destinazione",
	columnTime: "Orario",
	columnDelay: "Rit",
	columnPlatform: "Bin",
	columnArrival: "Arrivo previsto",
	/** The head of the same column on a telephone. The long head makes that
	    column wider than its five flaps. */
	columnArrivalShort: "Arrivo",

	loading: "Lettura del tabellone di RFI…",
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
