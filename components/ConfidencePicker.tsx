"use client";

export type ConfidenceValue = "guessing" | "fairly_sure" | "very_sure";

const CHOICES: { value: ConfidenceValue; label: string }[] = [
  { value: "guessing", label: "🤔 Guessing" },
  { value: "fairly_sure", label: "🙂 Fairly sure" },
  { value: "very_sure", label: "😎 Very sure" },
];

export function ConfidencePicker({
  value,
  onChange,
  disabled,
}: {
  value: ConfidenceValue | null;
  onChange: (v: ConfidenceValue) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-800">How sure are you?</legend>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {CHOICES.map((c) => (
          <button
            key={c.value}
            type="button"
            disabled={disabled}
            aria-pressed={value === c.value}
            onClick={() => onChange(c.value)}
            className={`rounded-lg border px-2 py-2 text-sm font-medium transition ${
              value === c.value
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
