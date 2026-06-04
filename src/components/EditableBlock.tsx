export function EditableBlock(props: {
  title: string;
  children: React.ReactNode;
  extraActions?: React.ReactNode;
}): JSX.Element {
  return (
    <article className="editable-block">
      <div className="editable-block-header">
        <strong>{props.title}</strong>
        {props.extraActions}
      </div>
      <div className="editable-block-body">{props.children}</div>
    </article>
  );
}
