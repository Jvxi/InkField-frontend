import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { generateChapterStream, reviewChaptersStream } from "../api";
import { Field } from "../components/Field";
import { useProject } from "../context/ProjectContext";
import type { ChapterGenerationResponse, ReviewIssue } from "../types";
import {
  createChapter,
  moveOrderedItem,
  sortByOrder
} from "../utils/projectHelpers";
import { useStaggerReveal, useReportReveal } from "../hooks/useAnimeReveal";
import { highlightChapterRow } from "../animations/motion";

const CHAPTER_GROUP_SIZE = 20;

function getChapterGroupIndex(chapterOrder: number): number {
  return Math.floor((chapterOrder - 1) / CHAPTER_GROUP_SIZE);
}

function getChapterGroupLabel(groupIndex: number): string {
  const start = groupIndex * CHAPTER_GROUP_SIZE + 1;
  const end = start + CHAPTER_GROUP_SIZE - 1;
  return `第 ${start}-${end} 章`;
}

function countWords(text: string): number {
  return text.replace(/[\s　-〿＀-￯!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~。，、；：？！""''（）【】《》—…·\n\r\t]/g, "").length;
}

function formatProvider(provider: string): string {
  if (provider === "openai-compatible" || provider === "openai-compatible-stream") {
    return "远程大模型（流式）";
  }
  if (provider === "rule-based-prototype") {
    return "本地规则模板";
  }
  return provider;
}

