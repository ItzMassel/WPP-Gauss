import {defineField, defineType} from 'sanity'

export const lecture = defineType({
  name: 'lecture',
  title: 'Vorlesung',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Titel',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Beschreibung',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'order',
      title: 'Reihenfolge',
      type: 'number',
      description: 'Niedrigere Zahl = weiter oben angezeigt',
    }),
    defineField({
      name: 'questions',
      title: 'Fragen',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'question'}]}],
    }),
  ],
  preview: {
    select: {title: 'title', order: 'order'},
    prepare({title, order}) {
      return {title, subtitle: order !== undefined ? `Reihenfolge: ${order}` : ''}
    },
  },
})
