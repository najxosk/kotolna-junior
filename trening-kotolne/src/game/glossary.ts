export interface GlossaryTerm {
  id: string;
  title: string;
  body: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    id: "teleso",
    title: "Kotlové teleso",
    body: "Nádoba, v ktorej sa ohrieva voda. Oheň je vonku (v horáku), voda vnútri. Teleso musí byť vždy zaplavené — inak sa kov prehreje.",
  },
  {
    id: "horak",
    title: "Horák",
    body: "Miesto, kde sa plyn mieša so vzduchom a horí. Bez paliva niet tepla. Bez zážihu plyn len uniká a nehreje.",
  },
  {
    id: "vzduchak",
    title: "Vzduchák / ventilátor",
    body: "Prináša kyslík k plameňu. Málo vzduchu = dym a neúplné spaľovanie. Veľa vzduchu = plameň sa chladí a teplo uletí do komína.",
  },
  {
    id: "dymak",
    title: "Dymák",
    body: "Cesta spalín z horáka do komína. Keď je zanesený alebo zatvorený, dym ide do kotolne namiesto hore.",
  },
  {
    id: "tah",
    title: "Ťah komína",
    body: "Sila, ktorou komín odsáva spaliny. Slabý ťah = dym a zlý oheň. Priveľký ťah = teplo sa vyťahuje von skôr, než zohreje vodu.",
  },
  {
    id: "poistka",
    title: "Poistný ventil",
    body: "Posledná poistka proti pretlaku. Keď teplota a tlak rastú a teplo nemá kam ísť, ventil pustí paru. V hre to je signál, že si niečo nastavil zle — nie návod, ako to skúšať.",
  },
  {
    id: "cerpadlo",
    title: "Obehové čerpadlo",
    body: "Točí vodu medzi kotlom a radiátormi. Bez neho kotol vrie a izby ostávajú studené. Teplo treba odviesť, nielen vyrobiť.",
  },
  {
    id: "ucinnost",
    title: "Účinnosť",
    body: "Koľko tepla z paliva naozaj ostane v vode. Dobrá účinnosť = správny pomer plyn/vzduch, pokojný ťah, čistý výmenník a obeh, ktorý teplo odnesie.",
  },
];
