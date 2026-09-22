export interface MathQuestion {
  text: string
  answer: number
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function additionQuestion(): MathQuestion {
  const a = randInt(2, 50)
  const b = randInt(2, 50)
  return {text: `${a} + ${b} = ?`, answer: a + b}
}

function subtractionQuestion(): MathQuestion {
  const a = randInt(10, 90)
  const b = randInt(1, a)
  return {text: `${a} - ${b} = ?`, answer: a - b}
}

function multiplicationQuestion(): MathQuestion {
  const a = randInt(2, 12)
  const b = randInt(2, 12)
  return {text: `${a} × ${b} = ?`, answer: a * b}
}

function gaussSumQuestion(): MathQuestion {
  const n = randInt(10, 100)
  return {text: `1 + 2 + ... + ${n} = ?`, answer: (n * (n + 1)) / 2}
}

const generators = [additionQuestion, subtractionQuestion, multiplicationQuestion, gaussSumQuestion]

export function randomQuestion(): MathQuestion {
  const generator = generators[randInt(0, generators.length - 1)]
  return generator()
}
