import {defineField, defineType} from 'sanity'

export const lectureType = defineType({
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
      description: 'Niedrigere Zahlen erscheinen zuerst',
    }),
    defineField({
      name: 'questions',
      title: 'Fragen',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'question'}]}],
    }),
  ],
  orderings: [
    {
      title: 'Reihenfolge',
      name: 'orderAsc',
      by: [{field: 'order', direction: 'asc'}],
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'description',
    },
  },
})
