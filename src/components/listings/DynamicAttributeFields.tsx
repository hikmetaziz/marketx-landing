import type {
  ListingAttributeValues,
  TaxonomyAttributeDefinition,
} from "@/lib/taxonomy/listing-taxonomy-types";
import { dedupeOptions } from "@/lib/category-schema/resolve-category-options";

type DynamicAttributeFieldsProps = {
  definitions: TaxonomyAttributeDefinition[];
  values: ListingAttributeValues;
  disabled?: boolean;
  subcategorySelected?: boolean;
  onChange: (key: string, value: ListingAttributeValues[string]) => void;
};

const fieldClass =
  "w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-brand-text outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15";

function valueToString(value: ListingAttributeValues[string]): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return "";
}

function isTextInputType(definition: TaxonomyAttributeDefinition): boolean {
  return (
    definition.type === "text" ||
    definition.type === "searchable_text"
  );
}

function isDropdownInputType(definition: TaxonomyAttributeDefinition): boolean {
  return (
    definition.type === "searchable_select" ||
    definition.type === "dependent_select"
  );
}

function isDependencyMissing(
  definition: TaxonomyAttributeDefinition,
  values: ListingAttributeValues,
  subcategorySelected: boolean,
): boolean {
  if (definition.depends_on === "subcategory") {
    return !subcategorySelected;
  }
  if (!definition.depends_on) {
    return false;
  }
  return (
    !valueToString(values[definition.depends_on]).trim() &&
    !valueToString(values[definition.key]).trim()
  );
}

function isSelected(value: ListingAttributeValues[string], option: string): boolean {
  if (Array.isArray(value)) {
    return value.includes(option);
  }
  return value === option;
}

function toggleMultiValue(value: ListingAttributeValues[string], option: string): string[] {
  const current = Array.isArray(value) ? value : [];
  return current.includes(option) ? current.filter((item) => item !== option) : [...current, option];
}

function chipClass(active: boolean): string {
  return [
    "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
    active
      ? "border-brand-primary bg-brand-primary-light text-brand-primary-dark"
      : "border-brand-border bg-white text-brand-muted hover:border-brand-primary/30",
  ].join(" ");
}

export function DynamicAttributeFields({
  definitions,
  values,
  disabled = false,
  subcategorySelected = false,
  onChange,
}: DynamicAttributeFieldsProps) {
  if (definitions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 border-t border-brand-border pt-4">
      <h3 className="text-sm font-bold text-brand-text">Əlavə detallar</h3>
      {definitions.map((definition) => {
        const value = values[definition.key] ?? null;
        const label = definition.is_required ? `${definition.label_az} *` : definition.label_az;
        const options = dedupeOptions(definition.options);

        if (definition.type === "boolean") {
          return (
            <label
              key={definition.id}
              className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-surface px-4 py-3"
            >
              <span className="text-sm font-semibold text-brand-text">{label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={value === true}
                disabled={disabled}
                onClick={() => onChange(definition.key, value !== true)}
                className={`relative h-7 w-12 rounded-full transition-colors ${value === true ? "bg-brand-primary" : "bg-brand-border"}`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${value === true ? "translate-x-5" : "translate-x-0.5"}`}
                />
              </button>
            </label>
          );
        }

        if (definition.type === "select" || definition.type === "multi_select") {
          return (
            <div key={definition.id}>
              <p className="mb-2 text-sm font-semibold text-brand-text">{label}</p>
              <div className="flex flex-wrap gap-2">
                {options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onChange(
                        definition.key,
                        definition.type === "multi_select"
                          ? toggleMultiValue(value, option)
                          : option,
                      )
                    }
                    className={chipClass(isSelected(value, option))}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          );
        }

        if (definition.type === "textarea") {
          return (
            <div key={definition.id}>
              <label className="mb-2 block text-sm font-semibold text-brand-text">{label}</label>
              <textarea
                value={valueToString(value)}
                disabled={disabled}
                rows={3}
                maxLength={definition.validation?.maxLength}
                onChange={(event) => onChange(definition.key, event.target.value)}
                className={`${fieldClass} resize-y`}
              />
            </div>
          );
        }

        if (isDropdownInputType(definition) && options.length > 0 && !definition.allow_custom_value) {
          const dependencyMissing = isDependencyMissing(definition, values, subcategorySelected);
          const selectedText = valueToString(value);
          const hasSelectedOption = selectedText ? options.includes(selectedText) : true;
          return (
            <div key={definition.id}>
              <label className="mb-2 block text-sm font-semibold text-brand-text">{label}</label>
              <select
                value={selectedText}
                disabled={disabled || dependencyMissing}
                onChange={(event) => onChange(definition.key, event.target.value)}
                className={fieldClass}
              >
                <option value="">Seçin</option>
                {!hasSelectedOption ? <option value={selectedText}>{selectedText}</option> : null}
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (isTextInputType(definition) || isDropdownInputType(definition)) {
          const listId = options.length > 0 ? `${definition.id}-options` : undefined;
          const dependencyMissing = isDependencyMissing(definition, values, subcategorySelected);
          return (
            <div key={definition.id}>
              <label className="mb-2 block text-sm font-semibold text-brand-text">{label}</label>
              <input
                type="text"
                value={valueToString(value)}
                list={listId}
                disabled={disabled || dependencyMissing}
                maxLength={definition.validation?.maxLength}
                onChange={(event) => onChange(definition.key, event.target.value)}
                className={fieldClass}
              />
              {listId ? (
                <datalist id={listId}>
                  {options.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              ) : null}
            </div>
          );
        }

        return (
          <div key={definition.id}>
            <label className="mb-2 block text-sm font-semibold text-brand-text">{label}</label>
            <input
              type={definition.type === "number" ? "number" : "text"}
              value={valueToString(value)}
              disabled={disabled}
              onChange={(event) =>
                onChange(
                  definition.key,
                  definition.type === "number"
                    ? event.target.value.trim()
                      ? Number(event.target.value)
                      : null
                    : event.target.value,
                )
              }
              className={fieldClass}
            />
          </div>
        );
      })}
    </div>
  );
}
