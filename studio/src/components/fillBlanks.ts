/**
 * Lückentext-Format: `fillTemplate` enthält `{0}`, `{1}` … an den Stellen der Lücken,
 * `fillAnswers[n]` ist das richtige Wort für Lücke n. Hier wird zwischen Wörtern und Lücken umgewandelt.
 */
export interface Token {
  /** Satzzeichen vor dem Wort, z. B. „ oder ( – bleiben außerhalb der Lücke. */
  prefix: string
  /** Das Wort selbst (bei einer Lücke: die richtige Antwort). */
  core: string
  /** Satzzeichen nach dem Wort, z. B. . , ! ? */
  suffix: string
  blank: boolean
}

const TOKEN_RE = /^([„"“(]*)(\{\d+\}|.*?)([.,;:!?"“”)]*)$/u
const PLACEHOLDER_RE = /^\{(\d+)\}$/

export function parse(template: string, answers: string[]): Token[] {
  return template
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const [, prefix, core, suffix] = TOKEN_RE.exec(raw)!
      const placeholder = PLACEHOLDER_RE.exec(core)
      if (placeholder) return {prefix, core: answers[Number(placeholder[1])] ?? '', suffix, blank: true}
      return {prefix, core, suffix, blank: false}
    })
}

export function serialize(tokens: Token[]): {template: string; answers: string[]} {
  const answers: string[] = []
  const template = tokens
    .map((t) => {
      if (!t.blank) return t.prefix + t.core + t.suffix
      answers.push(t.core)
      return `${t.prefix}{${answers.length - 1}}${t.suffix}`
    })
    .join(' ')
  return {template, answers}
}

export function toggleBlank(tokens: Token[], index: number): Token[] {
  return tokens.map((t, i) => (i === index && t.core ? {...t, blank: !t.blank} : t))
}
