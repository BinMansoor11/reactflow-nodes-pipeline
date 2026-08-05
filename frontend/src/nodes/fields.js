// fields.js
// Field components, keyed by `kind`. Adding a new input type means adding one
// component here and one entry to FIELDS — no node has to know about it.

const control =
  'w-full rounded-md border border-edge-muted bg-white px-2 py-1.5 text-[13px] text-ink ' +
  'outline-none transition-colors placeholder:text-ink-muted/70 focus:border-accent';

const TextField = ({ field, value, onChange }) => (
  <input
    type="text"
    className={control}
    value={value ?? ''}
    placeholder={field.placeholder}
    onChange={(e) => onChange(e.target.value)}
  />
);

const TextAreaField = ({ field, value, onChange }) => (
  <textarea
    className={`${control} resize-none leading-snug`}
    rows={field.rows ?? 3}
    value={value ?? ''}
    placeholder={field.placeholder}
    onChange={(e) => onChange(e.target.value)}
  />
);

const SelectField = ({ field, value, onChange }) => (
  <select
    className={`${control} cursor-pointer appearance-none bg-[length:10px] bg-[right_0.6rem_center] bg-no-repeat pr-7`}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'><path d='M1 1l5 5 5-5' fill='none' stroke='%236B7280' stroke-width='1.5'/></svg>\")",
    }}
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
  >
    {field.options.map((option) => (
      <option key={option} value={option}>
        {option}
      </option>
    ))}
  </select>
);

const NumberField = ({ field, value, onChange }) => (
  <input
    type="number"
    className={control}
    value={value ?? ''}
    min={field.min}
    max={field.max}
    onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
  />
);

// Toggles carry their own label inline, so BaseNode skips the usual label row.
const ToggleField = ({ field, value, onChange }) => (
  <label className="flex cursor-pointer items-center gap-2 text-[12px] text-ink">
    <input
      type="checkbox"
      className="h-3.5 w-3.5 cursor-pointer accent-accent"
      checked={Boolean(value)}
      onChange={(e) => onChange(e.target.checked)}
    />
    {field.label}
  </label>
);

export const FIELDS = {
  text: TextField,
  textarea: TextAreaField,
  select: SelectField,
  number: NumberField,
  toggle: ToggleField,
};

// The type badge in a field's label row is derived from its kind, so no
// definition ever has to restate it.
export const BADGES = {
  text: 'Text',
  textarea: 'Text',
  select: 'Dropdown',
  number: 'Number',
};
