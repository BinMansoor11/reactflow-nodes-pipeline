// types.js
// What may be wired into what.
//
// The lattice is deliberately tiny. It exists to stop obvious mistakes — a
// model's prose response feeding a numeric operand — not to model a language.

export const ANY = 'Any';

// target type -> source types it will accept.
// Number widens to Text because everything stringifies; Text does not narrow
// to Number, because most strings are not numbers.
const ACCEPTS = {
  Text: ['Text', 'Number'],
  Number: ['Number'],
};

export const canConnect = (sourceType, targetType) => {
  // An untyped handle is unconstrained rather than incompatible: a node that
  // has not declared types should not become unconnectable.
  if (!sourceType || !targetType) return true;
  if (sourceType === ANY || targetType === ANY) return true;

  return (ACCEPTS[targetType] ?? [targetType]).includes(sourceType);
};
