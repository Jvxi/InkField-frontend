import { useEffect, useMemo, useState } from "react";

import { Field } from "./Field";
import { useProject } from "../context/ProjectContext";
import type { NovelTypeCatalogResponse } from "../types";

export interface CreateBookOptions {
  title?: string;
  audienceChannel: "male" | "female";
  novelType: string;
}

interface CreateBookFormProps {
  disabled?: boolean;
  submitLabel?: string;
  onSubmit: (options: CreateBookOptions) => Promise<void>;
}

function defaultTypeForAudience(
  catalog: NovelTypeCatalogResponse | null,
  audienceChannel: "male" | "female"
): string {
  const first = catalog?.types.find((type) => type.audienceChannel === audienceChannel);
  return first?.id ?? "";
}

export default function CreateBookForm(props: CreateBookFormProps): JSX.Element {
  const { novelTypeCatalog } = useProject();
  const [title, setTitle] = useState("");
  const [audienceChannel, setAudienceChannel] = useState<"male" | "female">("male");
  const [novelType, setNovelType] = useState(() => defaultTypeForAudience(novelTypeCatalog, "male"));

  const audiences = novelTypeCatalog?.audiences ?? [
    { id: "male" as const, label: "男频", description: "" },
    { id: "female" as const, label: "女频", description: "" }
  ];

  const availableTypes = useMemo(
    () => novelTypeCatalog?.types.filter((type) => type.audienceChannel === audienceChannel) ?? [],
    [novelTypeCatalog, audienceChannel]
  );

  const selectedType = availableTypes.find((type) => type.id === novelType) ?? availableTypes[0] ?? null;

  useEffect(() => {
    if (availableTypes.length === 0) {
      return;
    }
    if (!availableTypes.some((type) => type.id === novelType)) {
      setNovelType(availableTypes[0].id);
    }
  }, [availableTypes, novelType]);

  useEffect(() => {
    if (!novelTypeCatalog) {
      return;
    }
    const fallback = defaultTypeForAudience(novelTypeCatalog, audienceChannel);
    if (fallback && !novelType) {
      setNovelType(fallback);
    }
  }, [novelTypeCatalog, audienceChannel, novelType]);

  const canSubmit = Boolean(novelType) && !props.disabled;

  return (
    <form
      className="create-book-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) {
          return;
        }
        void props.onSubmit({
          title: title.trim() || undefined,
          audienceChannel,
          novelType
        });
      }}
    >
      <div className="create-book-form-grid">
        <Field label="书名">
          <input
            placeholder="留空则使用「未命名作品」"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field label="受众频道">
          <select
            value={audienceChannel}
            onChange={(event) => {
              const next = event.target.value as "male" | "female";
              setAudienceChannel(next);
              setNovelType(defaultTypeForAudience(novelTypeCatalog, next));
            }}
          >
            {audiences.map((audience) => (
              <option key={audience.id} value={audience.id}>
                {audience.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="小说类型">
          <select value={novelType} onChange={(event) => setNovelType(event.target.value)}>
            {availableTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {!selectedType ? (
        <p className="create-book-form-hint muted-text warn-inline">类型加载中…</p>
      ) : null}
      <div className="create-book-form-actions">
        <button className="primary-button" disabled={!canSubmit} type="submit">
          {props.submitLabel ?? "创建新书"}
        </button>
      </div>
    </form>
  );
}
