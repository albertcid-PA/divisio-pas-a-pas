export function validateProblem(dividend, divisor) {
  const parsedDividend = Number(dividend);
  const parsedDivisor = Number(divisor);

  if (!Number.isInteger(parsedDividend) || parsedDividend < 0) {
    throw new TypeError("El dividend ha de ser un nombre enter igual o més gran que 0.");
  }
  if (!Number.isInteger(parsedDivisor) || parsedDivisor <= 0) {
    throw new TypeError("El divisor ha de ser un nombre enter més gran que 0.");
  }
  if (parsedDividend > 999999) {
    throw new RangeError("Per mantenir l'operació clara, el dividend pot tenir com a màxim 6 xifres.");
  }
  if (parsedDivisor > 99) {
    throw new RangeError("En aquesta versió, el divisor pot tenir com a màxim 2 xifres.");
  }
  return { dividend: parsedDividend, divisor: parsedDivisor };
}

export function buildDivisionPlan(dividendInput, divisorInput) {
  const { dividend, divisor } = validateProblem(dividendInput, divisorInput);
  const digits = String(dividend).split("").map(Number);
  let current = 0;
  let startIndex = 0;

  for (let index = 0; index < digits.length; index += 1) {
    current = current * 10 + digits[index];
    startIndex = index;
    if (current >= divisor || index === digits.length - 1) break;
  }

  const iterations = [];
  const quotientDigits = [];
  for (let index = startIndex; index < digits.length; index += 1) {
    const quotientDigit = Math.floor(current / divisor);
    const product = quotientDigit * divisor;
    const remainder = current - product;
    const nextDigit = index < digits.length - 1 ? digits[index + 1] : null;

    iterations.push({
      index: iterations.length,
      dividendIndex: index,
      current,
      quotientDigit,
      product,
      remainder,
      nextDigit,
      nextCurrent: nextDigit === null ? null : remainder * 10 + nextDigit
    });
    quotientDigits.push(quotientDigit);
    if (nextDigit !== null) current = remainder * 10 + nextDigit;
  }

  const steps = [];
  for (const iteration of iterations) {
    const base = { iterationIndex: iteration.index, dividendIndex: iteration.dividendIndex };
    steps.push({
      ...base,
      id: `q-${iteration.index}`,
      type: "quotient",
      answer: iteration.quotientDigit,
      current: iteration.current,
      label: `Xifra ${iteration.index + 1} del quocient`
    });
    steps.push({
      ...base,
      id: `p-${iteration.index}`,
      type: "product",
      answer: iteration.product,
      current: iteration.current,
      quotientDigit: iteration.quotientDigit,
      label: `Producte parcial ${iteration.index + 1}`
    });
    steps.push({
      ...base,
      id: `r-${iteration.index}`,
      type: "remainder",
      answer: iteration.remainder,
      current: iteration.current,
      product: iteration.product,
      label: `Resta parcial ${iteration.index + 1}`
    });
    if (iteration.nextDigit !== null) {
      steps.push({
        ...base,
        id: `b-${iteration.index}`,
        type: "bring",
        answer: iteration.nextDigit,
        nextCurrent: iteration.nextCurrent,
        label: `Xifra que baixa al pas ${iteration.index + 1}`
      });
    }
  }

  return {
    dividend,
    divisor,
    digits,
    startIndex,
    iterations,
    steps,
    quotientDigits,
    quotient: Number(quotientDigits.join("")),
    remainder: iterations.at(-1).remainder
  };
}

export function getStepPrompt(step, divisor) {
  switch (step.type) {
    case "quotient":
      return `Quantes vegades cap ${divisor} dins de ${step.current} sense passar-se?`;
    case "product":
      return `Multiplica ${step.quotientDigit} × ${divisor}. Quin producte escrius sota ${step.current}?`;
    case "remainder":
      return `Resta ${step.current} − ${step.product}. Quin residu parcial queda?`;
    case "bring":
      return "Quina és la xifra següent del dividend que has de baixar?";
    default:
      return "Completa el pas següent.";
  }
}

export function getHint(step, divisor, level = 1) {
  const safeLevel = Math.max(1, Math.min(3, level));
  if (safeLevel === 3) return `Escriu ${step.answer}. Després fixa't on queda col·locat.`;

  if (step.type === "quotient") {
    if (safeLevel === 1) return `Busca el múltiple de ${divisor} més gran que no superi ${step.current}.`;
    if (step.answer === 0) return `${divisor} és més gran que ${step.current}; cal conservar el lloc de les unitats al quocient.`;
    return `${divisor} × ${step.answer} no passa de ${step.current}, però ${divisor} × ${step.answer + 1} sí.`;
  }
  if (step.type === "product") {
    return safeLevel === 1
      ? "El producte parcial diu quina quantitat acabes de repartir."
      : `Calcula ${step.quotientDigit} grups de ${divisor}.`;
  }
  if (step.type === "remainder") {
    return safeLevel === 1
      ? "La resta parcial sempre ha de ser més petita que el divisor."
      : `Comença a ${step.current} i treu-ne ${step.product}.`;
  }
  return safeLevel === 1
    ? "Mira el dividend original i avança una columna cap a la dreta."
    : `La xifra que baixes formarà el nombre ${step.nextCurrent}.`;
}

export function isCorrectAnswer(step, value) {
  const clean = String(value).trim();
  if (!/^\d+$/.test(clean)) return false;
  if (clean.length > 1 && clean.startsWith("0")) return false;
  return Number(clean) === step.answer;
}
