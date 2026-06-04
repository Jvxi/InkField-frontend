import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { OutlineTimeline } from "../components/OutlineTimeline";
import { Field } from "../components/Field";
import { useProject } from "../context/ProjectContext";
import { useTimelineNodes } from "../hooks/useAnimeReveal";
import {
  createOutlineNode,
  formatLines,
  moveOrderedItem,
  parseLines,
  sortByOrder
} from "../utils/projectHelpers";

export default function OutlinePage(): JSX.Element {
  const { project, applyProjectUpdate } = useProject();
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const sortedOutline = useMemo(
    () => sortByOrder(project?.outlineNodes ?? []),
    [project?.outlineNodes]
  );

  if (!project) {
    return <></>;
  }

  const editingNode = sortedOutline.find((node) => node.id === editingNodeId) ?? null;

  return (
    <section className="panel page-panel outline-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">剧情结构</p>
          <h2>故事大纲</h2>
        </div>
        <button
          className="secondary-button"
          onClick={() => {
            const nextOrder = (project.outlineNodes.at(-1)?.order ?? 0) + 1;
            const node = createOutlineNode(nextOrder);
            applyProjectUpdate((current) => ({
              ...current,
              outlineNodes: [...current.outlineNodes, node]
            }));
            setEditingNodeId(node.id);
          }}
          type="button"
        >
          新增阶段
        </button>
      </div>

      {sortedOutline.length === 0 ? (
        <div className="warn-banner">
          暂无大纲，可在 <Link to="/book/settings">书籍信息</Link> 导入或 <Link to="/book/bootstrap">灵感向导</Link> 生成。
        </div>
      ) : null}

      {sortedOutline.length === 0 ? (
        <div className="empty-state">
          <p>还没有大纲阶段，点击「新增阶段」开始规划主线</p>
        </div>
      ) : (
        <div className="outline-layout">
          {/* 左侧：时间线 */}
          <div className="outline-timeline-col">
            <OutlineTimeline nodes={sortedOutline} emptyHint="" />
          </div>

          {/* 右侧：节点操作 + 编辑面板 */}
          <div className="outline-manage-col">
            <div className="outline-node-actions-list">
              {sortedOutline.map((node, index) => (
                <div key={node.id} className={`outline-node-action-row ${editingNodeId === node.id ? "is-editing" : ""}`}>
                  <span className="outline-node-action-label">
                    第 {node.order} 段 · {node.title || "未命名"}
                  </span>
                  <div className="inline-actions">
                    <button
                      className="mini-button"
                      onClick={() => setEditingNodeId(editingNodeId === node.id ? null : node.id)}
                      type="button"
                    >
                      {editingNodeId === node.id ? "收起" : "编辑"}
                    </button>
                    <button
                      className="mini-button"
                      disabled={index === 0}
                      onClick={() =>
                        applyProjectUpdate((current) => ({
                          ...current,
                          outlineNodes: moveOrderedItem(current.outlineNodes, node.id, -1)
                        }))
                      }
                      type="button"
                    >
                      ↑
                    </button>
                    <button
                      className="mini-button"
                      disabled={index === sortedOutline.length - 1}
                      onClick={() =>
                        applyProjectUpdate((current) => ({
                          ...current,
                          outlineNodes: moveOrderedItem(current.outlineNodes, node.id, 1)
                        }))
                      }
                      type="button"
                    >
                      ↓
                    </button>
                    <button
                      className="mini-button danger"
                      onClick={() => {
                        if (editingNodeId === node.id) {
                          setEditingNodeId(null);
                        }
                        applyProjectUpdate((current) => ({
                          ...current,
                          outlineNodes: current.outlineNodes.filter((entry) => entry.id !== node.id),
                          chapters: current.chapters.map((chapter) => ({
                            ...chapter,
                            outlineNodeIds: chapter.outlineNodeIds.filter((entry) => entry !== node.id)
                          }))
                        }));
                      }}
                      type="button"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 编辑面板 */}
            {editingNode ? (
              <div className="outline-edit-panel panel-inset">
                <h3>编辑：{editingNode.title || `第 ${editingNode.order} 段`}</h3>
                <div className="form-grid">
                  <Field label="阶段标题">
                    <input
                      value={editingNode.title}
                      onChange={(event) =>
                        applyProjectUpdate((current) => ({
                          ...current,
                          outlineNodes: current.outlineNodes.map((entry) =>
                            entry.id === editingNode.id ? { ...entry, title: event.target.value } : entry
                          )
                        }))
                      }
                    />
                  </Field>
                  <Field className="span-2" label="剧情梗概">
                    <textarea
                      rows={3}
                      placeholder="本阶段发生的主要事件、场景与情绪走向"
                      value={editingNode.summary}
                      onChange={(event) =>
                        applyProjectUpdate((current) => ({
                          ...current,
                          outlineNodes: current.outlineNodes.map((entry) =>
                            entry.id === editingNode.id ? { ...entry, summary: event.target.value } : entry
                          )
                        }))
                      }
                    />
                  </Field>
                  <Field className="span-2" label="阶段目标">
                    <textarea
                      rows={2}
                      placeholder="主角要达成什么、读者应获得哪些关键信息"
                      value={editingNode.objective}
                      onChange={(event) =>
                        applyProjectUpdate((current) => ({
                          ...current,
                          outlineNodes: current.outlineNodes.map((entry) =>
                            entry.id === editingNode.id ? { ...entry, objective: event.target.value } : entry
                          )
                        }))
                      }
                    />
                  </Field>
                  <Field className="span-2" label="核心冲突">
                    <textarea
                      rows={2}
                      placeholder="对立面如何施压、悬念如何维持"
                      value={editingNode.keyConflict}
                      onChange={(event) =>
                        applyProjectUpdate((current) => ({
                          ...current,
                          outlineNodes: current.outlineNodes.map((entry) =>
                            entry.id === editingNode.id ? { ...entry, keyConflict: event.target.value } : entry
                          )
                        }))
                      }
                    />
                  </Field>
                  <Field label="必须保留（每行一条）">
                    <textarea
                      rows={2}
                      value={formatLines(editingNode.mustKeep)}
                      onChange={(event) =>
                        applyProjectUpdate((current) => ({
                          ...current,
                          outlineNodes: current.outlineNodes.map((entry) =>
                            entry.id === editingNode.id ? { ...entry, mustKeep: parseLines(event.target.value) } : entry
                          )
                        }))
                      }
                    />
                  </Field>
                  <Field label="禁止提前揭示（每行一条）">
                    <textarea
                      rows={2}
                      value={formatLines(editingNode.forbidden)}
                      onChange={(event) =>
                        applyProjectUpdate((current) => ({
                          ...current,
                          outlineNodes: current.outlineNodes.map((entry) =>
                            entry.id === editingNode.id ? { ...entry, forbidden: parseLines(event.target.value) } : entry
                          )
                        }))
                      }
                    />
                  </Field>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
