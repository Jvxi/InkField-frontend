import { useRef, useState } from "react";

import { analyzeProjectImportChapters, analyzeProjectImportOutline } from "../api";
import { Field } from "./Field";
import { useProject } from "../context/ProjectContext";
import type { ProjectImportAnalysis } from "../types";
import { useFadeReveal } from "../hooks/useAnimeReveal";
import { applyProjectImport, type ImportApplySelection } from "../utils/applyProjectImport";
import { mergeProjectImport } from "../utils/mergeProjectImport";

async function readTextFile(file: File): Promise<string> {
  return file.text();
}

const DEFAULT_SELECTION: ImportApplySelection = {
  meta: true,
  outline: true,
  chapters: true,
  characters: true,
  foreshadowing: true,
  replaceOutline: false,
  replaceChapters: false
};

export default function BookImportPanel(): JSX.Element {
  const { project, applyProjectUpdate, saveProject, setErrorText, setStatusText } = useProject();
  const [outlineText, setOutlineText] = useState("");
  const [chaptersText, setChaptersText] = useState("");
  const [analysis, setAnalysis] = useState<ProjectImportAnalysis | null>(null);
  const [selection, setSelection] = useState<ImportApplySelection>(DEFAULT_SELECTION);
  const [isAnalyzingOutline, setIsAnalyzingOutline] = useState(false);
  const [isAnalyzingChapters, setIsAnalyzingChapters] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const outlineFileRef = useRef<HTMLInputElement>(null);
  const chaptersFileRef = useRef<HTMLInputElement>(null);
  const previewRef = useFadeReveal<HTMLDivElement>([analysis]);

  if (!project) {
    return <></>;
  }

  const aiReady = project.aiSettings.enabled && project.aiSettings.apiKey.trim() !== "";
  const isAnalyzing = isAnalyzingOutline || isAnalyzingChapters;

  async function handleFile(
    file: File | undefined,
    setter: (value: string) => void
  ): Promise<void> {
    if (!file) {
      return;
    }
    setter(await readTextFile(file));
  }

  async function handleAnalyzeOutline(): Promise<void> {
    if (!outlineText.trim()) {
      setErrorText("请先粘贴或上传大纲/设定文本。");
      return;
    }
    try {
      setIsAnalyzingOutline(true);
      setErrorText("");
      setStatusText("正在分析大纲（书籍信息、角色、阶段与伏笔并行处理）…");
      const result = await analyzeProjectImportOutline(outlineText);
      setAnalysis((current) => mergeProjectImport(current, result));
      setStatusText("大纲分析完成，可继续分析章节或勾选后写入项目。");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "大纲分析失败");
    } finally {
      setIsAnalyzingOutline(false);
    }
  }

  async function handleAnalyzeChapters(): Promise<void> {
    if (!chaptersText.trim()) {
      setErrorText("请先粘贴或上传章节正文。");
      return;
    }
    try {
      setIsAnalyzingChapters(true);
      setErrorText("");
      setStatusText("正在分析章节正文…");
      const result = await analyzeProjectImportChapters(chaptersText);
      setAnalysis((current) => mergeProjectImport(current, result));
      setStatusText("章节分析完成，可勾选后写入项目。");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "章节分析失败");
    } finally {
      setIsAnalyzingChapters(false);
    }
  }

  async function handleApply(): Promise<void> {
    if (!analysis || !project) {
      return;
    }
    try {
      setIsApplying(true);
      setErrorText("");
      const nextProject = applyProjectImport(project, analysis, selection);
      applyProjectUpdate(() => nextProject);
      await saveProject(nextProject);
      setStatusText("已从导入内容写入项目。");
      setAnalysis(null);
      setOutlineText("");
      setChaptersText("");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "写入失败");
    } finally {
      setIsApplying(false);
    }
  }

  const foreshadowingCount = analysis?.foreshadowing?.length ?? 0;

  return (
    <div className="book-import-panel panel-inset">
      <h3>导入大纲 / 章节</h3>
      <p className="muted-text">
        支持 .txt / .md。大纲与章节请分开分析：大纲可提取简介、设定、阶段、角色与伏笔；章节仅解析章节列表与正文。
      </p>

      {!aiReady ? (
        <p className="warn-inline">请先在「AI 设置」中启用远程模型并填写 API Key。</p>
      ) : null}

      <div className="book-import-grid">
        <Field label="大纲 / 设定文本">
          <textarea
            rows={6}
            placeholder="粘贴全书大纲、分卷梗概、世界观、已构思的伏笔说明等"
            value={outlineText}
            onChange={(event) => setOutlineText(event.target.value)}
          />
          <input
            ref={outlineFileRef}
            accept=".txt,.md,.markdown,text/plain"
            className="file-input-hidden"
            type="file"
            onChange={(event) => {
              void handleFile(event.target.files?.[0], setOutlineText);
              event.target.value = "";
            }}
          />
          <div className="import-field-actions">
            <button
              className="secondary-button compact-button"
              type="button"
              onClick={() => outlineFileRef.current?.click()}
            >
              上传大纲文件
            </button>
            <button
              className="primary-button compact-button"
              disabled={!aiReady || isAnalyzing}
              type="button"
              onClick={() => void handleAnalyzeOutline()}
            >
              {isAnalyzingOutline ? "分析中…" : "AI 分析大纲"}
            </button>
          </div>
        </Field>
        <Field label="章节正文">
          <textarea
            rows={6}
            placeholder="粘贴已写章节正文，请用「第1章」「第二章」等标题分行分隔（每章约 4000 字）"
            value={chaptersText}
            onChange={(event) => setChaptersText(event.target.value)}
          />
          <input
            ref={chaptersFileRef}
            accept=".txt,.md,.markdown,text/plain"
            className="file-input-hidden"
            type="file"
            onChange={(event) => {
              void handleFile(event.target.files?.[0], setChaptersText);
              event.target.value = "";
            }}
          />
          <div className="import-field-actions">
            <button
              className="secondary-button compact-button"
              type="button"
              onClick={() => chaptersFileRef.current?.click()}
            >
              上传章节文件
            </button>
            <button
              className="primary-button compact-button"
              disabled={!aiReady || isAnalyzing}
              type="button"
              onClick={() => void handleAnalyzeChapters()}
            >
              {isAnalyzingChapters ? "分析中…" : "AI 分析章节"}
            </button>
          </div>
        </Field>
      </div>

      {analysis ? (
        <div ref={previewRef} className="import-preview">
          <h4>分析结果预览</h4>
          <ul className="import-preview-stats">
            {analysis.synopsis ? <li>简介：{analysis.synopsis.slice(0, 80)}…</li> : null}
            {analysis.premise ? <li>核心设定：{analysis.premise.slice(0, 60)}…</li> : null}
            <li>大纲阶段 {analysis.outlineNodes.length} 个</li>
            <li>伏笔 {foreshadowingCount} 条</li>
            <li>章节 {analysis.chapters.length} 章</li>
            <li>角色 {analysis.characters.length} 人</li>
          </ul>
          <div className="import-apply-options">
            <label className="import-option">
              <input
                checked={selection.meta}
                type="checkbox"
                onChange={(event) => setSelection((s) => ({ ...s, meta: event.target.checked }))}
              />
              <span className="import-option-label">书籍信息（简介、设定、基调等）</span>
            </label>
            <label className="import-option">
              <input
                checked={selection.outline}
                type="checkbox"
                onChange={(event) => setSelection((s) => ({ ...s, outline: event.target.checked }))}
              />
              <span className="import-option-label">大纲阶段</span>
            </label>
            <label className="import-option">
              <input
                checked={selection.foreshadowing}
                type="checkbox"
                onChange={(event) =>
                  setSelection((s) => ({ ...s, foreshadowing: event.target.checked }))
                }
              />
              <span className="import-option-label">伏笔（追加）</span>
            </label>
            <label className="import-option">
              <input
                checked={selection.chapters}
                type="checkbox"
                onChange={(event) => setSelection((s) => ({ ...s, chapters: event.target.checked }))}
              />
              <span className="import-option-label">章节与正文</span>
            </label>
            <label className="import-option">
              <input
                checked={selection.characters}
                type="checkbox"
                onChange={(event) => setSelection((s) => ({ ...s, characters: event.target.checked }))}
              />
              <span className="import-option-label">角色（追加）</span>
            </label>
          </div>
          <div className="import-apply-suboptions">
            <label className="import-option">
              <input
                checked={selection.replaceOutline}
                disabled={!selection.outline}
                type="checkbox"
                onChange={(event) =>
                  setSelection((s) => ({ ...s, replaceOutline: event.target.checked }))
                }
              />
              <span className="import-option-label">覆盖已有大纲</span>
            </label>
            <label className="import-option">
              <input
                checked={selection.replaceChapters}
                disabled={!selection.chapters}
                type="checkbox"
                onChange={(event) =>
                  setSelection((s) => ({ ...s, replaceChapters: event.target.checked }))
                }
              />
              <span className="import-option-label">覆盖已有章节</span>
            </label>
          </div>
          <button
            className="primary-button"
            disabled={isApplying}
            type="button"
            onClick={() => void handleApply()}
          >
            {isApplying ? "写入中…" : "写入项目"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
