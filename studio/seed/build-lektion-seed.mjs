// Erzeugt lektion-extras.ndjson: die Lückentext-/Zuordnungs-/Info-Schritte der Lektion als Sanity-Dokumente
// und hängt sie (zusammen mit den bestehenden Fragen) in die drei Vorlesungen ein.
//
// Import (ersetzt die drei Vorlesungs-Dokumente, legt die neuen Fragen an):
//   cd studio && npx sanity dataset import seed/lektion-extras.ndjson production --replace
import {writeFileSync} from 'node:fs'

const {lessonSteps} = await import(process.argv[2])
const API = 'https://59zxvwfo.apicdn.sanity.io/v2025-01-01/data/query/production'
const q = '*[_type=="lecture"]|order(order asc){_id,_type,title,description,order,questions}'
const {result: lectures} = await (await fetch(`${API}?query=${encodeURIComponent(q)}`)).json()
const byTitle = Object.fromEntries(lectures.map((l) => [l.title, l]))

const key = () => Math.random().toString(16).slice(2, 14)
const docs = []
const add = (doc) => (docs.push(doc), {_type: 'reference', _key: key(), _ref: doc._id})

function toDoc(s) {
  const base = {_type: 'question', _id: `lektion-${s.id}`}
  if (s.kind === 'info')
    return {...base, type: 'info', question: s.title, infoEmblem: s.emblem, infoText: s.text,
      infoFacts: s.facts.map((f) => ({_key: key(), ...f}))}
  if (s.kind === 'fill')
    return {...base, type: 'fill', question: s.prompt, fillTemplate: s.template, fillAnswers: s.answers,
      fillDistractors: s.bank.filter((w) => !s.answers.includes(w)), explanation: s.explanation}
  if (s.kind === 'match')
    return {...base, type: 'match', question: s.prompt, explanation: s.explanation,
      matchPairs: s.pairs.map(([left, right]) => ({_key: key(), left, right}))}
  return null
}

// Wohin welche Schritte gehören (Lektionsabschnitt → Vorlesung)
const TARGET = {Leben: 'Grundwissen Gauß', Weggefährten: 'Grundwissen Gauß', Erfindungen: 'Erfindungen & Tricks', Entdeckungen: 'Erfindungen & Tricks'}
const extras = {}
for (const s of lessonSteps) {
  const doc = toDoc(s)
  if (!doc) continue
  const lecture = TARGET[s.section]
  ;(extras[lecture] ??= []).push(add(doc))
}

const out = [...docs]
for (const l of lectures) {
  const refs = [...(l.questions ?? [])]
  // Info-Karten/Lückentext vorne weg, Rest dahinter – so liest sich die Lektion wie eine Geschichte
  out.push({...l, questions: [...(extras[l.title] ?? []), ...refs]})
}
writeFileSync(new URL('./lektion-extras.ndjson', import.meta.url), out.map((d) => JSON.stringify(d)).join('\n') + '\n')
console.log(`${docs.length} neue Fragen, ${lectures.length} Vorlesungen`)
