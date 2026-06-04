import { useMemo } from "react";
import { Link } from "react-router-dom";

import BookImportPanel from "../components/BookImportPanel";
import { Field } from "../components/Field";
import { useProject } from "../context/ProjectContext";
import { formatLines, parseLines } from "../utils/projectHelpers";

export default function BookSettingsPage(): JSX.Element {
  const { project, platforms, novelTypeCatalog, applyProjectUpdate, updateAudienceChannel, updateNovelType } =
    useProject();

  if (!project) {
    return <></>;
  }

  const availableNovelTypes = useMemo(
    () => novelTypeCatalog?.types.filter((type) => type.audienceChannel === project.meta.audienceChannel) ?? [],
    [novelTypeCatalog, project.meta.audienceChannel]
  );

  return (
    <section className="panel page-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">设定</p>
          <h2>书籍信息</h2>
        </div>
        <Link className="secondary-button" to="/book">
          返回总览
        </Link>
      </div>

      <div className="form-grid">
        <Field label="书名">
          <input
            value={project.meta.title}
            onChange={(event) =>
              applyProjectUpdate((current) => ({
                ...current,
                meta: { ...current.meta, title: event.target.value }
              }))
            }
          />
        </Field>
        <Field label="受众频道">
          <select
            value={project.meta.audienceChannel}
            onChange={(event) => updateAudienceChannel(event.target.value as "male" | "female")}
          >
            {(novelTypeCatalog?.audiences ?? [
              { id: "male", label: "男频", description: "" },
              { id: "female", label: "女频", description: "" }
            ]).map((audience) => (
              <option key={audience.id} value={audience.id}>
                {audience.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="小说类型">
          <select value={project.meta.novelType} onChange={(event) => updateNovelType(event.target.value)}>
            {availableNovelTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="类型标签">
          <input readOnly value={project.meta.genre} />
        </Field>
        <Field label="发布平台">
          <select
            value={project.meta.publishPlatform}
            onChange={(event) =>
              applyProjectUpdate((current) => ({
                ...current,
                meta: { ...current.meta, publishPlatform: event.target.value }
              }))
            }
          >
            {platforms.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.label}
              </option>
            ))}
          </select>
        </Field>
        <Field className="span-2" label="作品简介">
          <textarea
            rows={5}
            placeholder="上架用简介：故事背景、主角处境、核心矛盾与看点（建议 100–500 字）"
            value={project.meta.synopsis ?? ""}
            onChange={(event) =>
              applyProjectUpdate((current) => ({
                ...current,
                meta: { ...current.meta, synopsis: event.target.value }
              }))
            }
          />
        </Field>
        <Field className="span-2" label="核心设定">
          <textarea
            rows={4}
            placeholder="写作与 AI 用的主线矛盾、金手指、世界规则要点（可短于简介）"
            value={project.meta.premise}
            onChange={(event) =>
              applyProjectUpdate((current) => ({
                ...current,
                meta: { ...current.meta, premise: event.target.value }
              }))
            }
          />
        </Field>
        <Field label="基调">
          <input
            value={project.meta.tone}
            onChange={(event) =>
              applyProjectUpdate((current) => ({
                ...current,
                meta: { ...current.meta, tone: event.target.value }
              }))
            }
          />
        </Field>
        <Field label="目标篇幅">
          <input
            value={project.meta.targetLength}
            onChange={(event) =>
              applyProjectUpdate((current) => ({
                ...current,
                meta: { ...current.meta, targetLength: event.target.value }
              }))
            }
          />
        </Field>
        <Field label="风格规则（每行一条）">
          <textarea
            rows={3}
            value={formatLines(project.meta.styleRules)}
            onChange={(event) =>
              applyProjectUpdate((current) => ({
                ...current,
                meta: { ...current.meta, styleRules: parseLines(event.target.value) }
              }))
            }
          />
        </Field>
        <Field label="世界规则（每行一条）">
          <textarea
            rows={3}
            value={formatLines(project.meta.worldRules)}
            onChange={(event) =>
              applyProjectUpdate((current) => ({
                ...current,
                meta: { ...current.meta, worldRules: parseLines(event.target.value) }
              }))
            }
          />
        </Field>
        <label className="field span-2 switch-row">
          <input
            type="checkbox"
            checked={project.meta.strictMode}
            onChange={(event) =>
              applyProjectUpdate((current) => ({
                ...current,
                meta: { ...current.meta, strictMode: event.target.checked }
              }))
            }
          />
          <span>严格正文模式</span>
        </label>
      </div>

      <BookImportPanel />
    </section>
  );
}
