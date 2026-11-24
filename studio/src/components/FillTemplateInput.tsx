import {Button, Card, Flex, Stack, Text} from '@sanity/ui'
import {set, useDocumentOperation, useFormValue, type StringInputProps} from 'sanity'
import {parse, serialize, toggleBlank} from './fillBlanks'

/**
 * Eingabe für `fillTemplate`: oben den Satz ganz normal tippen, darunter Wörter anklicken,
 * um sie zu Lücken zu machen. Setzt `fillTemplate` ({0}, {1} …) und `fillAnswers` gemeinsam.
 */
export function FillTemplateInput(props: StringInputProps) {
  const {value = '', onChange, renderDefault} = props
  const answers = (useFormValue(['fillAnswers']) as string[] | undefined) ?? []
  const docId = (useFormValue(['_id']) as string | undefined) ?? ''
  const {patch} = useDocumentOperation(docId.replace(/^drafts\./, ''), 'question')

  const tokens = parse(value, answers)

  function handleToggle(index: number) {
    const {template, answers: nextAnswers} = serialize(toggleBlank(tokens, index))
    if (patch.disabled) {
      // Dokument noch nicht angelegt: nur den Text setzen, die Wörter dann unten von Hand eintragen.
      onChange(set(template))
      return
    }
    patch.execute([{set: {fillTemplate: template, fillAnswers: nextAnswers}}])
  }

  return (
    <Stack space={3}>
      {renderDefault(props)}
      <Card padding={3} radius={2} border>
        <Stack space={3}>
          <Text size={1} muted>
            Lücken setzen: Wort anklicken = Lücke, nochmal anklicken = wieder Text.
          </Text>
          {tokens.length === 0 ? (
            <Text size={1} muted>
              Tippe oben zuerst den ganzen Satz ein.
            </Text>
          ) : (
            <Flex wrap="wrap" gap={2}>
              {tokens.map((t, i) => (
                <Button
                  key={i}
                  mode={t.blank ? 'default' : 'ghost'}
                  tone={t.blank ? 'primary' : 'default'}
                  padding={2}
                  fontSize={1}
                  text={t.blank ? `[ ${t.core || '?'} ]` : t.core || `${t.prefix}${t.suffix}`}
                  disabled={!t.core}
                  onClick={() => handleToggle(i)}
                />
              ))}
            </Flex>
          )}
        </Stack>
      </Card>
    </Stack>
  )
}
