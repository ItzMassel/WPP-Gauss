import {defineField, defineType} from 'sanity'

export const eventType = defineType({
  name: 'question',
  title: 'Question',
  type: 'document',
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
      type: 'string',
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          {title: 'Text', value: 'text'},
          {title: 'Multiple Choice', value: 'multiplechoice'},
          {title: 'Sort', value: 'sort'},
          {title: 'Guess', value: 'guess'},
          {title: 'Yes / No', value: 'yesno'},
        ],
      },
    }),

    // Multiple choice: options with correct flag
    defineField({
      name: 'options',
      title: 'Answer Options',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({name: 'label', title: 'Answer', type: 'string'}),
            defineField({name: 'correct', title: 'Correct?', type: 'boolean'}),
          ],
          preview: {
            select: {title: 'label', subtitle: 'correct'},
            prepare: ({title, subtitle}) => ({
              title,
              subtitle: subtitle ? '✓ Correct' : '',
            }),
          },
        },
      ],
      hidden: ({document}) => document?.type !== 'multiplechoice',
    }),

    // Sort: items in the correct order
    defineField({
      name: 'sortItems',
      title: 'Items (in correct order)',
      type: 'array',
      of: [{type: 'string'}],
      hidden: ({document}) => document?.type !== 'sort',
    }),

    // Guess: the correct number and range
    defineField({
      name: 'correctNumber',
      title: 'Correct Number',
      type: 'number',
      hidden: ({document}) => document?.type !== 'guess',
    }),
    defineField({
      name: 'rangeMin',
      title: 'Range Min',
      type: 'number',
      hidden: ({document}) => document?.type !== 'guess',
    }),
    defineField({
      name: 'rangeMax',
      title: 'Range Max',
      type: 'number',
      hidden: ({document}) => document?.type !== 'guess',
    }),

    // Yes / No: which is correct
    defineField({
      name: 'correctAnswer',
      title: 'Correct Answer',
      type: 'boolean',
      options: {
        layout: 'checkbox',
      },
      description: 'Checked = Yes, Unchecked = No',
      hidden: ({document}) => document?.type !== 'yesno',
    }),
  ],
})
