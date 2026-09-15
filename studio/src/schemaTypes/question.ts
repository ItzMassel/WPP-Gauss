import {defineField, defineType} from 'sanity'

export const question = defineType({
  name: 'question',
  title: 'Frage',
  type: 'document',
  fields: [
    defineField({
      name: 'question',
      title: 'Frage',
      type: 'string',
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
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
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
      }
      return {title, subtitle: typeMap[subtitle] ?? subtitle}
    },
  },
})
