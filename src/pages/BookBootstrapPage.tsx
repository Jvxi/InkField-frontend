import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  applyOutlineBootstrapProposal,
  generateOutlineBootstrapProposals,
  streamOutlineBootstrapQuestions
} from "../api";
import { Field } from "../components/Field";
import { useProject } from "../context/ProjectContext";
import { useStaggerScaleReveal, useStepTransition } from "../hooks/useAnimeReveal";
import type { OnboardingAnswer, OnboardingQuestion, OutlineBootstrapProposal } from "../types";

type WizardStep = "intro" | "questions" | "proposals" | "done";

function buildAnswersMap(
  questions: OnboardingQuestion[],
  saved: Record<string, string>
): Record<string, string> {
  const initial: Record<string, string> = { ...saved };
  for (const question of questions) {
    if (!initial[question.id]) {
      initial[question.id] = "";
    }
  }
  return initial;
}

export default function BookBootstrapPage(): JSX.Element {
  const { project, reloadProject, applyProjectUpdate, setErrorText, setStatusText, saveProject } = useProject();
  const navigate = useNavigate();

  const [step, setStep] = useState<WizardStep>("intro");
  const [questions, setQuestions] = useState<OnboardingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [proposals, setProposals] = useState<OutlineBootstrapProposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState("");
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [questionProgress, setQuestionProgress] = useState(0);
  const [isGeneratingProposals, setIsGeneratingProposals] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const questionListRef = useStaggerScaleReveal<HTMLDivElement>(".question-card", [questions.length]);
  const proposalGridRef = useStaggerScaleReveal<HTMLDivElement>(".proposal-card", [proposals.length]);
  const stepRef = useStepTransition<HTMLDivElement>(step);

  if (!project) {
    return <></>;
  }

  const hasOutline = project.outlineNodes.length > 0;

  if (hasOutline && step === "intro") {
    return (
      <section className="panel page-panel bootstrap-page">
        <div className="section-heading">
          <div>
            <p className="eyebrow">开书灵感向导</p>
            <h2>大纲已设定</h2>
          </div>
        </div>
        <div className="warn-banner">
          您已经完成了大纲设定（共 {project.outlineNodes.length} 个阶段），无需再次使用灵感向导。
        </div>
        <div className="page-actions">
          <Link className="secondary-button" to="/outline">
            查看大纲
          </Link>
          <Link className="primary-button" to="/book">
            返回总览
          </Link>
        </div>
      </section>
    );
  }

  const aiReady = project.aiSettings.enabled && project.aiSettings.apiKey.trim() !== "";
  const hasAllQuestions = questions.length === 8;
  const selectedProposal = proposals.find((item) => item.id === selectedProposalId) ?? null;

  async function handleGenerateQuestions(): Promise<void> {
    try {
      setIsGeneratingQuestions(true);
      setQuestionProgress(0);
      setQuestions([]);
      setAnswers({});
      setProposals([]);
      setSelectedProposalId("");
      setErrorText("");
      setStatusText("正在生成灵感问题…");
      await saveProject();
      await streamOutlineBootstrapQuestions({
        onQuestion: (question, index) => {
          setQuestionProgress(index);
          setQuestions((current) => {
            const next = [...current, question];
            next.sort((a, b) => a.id.localeCompare(b.id));
            return next;
          });
          setAnswers((current) => ({ ...current, [question.id]: current[question.id] ?? "" }));
        },
        onDone: (loaded) => {
          setQuestions(loaded);
          setAnswers(buildAnswersMap(loaded, {}));
          setQuestionProgress(8);
          setStep("questions");
          setStatusText("已生成 8 个灵感问题，请作答后生成大纲方案。");
        },
        onError: (message) => setErrorText(message)
      });
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "生成问题失败");
    } finally {
      setIsGeneratingQuestions(false);
    }
  }

  async function handleGenerateProposals(): Promise<void> {
    try {
      setIsGeneratingProposals(true);
      setErrorText("");
      setStatusText("正在根据你的回答构思三个大纲方案…");
      const payload: OnboardingAnswer[] = questions.map((question) => ({
        questionId: question.id,
        question: question.title,
        answer: answers[question.id]?.trim() ?? ""
      }));
      const result = await generateOutlineBootstrapProposals(payload);
      setProposals(result.proposals);
      setSelectedProposalId(result.proposals[0]?.id ?? "");
      setStep("proposals");
      setStatusText("已生成三个大纲方案，请选择其一。");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "生成大纲方案失败");
    } finally {
      setIsGeneratingProposals(false);
    }
  }

  async function handleApply(): Promise<void> {
    if (!selectedProposal) {
      return;
    }
    try {
      setIsApplying(true);
      setErrorText("");
      const envelope = await applyOutlineBootstrapProposal(selectedProposal);
      applyProjectUpdate(() => envelope.project);
      setStep("done");
      setStatusText(`已应用方案「${selectedProposal.name}」，大纲与设定已写入。`);
      await reloadProject();
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "应用方案失败");
    } finally {
      setIsApplying(false);
    }
  }

  const steps = [
    { id: "intro", label: "介绍" },
    { id: "questions", label: "灵感问题" },
    { id: "proposals", label: "大纲方案" },
    { id: "done", label: "完成" }
  ] as const;

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  return (
    <section className="panel page-panel bootstrap-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">开书灵感向导</p>
          <h2>还没想好大纲？</h2>
        </div>
      </div>

      <div className="stepper">
        {steps.map((s, index) => (
          <div
            key={s.id}
            className={`stepper-step ${index < currentStepIndex ? "stepper-step--completed" : ""} ${index === currentStepIndex ? "stepper-step--current" : ""} ${index > currentStepIndex ? "stepper-step--future" : ""}`}
          >
            <div className="stepper-dot">
              {index < currentStepIndex ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="4 8 7 11 12 5" />
                </svg>
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <span className="stepper-label">{s.label}</span>
            {index < steps.length - 1 ? <div className="stepper-line" /> : null}
          </div>
        ))}
      </div>

      {!aiReady ? (
        <div className="warn-banner">
          需要先在右上角「AI 设置」中启用远程模型并填写 API Key。
        </div>
      ) : null}

      {step === "intro" ? (
        <div className="bootstrap-step panel-inset">
          <button
            className="primary-button"
            disabled={!aiReady || isGeneratingQuestions}
            onClick={() => void handleGenerateQuestions()}
            type="button"
          >
            {isGeneratingQuestions ? `正在出题 ${questionProgress}/8…` : "开始：获取灵感问题"}
          </button>
        </div>
      ) : null}

      {step === "questions" || (step === "intro" && (isGeneratingQuestions || hasAllQuestions)) ? (
        <div className="bootstrap-step">
          {isGeneratingQuestions ? (
            <p className="muted-text onboarding-progress">出题进度：{questionProgress}/8</p>
          ) : null}
          {questions.length > 0 ? (
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
          {hasAllQuestions && !isGeneratingQuestions ? (
            <div className="page-actions">
              <button
                className="secondary-button"
                disabled={isGeneratingQuestions}
                onClick={() => void handleGenerateQuestions()}
                type="button"
              >
                重新获取问题
              </button>
              <button
                className="primary-button"
                disabled={isGeneratingProposals || questions.some((q) => !answers[q.id]?.trim())}
                onClick={() => void handleGenerateProposals()}
                type="button"
              >
                {isGeneratingProposals ? "正在生成三个方案…" : "生成三个大纲方案"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === "proposals" ? (
        <div ref={stepRef} className="bootstrap-step">
          <div ref={proposalGridRef} className="proposal-grid">
            {proposals.map((proposal) => (
              <article
                key={proposal.id}
                className={`proposal-card ${proposal.id === selectedProposalId ? "is-selected" : ""}`}
              >
                <label className="proposal-card-select">
                  <input
                    type="radio"
                    name="outline-proposal"
                    checked={proposal.id === selectedProposalId}
                    onChange={() => setSelectedProposalId(proposal.id)}
                  />
                  <span className="proposal-card-title">{proposal.name}</span>
                </label>
                <p className="proposal-pitch">{proposal.pitch}</p>
                <p className="proposal-meta">
                  <span>{proposal.tone}</span> · <span>{proposal.targetLength}</span>
                </p>
                <p className="proposal-premise">{proposal.premise}</p>
                <h4>剧情阶段（{proposal.outlineNodes.length}）</h4>
                <ul className="proposal-outline-preview">
                  {proposal.outlineNodes.map((node, index) => (
                    <li key={`${proposal.id}-${index}`}>
                      <strong>{node.title}</strong> — {node.summary}
                    </li>
                  ))}
                </ul>
                <h4>核心角色（{proposal.characters.length}）</h4>
                <ul className="proposal-characters-preview">
                  {proposal.characters.map((character, index) => (
                    <li key={`${proposal.id}-c-${index}`}>
                      {character.name}（{character.role}）
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className="page-actions">
            <button className="secondary-button" onClick={() => setStep("questions")} type="button">
              返回修改回答
            </button>
            <button
              className="primary-button"
              disabled={!selectedProposal || isApplying}
              onClick={() => void handleApply()}
              type="button"
            >
              {isApplying ? "正在写入…" : "采用此方案并写入项目"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="bootstrap-step panel-inset bootstrap-done">
          <h3>大纲方案已应用</h3>
          <p>故事前提、大纲阶段与角色已写入当前书籍。建议接下来：</p>
          <ul>
            <li>
              <Link to="/outline">查看并微调大纲</Link>
            </li>
            <li>
              <Link to="/book/settings">完善书籍信息</Link>
            </li>
            <li>
              <Link to="/onboarding">完成 15 问开书问卷</Link>（AI 写作前建议完成）
            </li>
          </ul>
          <button className="primary-button" onClick={() => navigate("/book")} type="button">
            前往书籍总览
          </button>
        </div>
      ) : null}
    </section>
  );
}