export default function WritePage(): JSX.Element {
  const { project, applyProjectUpdate, saveProject, reloadProject, setErrorText, setStatusText } = useProject();
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<ChapterGenerationResponse | null>(null);
  const [streamPreview, setStreamPreview] = useState("");
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());
  const groupsManuallyToggled = useRef(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewProgress, setReviewProgress] = useState({ current: 0, total: 0, title: "" });
  const [reviewResults, setReviewResults] = useState<Map<string, { title: string; issues: ReviewIssue[] }>>(new Map());
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const reviewAbortRef = useRef<AbortController | null>(null);
  const generateAbortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [searchParams] = useSearchParams();
  const chapterListRef = useStaggerReveal<HTMLDivElement>(".chapter-row", [project?.chapters.length]);
  const reportRef = useReportReveal<HTMLDivElement>(".status-panel", [generationResult]);

  const sortedChapters = useMemo(() => sortByOrder(project?.chapters ?? []), [project?.chapters]);

  const selectedChapter = useMemo(
    () => sortedChapters.find((chapter) => chapter.id === selectedChapterId) ?? sortedChapters[0] ?? null,
    [selectedChapterId, sortedChapters]
  );

  const draftWordCount = useMemo(
    () => countWords(isGenerating ? streamPreview || selectedChapter?.draft || "" : selectedChapter?.draft || ""),
    [isGenerating, streamPreview, selectedChapter?.draft]
  );

  useEffect(() => {
    const fromUrl = searchParams.get("chapter");
    if (fromUrl && sortedChapters.some((chapter) => chapter.id === fromUrl)) {
      setSelectedChapterId(fromUrl);
      return;
    }
    if (!selectedChapterId && sortedChapters.length > 0) {
      setSelectedChapterId(sortedChapters[sortedChapters.length - 1].id);
    }
  }, [searchParams, selectedChapterId, sortedChapters]);

  // 首次加载：默认关闭所有组，只展开当前章节所在的组
  useEffect(() => {
    if (groupsManuallyToggled.current || sortedChapters.length === 0 || !selectedChapterId) return;
    const selectedChapter = sortedChapters.find(ch => ch.id === selectedChapterId);
    if (!selectedChapter) return;
    const selectedGroupIndex = getChapterGroupIndex(selectedChapter.order);
    const allGroupIndices = new Set<number>();
    for (const ch of sortedChapters) {
      allGroupIndices.add(getChapterGroupIndex(ch.order));
    }
    allGroupIndices.delete(selectedGroupIndex);
    setCollapsedGroups(allGroupIndices);
  }, [sortedChapters, selectedChapterId]);

  // 流式生成时自动滚动到底部（用户手动上滚后停止自动滚动）
  useEffect(() => {
    if (!isGenerating) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { scrollTop, scrollHeight, clientHeight } = textarea;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    if (isNearBottom) {
      textarea.scrollTop = scrollHeight;
    }
  }, [streamPreview, isGenerating]);

  if (!project) {
    return <></>;
  }

  if (!project.onboarding.completed && project.outlineNodes.length === 0) {
    return (
      <section className="panel page-panel">
        <h2>请先完成开书问卷</h2>
        <p className="muted-text">
          请先完成 <Link to="/onboarding">开书问卷</Link> 或通过 <Link to="/book/bootstrap">灵感向导</Link> 设定大纲。
        </p>
      </section>
    );
  }

  function updateChapterDraft(chapterId: string, draft: string): void {
    applyProjectUpdate((current) => ({
      ...current,
      chapters: current.chapters.map((chapter) => (chapter.id === chapterId ? { ...chapter, draft } : chapter))
    }));
  }

  async function applyGenerationResult(result: ChapterGenerationResponse): Promise<void> {
    setGenerationResult(result);
    if (result.accepted) {
      applyProjectUpdate((current) => ({
        ...current,
        chapters: current.chapters.map((chapter) =>
          chapter.id === result.chapterId ? { ...chapter, draft: result.draft } : chapter
        )
      }));
      setStreamPreview(result.draft);
      setStatusText(`已生成章节草稿（${formatProvider(result.provider)}）`);
      // 重新加载项目以获取后端自动生成的标题/摘要/目的
      await reloadProject();
    } else {
      setErrorText(result.rejectionReason || "严格模式拒绝了本次生成。");
      setStatusText("生成未通过严格校验");
    }
    if (result.warnings.length > 0) {
      setErrorText(result.warnings.join("；"));
    }
  }

  function handleCancelGenerate(): void {
    generateAbortRef.current?.abort();
  }

  async function handleGenerate(continueMode: boolean = false): Promise<void> {
    if (!selectedChapter) {
      return;
    }
    const chapterId = selectedChapter.id;
    const existingDraft = selectedChapter.draft || "";
    const abortController = new AbortController();
    generateAbortRef.current = abortController;

    try {
      setIsGenerating(true);
      setErrorText("");
      setGenerationResult(null);

      if (continueMode && existingDraft) {
        // 续写模式：保留已有内容，AI 在其后追加
        setStreamPreview(existingDraft);
      } else {
        // 重新生成：清空
        setStreamPreview("");
        updateChapterDraft(chapterId, "");
      }
      await saveProject();

      await generateChapterStream(
        chapterId,
        {
          onDelta: (_chunk, accumulated) => {
            setStreamPreview(accumulated);
            updateChapterDraft(chapterId, accumulated);
            setStatusText("流式生成中...");
          },
          onDone: (result) => { void applyGenerationResult(result); },
          onCancelled: (message) => {
            if (!continueMode) {
              updateChapterDraft(chapterId, existingDraft);
              setStreamPreview(existingDraft);
            }
            setStatusText(message);
          },
          onError: (message) => {
            if (!continueMode) {
              updateChapterDraft(chapterId, existingDraft);
              setStreamPreview(existingDraft);
            }
            setErrorText(message);
            setStatusText("流式生成失败");
          }
        },
        abortController.signal,
        continueMode
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        if (!continueMode) {
          updateChapterDraft(chapterId, existingDraft);
          setStreamPreview(existingDraft);
        }
        setStatusText("已取消生成");
        return;
      }
      setErrorText(error instanceof Error ? error.message : "章节生成失败");
      setStatusText("生成失败");
    } finally {
      generateAbortRef.current = null;
      setIsGenerating(false);
    }
  }

  function handleGenerateClick(): void {
    if (!selectedChapter) return;
    const hasContent = selectedChapter.draft && selectedChapter.draft.trim().length > 0;
    if (hasContent) {
      setShowGenerateDialog(true);
    } else {
      void handleGenerate(false);
    }
  }

  async function handleReview(): Promise<void> {
    if (sortedChapters.length === 0) return;
    const abortController = new AbortController();
    reviewAbortRef.current = abortController;

    try {
      setIsReviewing(true);
      setReviewResults(new Map());
      setShowReviewPanel(true);
      setReviewProgress({ current: 0, total: sortedChapters.length, title: "" });
      setErrorText("");

      await reviewChaptersStream(
        {
          onProgress: (_chapterId, chapterTitle, chapterIndex, totalChapters) => {
            setReviewProgress({ current: chapterIndex + 1, total: totalChapters, title: chapterTitle });
            setStatusText(`正在审查第 ${chapterIndex + 1}/${totalChapters} 章：${chapterTitle}`);
          },
          onResult: (chapterId, chapterTitle, issues) => {
            if (issues.length > 0) {
              setReviewResults(prev => {
                const next = new Map(prev);
                next.set(chapterId, { title: chapterTitle, issues });
                return next;
              });
            }
          },
          onDone: (reviewedCount, issueCount) => {
            setStatusText(`审查完成：共审查 ${reviewedCount} 章，发现 ${issueCount} 个问题`);
            if (issueCount === 0) {
              setShowReviewPanel(false);
            }
          },
          onCancelled: (message) => {
            setStatusText(message);
          },
          onError: (message) => {
            setErrorText(message);
            setStatusText("审查失败");
          }
        },
        abortController.signal
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatusText("已取消审查");
        return;
      }
      setErrorText(error instanceof Error ? error.message : "审查失败");
      setStatusText("审查失败");
    } finally {
      reviewAbortRef.current = null;
      setIsReviewing(false);
    }
  }

  function applyReviewFix(chapterId: string, original: string, suggestion: string): void {
    applyProjectUpdate((current) => ({
      ...current,
      chapters: current.chapters.map(ch => {
        if (ch.id !== chapterId) return ch;
        const newDraft = ch.draft.replace(original, suggestion);
        return { ...ch, draft: newDraft };
      })
    }));
    setReviewResults(prev => {
      const next = new Map(prev);
      const entry = next.get(chapterId);
      if (!entry) return next;
      const remaining = entry.issues.filter(issue => issue.original !== original);
      if (remaining.length === 0) {
        next.delete(chapterId);
      } else {
        next.set(chapterId, { ...entry, issues: remaining });
      }
      return next;
    });
  }

  function dismissReviewIssue(chapterId: string, original: string): void {
    setReviewResults(prev => {
      const next = new Map(prev);
      const entry = next.get(chapterId);
      if (!entry) return next;
      const remaining = entry.issues.filter(issue => issue.original !== original);
      if (remaining.length === 0) {
        next.delete(chapterId);
      } else {
        next.set(chapterId, { ...entry, issues: remaining });
      }
      return next;
    });
  }

  return (
    <div className={`write-layout ${isFocusMode ? "write-layout--focus" : ""}`}>
      <aside className={`write-sidebar panel ${isFocusMode ? "write-sidebar--hidden" : ""}`}>
        <div className="section-heading">
          <h2>章节列表</h2>
          <div className="toolbar">
            {isReviewing ? (
              <button
                className="mini-button danger"
                onClick={() => reviewAbortRef.current?.abort()}
                type="button"
                title="取消审查"
              >
                停止
              </button>
            ) : (
              <button
                className="mini-button"
                onClick={() => void handleReview()}
                type="button"
                title="全文审查：检查所有章节中的不合理内容"
                disabled={sortedChapters.length === 0}
              >
                审查
              </button>
            )}
            <button
              className="icon-button"
              onClick={() => {
                const nextOrder = (project.chapters.at(-1)?.order ?? 0) + 1;
                const chapter = createChapter(nextOrder);
                applyProjectUpdate((current) => ({
                  ...current,
                  chapters: [...current.chapters, chapter]
                }));
                setSelectedChapterId(chapter.id);
              }}
              title="新增章节"
              type="button"
            >
              +
            </button>
          </div>
        </div>
        <div ref={chapterListRef} className="chapter-list">
          {(() => {
            const groups = new Map<number, typeof sortedChapters>();
            for (const ch of sortedChapters) {
              const gi = getChapterGroupIndex(ch.order);
              if (!groups.has(gi)) groups.set(gi, []);
              groups.get(gi)!.push(ch);
            }

            // 单组时不显示分组 header
            if (groups.size <= 1) {
              return sortedChapters.map((chapter, index) => (
                <ChapterRow
                  key={chapter.id}
                  chapter={chapter}
                  index={index}
                  totalCount={sortedChapters.length}
                  isSelected={selectedChapter?.id === chapter.id}
                  onSelect={(id) => setSelectedChapterId(id)}
                  onMove={(id, dir) => {
                    applyProjectUpdate((current) => ({
                      ...current,
                      chapters: moveOrderedItem(current.chapters, id, dir)
                    }));
                  }}
                  onDelete={(id, title) => {
                    if (!window.confirm(`确定删除「${title || "未命名章节"}」吗？`)) return;
                    applyProjectUpdate((current) => {
                      const remaining = current.chapters
                        .filter((ch) => ch.id !== id)
                        .map((ch, i) => ({ ...ch, order: i + 1 }));
                      return { ...current, chapters: remaining };
                    });
                    if (selectedChapterId === id) {
                      const remaining = sortedChapters.filter((ch) => ch.id !== id);
                      setSelectedChapterId(remaining[0]?.id ?? "");
                    }
                  }}
                />
              ));
            }

            return Array.from(groups.entries()).map(([groupIndex, chapters]) => {
              const isCollapsed = collapsedGroups.has(groupIndex);

              return (
                <div key={groupIndex} className="chapter-group">
                  <button
                    className="chapter-group-header"
                    onClick={() => {
                      groupsManuallyToggled.current = true;
                      setCollapsedGroups(prev => {
                        const next = new Set(prev);
                        const willCollapse = !prev.has(groupIndex);
                        if (willCollapse) {
                          next.add(groupIndex);
                          // 如果选中章节在当前组内，切换到其他组的第一个章节
                          if (chapters.some(ch => ch.id === selectedChapterId)) {
                            for (const [gi, chs] of groups) {
                              if (gi !== groupIndex && !next.has(gi)) {
                                setSelectedChapterId(chs[0].id);
                                break;
                              }
                            }
                          }
                        } else {
                          next.delete(groupIndex);
                        }
                        return next;
                      });
                    }}
                    type="button"
                  >
                    <span className="chapter-group-arrow">{isCollapsed ? "▶" : "▼"}</span>
                    <span className="chapter-group-label">{getChapterGroupLabel(groupIndex)}</span>
                    <span className="chapter-group-count">{chapters.length} 章</span>
                  </button>
                  {!isCollapsed && chapters.map((chapter) => {
                    const globalIndex = sortedChapters.findIndex(ch => ch.id === chapter.id);
                    return (
                      <ChapterRow
                        key={chapter.id}
                        chapter={chapter}
                        index={globalIndex}
                        totalCount={sortedChapters.length}
                        isSelected={selectedChapter?.id === chapter.id}
                        onSelect={(id) => setSelectedChapterId(id)}
                        onMove={(id, dir) => {
                          applyProjectUpdate((current) => ({
                            ...current,
                            chapters: moveOrderedItem(current.chapters, id, dir)
                          }));
                        }}
                        onDelete={(id, title) => {
                          if (!window.confirm(`确定删除「${title || "未命名章节"}」吗？`)) return;
                          applyProjectUpdate((current) => {
                            const remaining = current.chapters
                              .filter((ch) => ch.id !== id)
                              .map((ch, i) => ({ ...ch, order: i + 1 }));
                            return { ...current, chapters: remaining };
                          });
                          if (selectedChapterId === id) {
                            const remaining = sortedChapters.filter((ch) => ch.id !== id);
                            setSelectedChapterId(remaining[0]?.id ?? "");
                          }
                        }}
                      />
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>
      </aside>

      <div className="write-main">
        {selectedChapter ? (
          <>
            {/* 审查进度 */}
            {isReviewing ? (
              <section className="panel page-panel review-progress-panel">
                <div className="section-heading">
                  <h2>全文审查中...</h2>
                </div>
                <p className="muted-text">
                  正在审查第 {reviewProgress.current}/{reviewProgress.total} 章：{reviewProgress.title}
                </p>
                <div className="review-progress-bar">
                  <div
                    className="review-progress-fill"
                    style={{ width: `${reviewProgress.total > 0 ? (reviewProgress.current / reviewProgress.total) * 100 : 0}%` }}
                  />
                </div>
              </section>
            ) : null}

            {/* 审查结果 */}
            {showReviewPanel && reviewResults.size > 0 ? (
              <section className="panel page-panel">
                <div className="section-heading">
                  <h2>审查结果</h2>
                  <button
                    className="mini-button"
                    onClick={() => setShowReviewPanel(false)}
                    type="button"
                  >
                    关闭
                  </button>
                </div>
                <div className="review-results">
                  {Array.from(reviewResults.entries()).map(([chapterId, entry]) => (
                    <div key={chapterId} className="review-chapter-group">
                      <h3 className="review-chapter-title">{entry.title || "未命名章节"}</h3>
                      {entry.issues.map((issue, idx) => (
                        <div key={idx} className="review-issue-card">
                          <div className="review-issue-desc">{issue.description}</div>
                          <div className="review-issue-original">
                            <span className="review-issue-label">原文：</span>
                            <code>{issue.original.length > 100 ? issue.original.substring(0, 100) + "..." : issue.original}</code>
                          </div>
                          {issue.suggestion ? (
                            <div className="review-issue-suggestion">
                              <span className="review-issue-label">建议：</span>
                              <code>{issue.suggestion.length > 100 ? issue.suggestion.substring(0, 100) + "..." : issue.suggestion}</code>
                            </div>
                          ) : null}
                          <div className="review-issue-actions">
                            <button
                              className="primary-button compact-button"
                              onClick={() => applyReviewFix(chapterId, issue.original, issue.suggestion)}
                              type="button"
                              disabled={!issue.suggestion}
                            >
                              应用修改
                            </button>
                            <button
                              className="secondary-button compact-button"
                              onClick={() => dismissReviewIssue(chapterId, issue.original)}
                              type="button"
                            >
                              忽略
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* 编辑区：标题 + 摘要 + 正文 */}
            <section className="panel page-panel">
              <div className="section-heading">
                <h2>{selectedChapter.title}</h2>
                <div className="toolbar">
                  <button
                    className="toolbar-text-button"
                    onClick={() => setIsFocusMode((v) => !v)}
                    type="button"
                    title={isFocusMode ? "退出专注模式" : "进入专注模式"}
                  >
                    {isFocusMode ? "退出专注" : "专注模式"}
                  </button>
                  {isGenerating ? (
                    <button className="secondary-button compact-button danger" onClick={handleCancelGenerate} type="button">
                      取消生成
                    </button>
                  ) : (
                    <button className="primary-button compact-button" onClick={() => void handleGenerateClick()} type="button">
                      流式生成正文
                    </button>
                  )}
                </div>
              </div>

              <div className="write-editor-grid">
                <Field label="章节标题">
                  <input
                    value={selectedChapter.title}
                    onChange={(event) =>
                      applyProjectUpdate((current) => ({
                        ...current,
                        chapters: current.chapters.map((entry) =>
                          entry.id === selectedChapter.id ? { ...entry, title: event.target.value } : entry
                        )
                      }))
                    }
                  />
                </Field>
                <Field label="章节摘要（可选，留空自动生成）">
                  <textarea
                    rows={2}
                    value={selectedChapter.summary}
                    placeholder="留空将根据绑定大纲节点自动生成"
                    onChange={(event) =>
                      applyProjectUpdate((current) => ({
                        ...current,
                        chapters: current.chapters.map((entry) =>
                          entry.id === selectedChapter.id ? { ...entry, summary: event.target.value } : entry
                        )
                      }))
                    }
                  />
                </Field>
                <Field label="章节目的（可选，留空自动生成）">
                  <textarea
                    rows={2}
                    value={selectedChapter.purpose}
                    placeholder="留空将根据绑定大纲节点目标自动生成"
                    onChange={(event) =>
                      applyProjectUpdate((current) => ({
                        ...current,
                        chapters: current.chapters.map((entry) =>
                          entry.id === selectedChapter.id ? { ...entry, purpose: event.target.value } : entry
                        )
                      }))
                    }
                  />
                </Field>
              </div>

              <Field label="章节正文">
                <div className="draft-word-count">字数：{draftWordCount}</div>
                <textarea
                  ref={textareaRef}
                  className="draft-textarea"
                  rows={16}
                  value={isGenerating ? streamPreview || selectedChapter.draft : selectedChapter.draft}
                  onChange={(event) => updateChapterDraft(selectedChapter.id, event.target.value)}
                />
              </Field>
            </section>

            {/* 合规报告 */}
            {generationResult ? (
              <section className="panel page-panel">
                <h2>合规报告</h2>
                {!generationResult.accepted ? (
                  <div className="error-banner">{generationResult.rejectionReason}</div>
                ) : null}
                <div ref={reportRef} className="report-grid">
                  <ReportCard
                    title="旁白/解说"
                    ok={generationResult.compliance.narrationMetaHits.length === 0}
                    text={
                      generationResult.compliance.narrationMetaHits.length === 0
                        ? "通过"
                        : generationResult.compliance.narrationMetaHits.join(" / ")
                    }
                  />
                  <ReportCard
                    title="大纲校验"
                    ok={generationResult.compliance.missingOutlineAnchors.length === 0}
                    text={
                      generationResult.compliance.missingOutlineAnchors.length === 0
                        ? "通过"
                        : generationResult.compliance.missingOutlineAnchors.join("；")
                    }
                  />
                  <ReportCard
                    title="必写节点"
                    ok={generationResult.compliance.missingMandatoryBeats.length === 0}
                    text={
                      generationResult.compliance.missingMandatoryBeats.length === 0
                        ? "通过"
                        : generationResult.compliance.missingMandatoryBeats.join("；")
                    }
                  />
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <p>请先新增章节。</p>
        )}
      </div>

      {/* 生成模式选择对话框 */}
      {showGenerateDialog ? (
        <div className="modal-overlay" onClick={() => setShowGenerateDialog(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>选择生成方式</h3>
            <p className="modal-desc">当前章节已有内容，请选择：</p>
            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => { setShowGenerateDialog(false); void handleGenerate(true); }}
                type="button"
              >
                续写补充
              </button>
              <button
                className="primary-button"
                onClick={() => { setShowGenerateDialog(false); void handleGenerate(false); }}
                type="button"
              >
                重新生成
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReportCard(props: { title: string; ok: boolean; text: string }): JSX.Element {
  return (
    <div className={`status-panel ${props.ok ? "good" : "bad"}`}>
      <strong>{props.title}</strong>
      <p>{props.text}</p>
    </div>
  );
}

function ChapterRow(props: {
  chapter: { id: string; order: number; title: string };
  index: number;
  totalCount: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onDelete: (id: string, title: string) => void;
}): JSX.Element {
  const { chapter, index, totalCount, isSelected, onSelect, onMove, onDelete } = props;
  return (
    <div
      className={`chapter-row ${isSelected ? "selected" : ""}`}
      onClick={(e) => { onSelect(chapter.id); highlightChapterRow(e.currentTarget); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(chapter.id); }}
    >
      <div>
        <strong>{chapter.title}</strong>
        <span>第 {chapter.order} 章</span>
      </div>
      <div className="chapter-actions">
        <button
          className="mini-button"
          disabled={index === 0}
          onClick={(event) => { event.stopPropagation(); onMove(chapter.id, -1); }}
          type="button"
        >
          ↑
        </button>
        <button
          className="mini-button"
          disabled={index === totalCount - 1}
          onClick={(event) => { event.stopPropagation(); onMove(chapter.id, 1); }}
          type="button"
        >
          ↓
        </button>
        <button
          className="mini-button danger"
          onClick={(event) => { event.stopPropagation(); onDelete(chapter.id, chapter.title); }}
          type="button"
          title="删除章节"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
