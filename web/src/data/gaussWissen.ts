// Inhalte für die Lernseite „Gauß: Leben, Werk und Weggefährten“ (/wissen)

export type Question =
  | {id: string; kind: 'choice'; prompt: string; options: string[]; correct: number; explanation: string}
  | {id: string; kind: 'yesno'; prompt: string; correct: boolean; explanation: string}
  | {id: string; kind: 'number'; prompt: string; correct: number; explanation: string}
  | {id: string; kind: 'sort'; prompt: string; items: string[]; explanation: string} // items in korrekter Reihenfolge

export interface LearnCard {
  title: string
  text: string
  tag?: string
}

export interface LearnSection {
  key: 'leben' | 'weggefaehrten' | 'werk'
  label: string
  cards: LearnCard[]
}

export const LEARN_SECTIONS: LearnSection[] = [
  {
    key: 'leben',
    label: 'Leben',
    cards: [
      {
        tag: '1777',
        title: 'Geboren in Braunschweig',
        text: 'Carl Friedrich Gauß wird am 30. April 1777 in Braunschweig geboren.',
      },
      {
        tag: '1855',
        title: 'Gestorben in Göttingen',
        text: 'Er stirbt am 23. Februar 1855 in Göttingen – mit 77 Jahren, im 78. Lebensjahr.',
      },
      {
        tag: 'Titel',
        title: 'Princeps mathematicorum',
        text: 'Mit dem Ehrentitel „Princeps mathematicorum“ – „Fürst der Mathematiker“ – würdigt man sein Lebenswerk.',
      },
    ],
  },
  {
    key: 'weggefaehrten',
    label: 'Weggefährten',
    cards: [
      {
        tag: 'Astronom',
        title: 'Heinrich Christian Schumacher',
        text: 'Astronom in Altona und enger Briefpartner. Seine dänische Gradmessung und Gauß’ hannoversche Landesvermessung ergänzten sich.',
      },
      {
        tag: 'Naturforscher',
        title: 'Alexander von Humboldt',
        text: 'Forschungsreisender und Naturforscher. Er lud Gauß 1828 nach Berlin ein; beide trieben die Erforschung des Erdmagnetismus voran.',
      },
      {
        tag: 'Arzt & Astronom',
        title: 'Heinrich Wilhelm Olbers',
        text: 'Bremer Arzt und Astronom. Mit Gauß’ Bahnberechnung fand er den Planetoiden Ceres am 1. Januar 1802 wieder.',
      },
      {
        tag: 'Mathematiker',
        title: 'Farkas und János Bolyai',
        text: 'Farkas Bolyai war Gauß’ Studienfreund in Göttingen. Sein Sohn János entwickelte eine nichteuklidische Geometrie.',
      },
    ],
  },
  {
    key: 'werk',
    label: 'Erfindungen & Entdeckungen',
    cards: [
      {
        tag: '1833',
        title: 'Der erste elektromagnetische Telegraf',
        text: 'Gemeinsam mit dem Physiker Wilhelm Weber baut Gauß 1833 in Göttingen den ersten elektromagnetischen Telegrafen.',
      },
      {
        tag: 'Vermessung',
        title: 'Das Heliotrop',
        text: 'Der „Sonnenwendspiegel“ wirft Sonnenlicht gebündelt über große Entfernungen zurück – ein Messziel für die hannöversche Landesvermessung.',
      },
      {
        tag: '1796',
        title: 'Das regelmäßige Siebzehneck',
        text: 'Als 19-Jähriger zeigt Gauß: Das regelmäßige 17-Eck lässt sich allein mit Zirkel und Lineal konstruieren.',
      },
      {
        tag: '5050',
        title: 'Der „kleine Gauß“',
        text: '1 + 2 + … + 100 = 50 Paare mit der Summe 101 = 5050. Allgemein: 1 + 2 + … + n = n · (n + 1) / 2.',
      },
    ],
  },
]

