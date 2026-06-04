import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { OutlineTimeline } from "../components/OutlineTimeline";
import { useProject } from "../context/ProjectContext";
import { usePageTimeline, useTimelineNodes } from "../hooks/useAnimeReveal";
import { sortByOrder } from "../utils/projectHelpers";

const CATALOG_GROUP_SIZE = 20;

function getCatalogGroupIndex(order: number): number {
  return Math.floor((order - 1) / CATALOG_GROUP_SIZE);
}

function getCatalogGroupLabel(groupIndex: number): string {
  const start = groupIndex * CATALOG_GROUP_SIZE + 1;
  const end = start + CATALOG_GROUP_SIZE - 1;
  return `第 ${start}-${end} 章`;
}

export default function BookOverviewPage(): JSX.Element {
  const { project, platforms } = useProject();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());

  const sortedOutline = useMemo(
    () => sortByOrder(project?.outlineNodes ?? []),
    [project?.outlineNodes]
  );
  const sortedChapters = useMemo(() => sortByOrder(project?.chapters ?? []), [project?.chapters]);

  const chapterGroups = useMemo(() => {
    const groups = new Map<number, typeof sortedChapters>();
    for (const ch of sortedChapters) {
      const gi = getCatalogGroupIndex(ch.order);
      if (!groups.has(gi)) groups.set(gi, []);
      groups.get(gi)!.push(ch);
    }
    return groups;
  }, [sortedChapters]);

  const pageRef = usePageTimeline<HTMLDivElement>(".section-heading", ".info-card", undefined, [project?.meta.title]);

  if (!project) {
    return <></>;
  }

  const platform = platforms.find((entry) => entry.id === project.meta.publishPlatform);
  const audienceLabel = project.meta.audienceChannel === "female" ? "女频" : "男频";
  const totalWords = sortedChapters.reduce((sum, ch) => sum + ch.draft.trim().length, 0);

  return (
    <div className="book-overview">
      {/* 顶部：作品信息卡片组 */}
      <section ref={pageRef} className="panel page-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">作品总览</p>
            <h2>{project.meta.title || "未命名作品"}</h2>
          </div>
          <Link className="secondary-button" to="/book/settings">
            编辑书籍信息
          </Link>
        </div>

        <div className="info-card-grid">
          <div className="info-card">
            <span className="info-card-label">类型</span>
            <strong>{project.meta.genre || "未设置"}</strong>
          </div>
          <div className="info-card">
            <span className="info-card-label">受众</span>
            <strong>{audienceLabel}</strong>
          </div>
          <div className="info-card">
            <span className="info-card-label">平台</span>
            <strong>{platform?.label ?? project.meta.publishPlatform}</strong>
          </div>
          <div className="info-card">
            <span className="info-card-label">章节</span>
            <strong>{sortedChapters.length} 章</strong>
          </div>
          <div className="info-card">
            <span className="info-card-label">总字数</span>
            <strong>{totalWords.toLocaleString()} 字</strong>
          </div>
          <div className="info-card">
            <span className="info-card-label">大纲</span>
            <strong>{sortedOutline.length} 阶段</strong>
          </div>
        </div>

        {project.meta.synopsis?.trim() ? (
          <div className="overview-block">
            <h3>作品简介</h3>
            <p className="overview-text">{project.meta.synopsis}</p>
          </div>
        ) : (
          <div className="overview-block">
            <h3>作品简介</h3>
            <p className="muted-text">
              尚未填写。
              <Link to="/book/settings"> 去填写</Link>
              或从导入大纲自动提取。
            </p>
          </div>
        )}

        {project.meta.premise ? (
          <div className="overview-block">
            <h3>核心设定</h3>
            <p className="overview-text">{project.meta.premise}</p>
          </div>
        ) : null}
      </section>

      {/* 下方双栏：大纲预览 + 章节目录 */}
      <div className="overview-two-col">
        <section className="panel page-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">剧情结构</p>
              <h2>故事大纲</h2>
            </div>
            <Link className="secondary-button" to="/outline">
              编辑大纲
            </Link>
          </div>
          <OutlineTimeline nodes={sortedOutline} emptyHint="暂无大纲，可在书籍信息中导入或手动添加。" />
        </section>

        <section className="panel page-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">目录</p>
              <h2>章节列表</h2>
            </div>
            <Link className="secondary-button" to="/write">
              章节写作
            </Link>
          </div>

          {sortedChapters.length === 0 ? (
            <div className="empty-state">
              <p>暂无章节</p>
              <Link className="primary-button" to="/book/settings">
                导入章节
              </Link>
            </div>
          ) : (
            <div className="chapter-catalog">
              {chapterGroups.size <= 1 ? (
                sortedChapters.map((chapter) => (
                  <CatalogChapterRow key={chapter.id} chapter={chapter} />
                ))
              ) : (
                Array.from(chapterGroups.entries()).map(([groupIndex, chapters]) => {
                  const isCollapsed = collapsedGroups.has(groupIndex);
                  return (
                    <div key={groupIndex} className="chapter-group">
                      <button
                        className="chapter-group-header"
                        onClick={() => {
                          setCollapsedGroups(prev => {
                            const next = new Set(prev);
                            if (next.has(groupIndex)) next.delete(groupIndex);
                            else next.add(groupIndex);
                            return next;
                          });
                        }}
                        type="button"
                      >
                        <span className="chapter-group-arrow">{isCollapsed ? "▶" : "▼"}</span>
                        <span className="chapter-group-label">{getCatalogGroupLabel(groupIndex)}</span>
                        <span className="chapter-group-count">{chapters.length} 章</span>
                      </button>
                      {!isCollapsed && chapters.map((chapter) => (
                        <CatalogChapterRow key={chapter.id} chapter={chapter} />
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function CatalogChapterRow(props: { chapter: { id: string; order: number; title: string; summary: string; purpose: string; draft: string } }): JSX.Element {
  const { chapter } = props;
  const draftPreview = chapter.draft.trim();
  const wordHint = draftPreview ? `${draftPreview.length} 字` : "未写正文";
  return (
    <Link className="chapter-catalog-card" to={`/chapter/${chapter.id}`}>
      <div className="chapter-catalog-order">第 {chapter.order} 章</div>
      <div className="chapter-catalog-body">
        <h3>{chapter.title || "未命名章节"}</h3>
        <span className="chapter-catalog-meta">{wordHint}</span>
      </div>
      <span className="chapter-catalog-arrow" aria-hidden>→</span>
    </Link>
  );
}
