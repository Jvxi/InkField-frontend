import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { generateOnboardingQuestionsStream, submitOnboardingAnswers } from "../api";
import { Field } from "../components/Field";
import { useProject } from "../context/ProjectContext";
import type { OnboardingAnswer, OnboardingQuestion } from "../types";
import { useStaggerScaleReveal } from "../hooks/useAnimeReveal";

function buildAnswersMap(
  questions: OnboardingQuestion[],
  saved: { questionId: string; answer: string }[]
): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const item of saved) {
    initial[item.questionId] = item.answer;
  }
  for (const question of questions) {
    if (!initial[question.id]) {
      initial[question.id] = "";
    }
  }
  return initial;
}

export default function OnboardingPage(): JSX.Element {
  const { project, saveProject, setErrorText, setStatusText, reloadProject, applyProjectUpdate } = useProject();
  const [questions, setQuestions] = useState<OnboardingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const questionListRef = useStaggerScaleReveal<HTMLDivElement>(".question-card", [questions.length]);

  useEffect(() => {
    if (!project) {
      return;
    }
    const loaded = project.onboarding.questions ?? [];
    setQuestions(loaded);
    setAnswers(buildAnswersMap(loaded, project.onboarding.answers));
  }, [project]);

  async function handleGenerate(): Promise<void> {
    if (!project) {
      return;
    }
    try {
      setIsGenerating(true);
      setGenerateProgress(0);
      setQuestions([]);
      setAnswers({});
      setErrorText("");
      setStatusText("正在逐题生成，首题通常几秒内出现…");
      await saveProject();
      await generateOnboardingQuestionsStream({
        onQuestion: (question, index) => {
          setGenerateProgress(index);
          setQuestions((current) => {
            const next = [...current, question];
            next.sort((a, b) => a.id.localeCompare(b.id));
            return next;
          });
          setAnswers((current) => ({ ...current, [question.id]: current[question.id] ?? "" }));
          setStatusText(`已生成 ${index}/15 题，请继续等待或先作答已出现的题目。`);
        },
        onDone: (result) => {
          applyProjectUpdate(() => result.project);
          setQuestions(result.questions);
          setAnswers(buildAnswersMap(result.questions, []));
          setGenerateProgress(15);
          setStatusText("已根据当前书籍与大纲信息生成 15 个问题，请逐项作答。");
        },
        onError: (message) => {
          setErrorText(message);
        }
      });
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "无法生成开书问卷");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSubmit(): Promise<void> {
    if (!project) {
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorText("");
      const payload: OnboardingAnswer[] = questions.map((question) => ({
        questionId: question.id,
        question: question.title,
        answer: answers[question.id]?.trim() ?? ""
      }));
      await submitOnboardingAnswers(payload);
      await reloadProject();
      setStatusText("开书问卷已完成，可以开始配置大纲与写作。");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "提交问卷失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!project) {
    return <></>;
  }

  const hasAllQuestions = questions.length === 15;
  const hasAnyQuestions = questions.length > 0;
  const aiReady = project.aiSettings.enabled && project.aiSettings.apiKey.trim() !== "";

  return (
    <section className="panel page-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">开书引导</p>
          <h2>15 问定方向</h2>
        </div>
      </div>
      {project.onboarding.completed ? (
        <div className="warn-banner">
          问卷已完成，可修改后重新提交。前往 <Link to="/write">章节写作</Link> 或 <Link to="/book">返回总览</Link>。
        </div>
      ) : project.outlineNodes.length > 0 ? (
        <div className="warn-banner">
          大纲已设定（{project.outlineNodes.length} 个阶段），开书问卷为可选步骤。可直接前往 <Link to="/write">章节写作</Link>。
        </div>
      ) : !project.meta.synopsis?.trim() || !project.meta.premise?.trim() ? (
        <div className="warn-banner">
          请先在 <Link to="/book/settings">书籍信息</Link> 填写作品简介与核心设定。
        </div>
      ) : null}

      {project.outlineNodes.length === 0 && !project.onboarding.completed ? (
        <div className="warn-banner">
          暂无大纲？可使用 <Link to="/book/bootstrap">灵感向导</Link> 或在书籍信息中导入。
        </div>
      ) : null}

      {!aiReady ? (
        <div className="warn-banner">
          生成问题需要配置 AI：请在右上角「AI 设置」中启用远程模型并填写 API Key。
        </div>
      ) : null}

      {isGenerating ? (
        <p className="muted-text onboarding-progress">
          生成进度：{generateProgress}/15（题目会逐条出现，无需等待全部完成）
        </p>
      ) : null}

      {!hasAnyQuestions && !isGenerating ? (
        <div className="empty-state">
          <p className="muted-text">点击下方按钮由 AI 生成 15 个问题。</p>
          <button
            className="primary-button"
            disabled={isGenerating || !aiReady}
            onClick={() => void handleGenerate()}
            type="button"
          >
            获取问题
          </button>
        </div>
      ) : hasAnyQuestions ? (
        <div ref={questionListRef} className="question-list">
          {questions.map((question, index) => (
            <article key={question.id} className="question-card">
              <h3>
                {index + 1}. {question.title.replace(/^\d+\.\s*/, "")}
              </h3>
              <p className="question-hint">{question.hint}</p>
              <Field label="你的回答">
                <textarea
                  rows={3}
                  placeholder={question.placeholder}
                  value={answers[question.id] ?? ""}
                  onChange={(event) =>
                    setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                  }
                />
              </Field>
            </article>
          ))}
        </div>
      ) : null}

      <div className="page-actions">
        {hasAnyQuestions || isGenerating ? (
          <button
            className="secondary-button"
            disabled={isGenerating || !aiReady}
            onClick={() => void handleGenerate()}
            type="button"
          >
            {isGenerating ? `生成中 ${generateProgress}/15...` : "重新获取问题"}
          </button>
        ) : null}
        {!hasAnyQuestions && !isGenerating ? (
          <button
            className="primary-button"
            disabled={!aiReady}
            onClick={() => void handleGenerate()}
            type="button"
          >
            获取问题
          </button>
        ) : null}
        <button
          className="primary-button"
          disabled={!hasAllQuestions || isSubmitting || isGenerating}
          onClick={() => void handleSubmit()}
          type="button"
        >
          {isSubmitting ? "提交中..." : "完成开书问卷"}
        </button>
      </div>
    </section>
  );
}
