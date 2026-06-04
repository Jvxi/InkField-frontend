export function Field(props: {
  label: string;
  className?: string;
  children: React.ReactNode;
  error?: string;
  help?: string;
  required?: boolean;
  disabled?: boolean;
}): JSX.Element {
  const fieldClassName = [
    "field",
    props.className ?? "",
    props.error ? "field--error" : "",
    props.disabled ? "field--disabled" : ""
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <label className={fieldClassName}>
      <span className="field-label">
        {props.label}
        {props.required ? <span className="field-required">*</span> : null}
      </span>
      {props.children}
      {props.help ? <span className="field-help">{props.help}</span> : null}
      {props.error ? <span className="field-error">{props.error}</span> : null}
    </label>
  );
}
