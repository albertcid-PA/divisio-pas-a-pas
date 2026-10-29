import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDivisionPlan,
  getHint,
  isCorrectAnswer,
  validateProblem
} from "../dist/logic.mjs";

test("resol una divisió exacta d'una xifra", () => {
  const plan = buildDivisionPlan(84, 4);
  assert.equal(plan.quotient, 21);
  assert.equal(plan.remainder, 0);
  assert.deepEqual(plan.quotientDigits, [2, 1]);
  assert.deepEqual(plan.iterations.map((item) => item.current), [8, 4]);
});

test("conserva un zero interior al quocient", () => {
  const plan = buildDivisionPlan(1005, 5);
  assert.equal(plan.quotient, 201);
  assert.deepEqual(plan.quotientDigits, [2, 0, 1]);
  assert.equal(plan.steps.find((step) => step.id === "q-1").answer, 0);
});

test("tracta el dividend menor que el divisor", () => {
  const plan = buildDivisionPlan(3, 7);
  assert.equal(plan.quotient, 0);
  assert.equal(plan.remainder, 3);
  assert.deepEqual(plan.steps.map((step) => step.type), ["quotient", "product", "remainder"]);
});

test("calcula divisions amb residu", () => {
  const plan = buildDivisionPlan(116, 5);
  assert.equal(plan.quotient, 23);
  assert.equal(plan.remainder, 1);
  assert.deepEqual(plan.iterations.map((item) => item.remainder), [1, 1]);
});

test("admet zero com a dividend", () => {
  const plan = buildDivisionPlan(0, 5);
  assert.equal(plan.quotient, 0);
  assert.equal(plan.remainder, 0);
});

test("el motor ja admet divisors de dues xifres", () => {
  const plan = buildDivisionPlan(130, 10);
  assert.equal(plan.quotient, 13);
  assert.equal(plan.remainder, 0);
  assert.deepEqual(plan.quotientDigits, [1, 3]);
});

test("conserva zeros al quocient amb un divisor de dues xifres", () => {
  const plan = buildDivisionPlan(1205, 12);
  assert.equal(plan.quotient, 100);
  assert.equal(plan.remainder, 5);
  assert.deepEqual(plan.quotientDigits, [1, 0, 0]);
});

test("crea un pas explícit per cada xifra que baixa", () => {
  const plan = buildDivisionPlan(248, 8);
  const bringSteps = plan.steps.filter((step) => step.type === "bring");
  assert.deepEqual(bringSteps.map((step) => step.answer), [8]);
});

test("valida els límits i rebutja divisors zero", () => {
  assert.deepEqual(validateProblem("125", "5"), { dividend: 125, divisor: 5 });
  assert.throws(() => validateProblem(-1, 5), /dividend/i);
  assert.throws(() => validateProblem(10, 0), /divisor/i);
  assert.throws(() => validateProblem(10, 100), /màxim 2 xifres/i);
});

test("no accepta zeros inicials ni text com a resposta", () => {
  const step = buildDivisionPlan(84, 4).steps[0];
  assert.equal(isCorrectAnswer(step, "2"), true);
  assert.equal(isCorrectAnswer(step, "02"), false);
  assert.equal(isCorrectAnswer(step, "dos"), false);
});

test("les pistes progressen fins a revelar el pas", () => {
  const step = buildDivisionPlan(84, 4).steps[0];
  assert.match(getHint(step, 4, 1), /múltiple/);
  assert.match(getHint(step, 4, 2), /4 × 2/);
  assert.match(getHint(step, 4, 3), /Escriu 2/);
});
