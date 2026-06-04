import { useState } from "react";

import { Field } from "../components/Field";
import { useProject } from "../context/ProjectContext";
import { createForeshadowing } from "../utils/projectHelpers";
import { useStaggerScaleReveal } from "../hooks/useAnimeReveal";
import type { ForeshadowingItem } from "../types";

const STATUS_CONFIG: Record<ForeshadowingItem["status"], { label: string; className: string }> = {
  planned: { label: "计划中", className: "foreshadow-status--planned" },
  revealed: { label: "已揭示", className: "foreshadow-status--revealed" },
  paid_off: { label: "已回收", className: "foreshadow-status--done" }
};

export default function ForeshadowingPage(): JSX.Element {
  const { project, applyProjectUpdate } = useProject();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const gridRef = useStaggerScaleReveal<HTMLDivElement>(".foreshadow-card", [project?.foreshadowing.length]);

  if (!project) {
    return <></>;
  }

  const items = project.foreshadowing;
  const planned = items.filter((i) => i.status === "planned");
  const revealed = items.filter((i) => i.status === "revealed");
  const done = items.filter((i) => i.status === "paid_off");

  function updateItem(id: string, patch: Partial<ForeshadowingItem>): void {
    applyProjectUpdate((current) => ({
      ...current,
      foreshadowing: current.foreshadowing.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry
      )
    }));
  }

  function removeItem(id: string): void {
    applyProjectUpdate((current) => ({
      ...current,
      foreshadowing: current.foreshadowing.filter((entry) => entry.id !== id),
      chapters: current.chapters.map((chapter) => ({
        ...chapter,
        foreshadowingIds: chapter.foreshadowingIds.filter((entry) => entry !== id)
      }))
    }));
    if (expandedId === id) {
      setExpandedId(null);
    }
  }

  function renderCard(item: ForeshadowingItem): JSX.Element {
    const isExpanded = expandedId === item.id;
    const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.planned;

    return (
      <article
        key={item.id}
        className={`foreshadow-card ${isExpanded ? "foreshadow-card--expanded" : ""}`}
      >
        <div
          className="foreshadow-card-header"
          onClick={() => setExpandedId(isExpanded ? null : item.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExpandedId(isExpanded ? null : item.id);
            }
          }}
        >
          <div className="foreshadow-card-title-row">
            <h3>{item.title || "未命名"}</h3>
            <span className={`foreshadow-status ${statusCfg.className}`}>
              {statusCfg.label}
            </span>
          </div>
          {!isExpanded && item.setup ? (
            <p className="foreshadow-card-preview">{item.setup}</p>
          ) : null}
          {!isExpanded && item.plannedReveal ? (
            <span className="foreshadow-card-reveal-hint">揭示：{item.plannedReveal}</span>
          ) : null}
        </div>

        {isExpanded ? (
          <div className="foreshadow-card-body">
            <Field label="标题">
              <input
                value={item.title}
                placeholder="伏笔名称"
                onChange={(event) => updateItem(item.id, { title: event.target.value })}
              />
            </Field>
            <Field label="埋设">
              <textarea
                rows={2}
                placeholder="埋下的线索、暗示或细节"
                value={item.setup}
                onChange={(event) => updateItem(item.id, { setup: event.target.value })}
              />
            </Field>
            <Field label="回收方向">
              <textarea
                rows={2}
                placeholder="后续如何揭示或呼应"
                value={item.payoff}
                onChange={(event) => updateItem(item.id, { payoff: event.target.value })}
              />
            </Field>
            <div className="foreshadow-card-row">
              <Field label="揭示位置">
                <input
                  placeholder="例如：第 12 章"
                  value={item.plannedReveal}
                  onChange={(event) => updateItem(item.id, { plannedReveal: event.target.value })}
                />
              </Field>
              <Field label="状态">
                <select
                  value={item.status}
                  onChange={(event) =>
                    updateItem(item.id, { status: event.target.value as ForeshadowingItem["status"] })
                  }
                >
                  <option value="planned">计划中</option>
                  <option value="revealed">已揭示</option>
                  <option value="paid_off">已回收</option>
                </select>
              </Field>
            </div>
            <Field label="备注">
              <textarea
                rows={2}
                placeholder="补充说明"
                value={item.notes}
                onChange={(event) => updateItem(item.id, { notes: event.target.value })}
              />
            </Field>
            <div className="foreshadow-card-actions">
              <button
                className="toolbar-text-button danger-text"
                onClick={() => {
                  if (window.confirm(`确定删除「${item.title || "未命名"}」？`)) {
                    removeItem(item.id);
                  }
                }}
                type="button"
              >
                删除
              </button>
            </div>
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <section className="panel page-panel foreshadow-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">伏笔管理</p>
          <h2>埋设与回收</h2>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            const newItem = createForeshadowing();
            applyProjectUpdate((current) => ({
              ...current,
              foreshadowing: [...current.foreshadowing, newItem]
            }));
            setExpandedId(newItem.id);
          }}
          type="button"
        >
          + 新增伏笔
        </button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>还没有伏笔，点击「+ 新增伏笔」开始埋设线索</p>
        </div>
      ) : (
        <>
          <div className="foreshadow-stats">
            <span className="foreshadow-stat">
              <strong>{items.length}</strong> 条
            </span>
            <span className="foreshadow-stat foreshadow-stat--planned">
              计划中 {planned.length}
            </span>
            <span className="foreshadow-stat foreshadow-stat--revealed">
              已揭示 {revealed.length}
            </span>
            <span className="foreshadow-stat foreshadow-stat--done">
              已回收 {done.length}
            </span>
          </div>

          <div ref={gridRef} className="foreshadow-kanban">
            <div className="foreshadow-column">
              <div className="foreshadow-column-header foreshadow-column-header--planned">
                <span className="foreshadow-column-dot" />
                计划中 <span className="foreshadow-column-count">{planned.length}</span>
              </div>
              <div className="foreshadow-column-list">
                {planned.length === 0 ? (
                  <p className="foreshadow-column-empty">暂无</p>
                ) : (
                  planned.map(renderCard)
                )}
              </div>
            </div>

            <div className="foreshadow-column">
              <div className="foreshadow-column-header foreshadow-column-header--revealed">
                <span className="foreshadow-column-dot" />
                已揭示 <span className="foreshadow-column-count">{revealed.length}</span>
              </div>
              <div className="foreshadow-column-list">
                {revealed.length === 0 ? (
                  <p className="foreshadow-column-empty">暂无</p>
                ) : (
                  revealed.map(renderCard)
                )}
              </div>
            </div>

            <div className="foreshadow-column">
              <div className="foreshadow-column-header foreshadow-column-header--done">
                <span className="foreshadow-column-dot" />
                已回收 <span className="foreshadow-column-count">{done.length}</span>
              </div>
              <div className="foreshadow-column-list">
                {done.length === 0 ? (
                  <p className="foreshadow-column-empty">暂无</p>
                ) : (
                  done.map(renderCard)
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