export const QUESTIONS: Question[] = [
  {
    id: 'geburt',
    kind: 'choice',
    prompt: 'Wann und wo wurde Carl Friedrich Gauß geboren?',
    options: ['1777 in Braunschweig', '1777 in Göttingen', '1755 in Hannover', '1801 in Bremen'],
    correct: 0,
    explanation: 'Gauß wurde am 30. April 1777 in Braunschweig geboren.',
  },
  {
    id: 'tod',
    kind: 'choice',
    prompt: 'Wo starb Gauß im Jahr 1855?',
    options: ['In Göttingen', 'In Braunschweig', 'In Berlin', 'In Altona'],
    correct: 0,
    explanation: 'Gauß starb am 23. Februar 1855 in Göttingen, wo er jahrzehntelang als Professor und Sternwarten-Direktor wirkte.',
  },
  {
    id: 'alter',
    kind: 'number',
    prompt: 'Wie viele Lebensjahre hatte Gauß vollendet, als er starb?',
    correct: 77,
    explanation:
      '1855 − 1777 = 78, aber sein Geburtstag (30. April) lag nach seinem Todestag (23. Februar). Er wurde also 77 Jahre alt und starb im 78. Lebensjahr.',
  },
  {
    id: 'titel',
    kind: 'choice',
    prompt: 'Welcher Ehrentitel wird Gauß verliehen?',
    options: [
      'Princeps mathematicorum – Fürst der Mathematiker',
      'Magister geometriae – Meister der Geometrie',
      'Rex numerorum – König der Zahlen',
      'Doctor universalis – Allgemeiner Lehrer',
    ],
    correct: 0,
    explanation: '„Princeps mathematicorum“ bedeutet „Fürst der Mathematiker“.',
  },
  {
    id: 'summe',
    kind: 'number',
    prompt: 'Wie lautet die Summe aller Zahlen von 1 bis 100? (Die Aufgabe des „kleinen Gauß“)',
    correct: 5050,
    explanation: '1 + 2 + … + 100 = 100 · 101 / 2 = 5050.',
  },
  {
    id: 'summe-trick',
    kind: 'choice',
    prompt: 'Wie löste der „kleine Gauß“ die Aufgabe so schnell?',
    options: [
      'Er bildete 50 Paare mit jeweils der Summe 101 (1 + 100, 2 + 99, …)',
      'Er addierte alle 100 Zahlen der Reihe nach im Kopf',
      'Er multiplizierte 10 mit 10 und fügte 4950 hinzu',
      'Er kannte das Ergebnis aus einem Rechenbuch',
    ],
    correct: 0,
    explanation: '50 Paare · 101 = 5050. Die Formel dahinter: n · (n + 1) / 2.',
  },
  {
    id: 'siebzehneck',
    kind: 'choice',
    prompt: 'Welche Entdeckung gelang Gauß als 19-Jährigem im Jahr 1796?',
    options: [
      'Das regelmäßige Siebzehneck lässt sich mit Zirkel und Lineal konstruieren',
      'Das regelmäßige Siebzehneck lässt sich nicht konstruieren',
      'Der Kreis lässt sich in ein Quadrat gleicher Fläche verwandeln',
      'Jeder Winkel lässt sich mit Zirkel und Lineal in drei gleiche Teile teilen',
    ],
    correct: 0,
    explanation:
      'Gauß wies nach, dass das regelmäßige 17-Eck allein mit Zirkel und Lineal konstruierbar ist. Er war so stolz darauf, dass er sich angeblich ein 17-Eck auf den Grabstein wünschte.',
  },
  {
    id: 'antike',
    kind: 'yesno',
    prompt: 'Die Konstruierbarkeit des regelmäßigen Siebzehnecks war schon den Griechen der Antike bekannt.',
    correct: false,
    explanation: 'Nein – seit der Antike war kein neues konstruierbares Vieleck gefunden worden. Gauß’ Nachweis war nach rund 2000 Jahren ein echter Durchbruch.',
  },
  {
    id: 'telegraf-partner',
    kind: 'choice',
    prompt: 'Mit welchem Physiker erfand Gauß in Göttingen den ersten elektromagnetischen Telegrafen?',
    options: ['Wilhelm Weber', 'Alexander von Humboldt', 'Heinrich Wilhelm Olbers', 'János Bolyai'],
    correct: 0,
    explanation: 'Gemeinsam mit Wilhelm Weber verband Gauß die Sternwarte mit dem Physikalischen Kabinett durch eine Telegrafenleitung.',
  },
  {
    id: 'telegraf-jahr',
    kind: 'number',
    prompt: 'In welchem Jahr wurde der erste elektromagnetische Telegraf von Gauß und Weber erfunden?',
    correct: 1833,
    explanation: '1833 – in Göttingen.',
  },
  {
    id: 'heliotrop',
    kind: 'choice',
    prompt: 'Wofür erfand Gauß das Heliotrop („Sonnenwendspiegel“)?',
    options: [
      'Für die hannöversche Landesvermessung: Es reflektiert Sonnenlicht als weithin sichtbares Messziel',
      'Um die Uhrzeit anhand des Sonnenstands zu bestimmen',
      'Um Strom aus Sonnenlicht zu gewinnen',
      'Um Sternbilder am Tageshimmel zu zeichnen',
    ],
    correct: 0,
    explanation: 'Mit dem Heliotrop konnten weit entfernte Messpunkte bei der Triangulation genau anvisiert werden.',
  },
  {
    id: 'schumacher',
    kind: 'choice',
    prompt: 'Wer war Heinrich Christian Schumacher?',
    options: [
      'Astronom in Altona und enger Briefpartner von Gauß',
      'Physiker und Erfinder des Telegrafen',
      'Ungarischer Mathematiker',
      'Forschungsreisender in Südamerika',
    ],
    correct: 0,
    explanation: 'Schumacher leitete die Sternwarte in Altona; sein reger Briefwechsel mit Gauß ist eine wichtige Quelle für dessen Arbeit.',
  },
  {
    id: 'olbers',
    kind: 'choice',
    prompt: 'Welcher Bremer Arzt und Astronom fand 1802 mithilfe von Gauß’ Bahnberechnung den Planetoiden Ceres wieder?',
    options: ['Heinrich Wilhelm Olbers', 'Heinrich Christian Schumacher', 'Farkas Bolyai', 'Wilhelm Weber'],
    correct: 0,
    explanation: 'Olbers beobachtete Ceres am 1. Januar 1802 – dank der Bahnberechnung des jungen Gauß.',
  },
  {
    id: 'humboldt',
    kind: 'choice',
    prompt: 'Wer war Alexander von Humboldt für Gauß?',
    options: [
      'Naturforscher und Förderer – beide trieben die Erforschung des Erdmagnetismus voran',
      'Sein Lehrer in der Grundschule',
      'Ein Konkurrent, der den Telegrafen erfand',
      'Ein Mathematiker, der die nichteuklidische Geometrie entwickelte',
    ],
    correct: 0,
    explanation: 'Humboldt lud Gauß 1828 nach Berlin ein. Beide trieben die Erforschung des Erdmagnetismus voran.',
  },
  {
    id: 'bolyai',
    kind: 'choice',
    prompt: 'Welche Verbindung bestand zwischen Gauß und den Bolyais?',
    options: [
      'Farkas Bolyai war sein Studienfreund; dessen Sohn János entwickelte eine nichteuklidische Geometrie',
      'Die Bolyais waren seine Nachfolger an der Göttinger Sternwarte',
      'János Bolyai baute mit Gauß den Telegrafen',
      'Farkas Bolyai war sein Lehrer in Braunschweig',
    ],
    correct: 0,
    explanation: 'Farkas Bolyai und Gauß kannten sich aus Göttingen. Gauß hatte selbst über nichteuklidische Geometrie nachgedacht, aber nichts veröffentlicht.',
  },
  {
    id: 'chronologie',
    kind: 'sort',
    prompt: 'Bringe diese Stationen in die richtige zeitliche Reihenfolge.',
    items: [
      'Geburt in Braunschweig (1777)',
      'Konstruktion des Siebzehnecks (1796)',
      'Telegraf mit Wilhelm Weber (1833)',
      'Tod in Göttingen (1855)',
    ],
    explanation: '1777 → 1796 → 1833 → 1855.',
  },
]
