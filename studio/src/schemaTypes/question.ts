import {defineField, defineType} from 'sanity'
import {FillTemplateInput} from '../components/FillTemplateInput'

export const question = defineType({
  name: 'question',
  title: 'Frage',
  type: 'document',
  fields: [
    defineField({
      name: 'question',
      title: 'Frage / Aufgabe / Titel',
      type: 'string',
      description: 'Bei Lückentext und Zuordnung die Aufgabenstellung, bei Info-Karten die Überschrift.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'type',
      title: 'Fragetyp',
      type: 'string',
      options: {
        list: [
          {title: 'Multiple Choice', value: 'multiplechoice'},
          {title: 'Ja / Nein', value: 'yesno'},
          {title: 'Schätzfrage', value: 'guess'},
          {title: 'Sortierung', value: 'sort'},
          {title: 'Freitext', value: 'text'},
          {title: 'Lückentext (nur Lektion)', value: 'fill'},
          {title: 'Zuordnung (nur Lektion)', value: 'match'},
          {title: 'Info-Karte (nur Lektion)', value: 'info'},
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'multipleCorrect',
      title: 'Mehrere richtige Antworten möglich?',
      type: 'boolean',
      initialValue: false,
      description:
        'Nicht angehakt = nur eine Antwort auswählbar (Radio-Button). Angehakt = mehrere Antworten auswählbar (Checkbox).',
      hidden: ({document}) => document?.type !== 'multiplechoice',
    }),
    defineField({
      name: 'options',
      title: 'Antwortoptionen',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({name: 'label', title: 'Antworttext', type: 'string', validation: (Rule) => Rule.required()}),
            defineField({name: 'correct', title: 'Richtig?', type: 'boolean', initialValue: false}),
          ],
          preview: {
            select: {title: 'label', subtitle: 'correct'},
            prepare({title, subtitle}) {
              return {title, subtitle: subtitle ? '✓ Richtig' : '✗ Falsch'}
            },
          },
        },
      ],
      hidden: ({document}) => document?.type !== 'multiplechoice',
    }),
    defineField({
      name: 'correctAnswer',
      title: 'Richtige Antwort (Ja = true, Nein = false)',
      type: 'boolean',
      hidden: ({document}) => document?.type !== 'yesno',
    }),
    defineField({
      name: 'correctNumber',
      title: 'Richtige Zahl',
      type: 'number',
      hidden: ({document}) => document?.type !== 'guess',
    }),
    defineField({
      name: 'rangeMin',
      title: 'Bereich: Minimum (optional)',
      type: 'number',
      hidden: ({document}) => document?.type !== 'guess',
    }),
    defineField({
      name: 'rangeMax',
      title: 'Bereich: Maximum (optional)',
      type: 'number',
      hidden: ({document}) => document?.type !== 'guess',
    }),
    defineField({
      name: 'sortItems',
      title: 'Elemente zum Sortieren (in richtiger Reihenfolge)',
      type: 'array',
      of: [{type: 'string'}],
      hidden: ({document}) => document?.type !== 'sort',
    }),
    defineField({
      name: 'fillTemplate',
      title: 'Lückentext',
      type: 'string',
      description: 'Ganzen Satz eintippen, dann unten die Wörter anklicken, die Lücken sein sollen. (Intern: {0}, {1} … = Lücken.)',
      components: {input: FillTemplateInput},
      hidden: ({document}) => document?.type !== 'fill',
    }),
    defineField({
      name: 'fillAnswers',
      title: 'Richtige Wörter (Reihenfolge = Lücke 0, 1 …)',
      type: 'array',
      of: [{type: 'string'}],
      hidden: ({document}) => document?.type !== 'fill',
    }),
    defineField({
      name: 'fillDistractors',
      title: 'Ablenker (falsche Wörter in der Wortbank)',
      type: 'array',
      of: [{type: 'string'}],
      hidden: ({document}) => document?.type !== 'fill',
    }),
    defineField({
      name: 'matchPairs',
      title: 'Paare (links ↔ rechts)',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({name: 'left', title: 'Links', type: 'string', validation: (Rule) => Rule.required()}),
            defineField({name: 'right', title: 'Rechts', type: 'string', validation: (Rule) => Rule.required()}),
          ],
          preview: {
            select: {title: 'left', subtitle: 'right'},
          },
        },
      ],
      hidden: ({document}) => document?.type !== 'match',
    }),
    defineField({
      name: 'infoEmblem',
      title: 'Emblem (kurz, z. B. „1777–1855“ oder „17“)',
      type: 'string',
      hidden: ({document}) => document?.type !== 'info',
    }),
    defineField({
      name: 'infoText',
      title: 'Text',
      type: 'text',
      rows: 4,
      hidden: ({document}) => document?.type !== 'info',
    }),
    defineField({
      name: 'infoFacts',
      title: 'Fakten',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({name: 'label', title: 'Bezeichnung', type: 'string', validation: (Rule) => Rule.required()}),
            defineField({name: 'value', title: 'Wert', type: 'string', validation: (Rule) => Rule.required()}),
          ],
          preview: {
            select: {title: 'label', subtitle: 'value'},
          },
        },
      ],
      hidden: ({document}) => document?.type !== 'info',
    }),
    defineField({
      name: 'explanation',
      title: 'Erklärung (optional, wird in der Lektion nach der Antwort gezeigt)',
      type: 'text',
      rows: 2,
      hidden: ({document}) => document?.type === 'info',
    }),
  ],
  preview: {
    select: {title: 'question', subtitle: 'type'},
    prepare({title, subtitle}) {
      const typeMap: Record<string, string> = {
        multiplechoice: 'Multiple Choice',
        yesno: 'Ja / Nein',
        guess: 'Schätzfrage',
        sort: 'Sortierung',
        text: 'Freitext',
        fill: 'Lückentext',
        match: 'Zuordnung',
        info: 'Info-Karte',
      }
      return {title, subtitle: typeMap[subtitle] ?? subtitle}
    },
  },
})
