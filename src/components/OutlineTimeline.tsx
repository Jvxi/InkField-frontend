import { Link } from "react-router-dom";

import { useStaggerReveal } from "../hooks/useAnimeReveal";
import type { OutlineNode } from "../types";

interface OutlineTimelineProps {
  nodes: OutlineNode[];
  editable?: boolean;
  onEdit?: () => void;
  emptyHint?: string;
}

export function OutlineTimeline(props: OutlineTimelineProps): JSX.Element {
  const { nodes, editable = false, onEdit, emptyHint = "尚未添加大纲节点" } = props;
  const timelineRef = useStaggerReveal<HTMLOListElement>(".outline-timeline-item", [nodes.length]);

  if (nodes.length === 0) {
    return (
      <div className="outline-empty">
        <p>{emptyHint}</p>
        {editable ? (
          <Link className="text-link" to="/outline">
            前往大纲页添加
          </Link>
        ) : (
          <Link className="text-link" to="/outline">
            去完善大纲
          </Link>
        )}
      </div>
    );
  }

  return (
    <ol ref={timelineRef} className="outline-timeline">
      {nodes.map((node, index) => (
        <li key={node.id} className="outline-timeline-item">
          <div className="outline-timeline-marker" aria-hidden>
            <span className="outline-timeline-dot" />
            {index < nodes.length - 1 ? <span className="outline-timeline-line" /> : null}
          </div>
          <article className="outline-timeline-card">
            <header className="outline-timeline-card-head">
              <span className="outline-chapter-badge">第 {node.order} 段</span>
              <h3>{node.title || "未命名节点"}</h3>
              {editable && onEdit ? (
                <button className="mini-button" onClick={onEdit} type="button">
                  编辑
                </button>
              ) : null}
            </header>
            {node.summary ? (
              <div className="outline-field">
                <span className="outline-field-label">剧情梗概</span>
                <p>{node.summary}</p>
              </div>
            ) : null}
            {node.objective ? (
              <div className="outline-field">
                <span className="outline-field-label">阶段目标</span>
                <p>{node.objective}</p>
              </div>
            ) : null}
            {node.keyConflict ? (
              <div className="outline-field">
                <span className="outline-field-label">核心冲突</span>
                <p>{node.keyConflict}</p>
              </div>
            ) : null}
            {node.mustKeep.length > 0 ? (
              <div className="outline-tags">
                <span className="outline-field-label">必保留</span>
                {node.mustKeep.map((item) => (
                  <span key={item} className="tag tag-keep">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
            {node.forbidden.length > 0 ? (
              <div className="outline-tags">
                <span className="outline-field-label">禁提前揭示</span>
                {node.forbidden.map((item) => (
                  <span key={item} className="tag tag-forbidden">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        </li>
      ))}
    </ol>
  );
}
