import { useEffect, useRef, useState } from "react";

import { fetchSystemPromptPreview, testAiConnection } from "../api";
import { useModalReveal } from "../hooks/useAnimeReveal";
import type { AiSettings } from "../types";

const PROVIDER_PRESETS: Array<{
  id: string;
  label: string;
  baseUrl: string;
  model: string;
}> = [
  {
    id: "openai-compatible",
    label: "OpenAI 兼容",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini"
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat"
  },
  {
    id: "moonshot",
    label: "Moonshot",
    baseUrl: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-8k"
  },
  {
    id: "xiaomi-mimo",
    label: "小米 MiMo",
    baseUrl: "https://api.xiaomimimo.com/v1",
    model: "mimo-v2.5-pro"
  },
  {
    id: "rule-based",
    label: "仅本地模板（不调用远程）",
    baseUrl: "",
    model: ""
  }
];

const SUPPLEMENT_HINT =
  "可选。系统已自动合成完整角色与禁令约束；此处仅追加个性化要求，例如禁用某些词汇、固定人称、口语风格等。若首行写 #OVERRIDE 可完全替换自动提示词（不推荐）。";

interface SettingsModalProps {
  aiSettings: AiSettings;
  onClose: () => void;
  onChange: (settings: AiSettings) => void;
  onSave?: () => Promise<void>;
}

export default function SettingsModal(props: SettingsModalProps): JSX.Element {
  const [testMessage, setTestMessage] = useState("");
  const [effectivePrompt, setEffectivePrompt] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [showEffectivePrompt, setShowEffectivePrompt] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  function update<K extends keyof AiSettings>(key: K, value: AiSettings[K]): void {
    props.onChange({ ...props.aiSettings, [key]: value });
  }

  function applyPreset(presetId: string): void {
    const preset = PROVIDER_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) {
      return;
    }

    props.onChange({
      ...props.aiSettings,
      provider: preset.id,
      baseUrl: preset.baseUrl,
      model: preset.model,
      enabled: preset.id !== "rule-based"
    });
  }

  async function loadEffectivePrompt(): Promise<void> {
    try {
      setIsLoadingPrompt(true);
      const result = await fetchSystemPromptPreview();
      setEffectivePrompt(result.prompt);
    } catch (error) {
      setEffectivePrompt(error instanceof Error ? error.message : "加载失败");
    } finally {
      setIsLoadingPrompt(false);
    }
  }

  useEffect(() => {
    void loadEffectivePrompt();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEffectivePrompt();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [props.aiSettings.systemPrompt]);

  async function handleTestConnection(): Promise<void> {
    try {
      setIsTesting(true);
      setTestMessage("正在测试连接（约 5–25 秒）...");
      const result = await testAiConnection(props.aiSettings);
      setTestMessage(result.ok ? `连接成功：${result.message}` : `连接失败：${result.message}`);
    } catch (error) {
      setTestMessage(error instanceof Error ? error.message : "连接测试失败");
    } finally {
      setIsTesting(false);
    }
  }

  const isOverride = props.aiSettings.systemPrompt.trim().startsWith("#OVERRIDE");
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  useModalReveal(true, backdropRef, panelRef);

  return (
    <div ref={backdropRef} className="modal-backdrop" role="presentation" onClick={props.onClose}>
      <section
        ref={panelRef}
        className="modal-panel modal-panel-wide"
        role="dialog"
        aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">设置</p>
            <h2 id="settings-title">AI 大模型配置</h2>
          </div>
          <button className="mini-button mini-button--icon" onClick={props.onClose} type="button">
            ×
          </button>
        </div>

        <p className="modal-note">
          写作时<strong>始终使用系统自动合成的完整提示词</strong>（身份、禁令、平台/类型规则、问卷、角色纪律等）。
          下方文本框仅用于<strong>追加</strong>个性化约束，不会用一两句话替代整套规则。
          小米 MiMo 按量 Key（sk-）用预设地址；订阅套餐（tp-）请将 Base URL 改为
          https://token-plan-cn.xiaomimimo.com/v1 。
        </p>

        <div className="form-grid">
          <label className="field span-2 switch-row">
            <input
              type="checkbox"
              checked={props.aiSettings.enabled}
              onChange={(event) => update("enabled", event.target.checked)}
            />
            <span>启用远程 AI 生成</span>
          </label>

          <label className="field span-2">
            <span>服务商预设</span>
            <select
              value={props.aiSettings.provider}
              onChange={(event) => applyPreset(event.target.value)}
            >
              {PROVIDER_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field span-2">
            <span>API Base URL</span>
            <input
              placeholder="https://api.openai.com/v1"
              value={props.aiSettings.baseUrl}
              onChange={(event) => update("baseUrl", event.target.value)}
            />
          </label>

          <label className="field span-2">
            <span>API Key</span>
            <input
              type="password"
              autoComplete="off"
              placeholder="sk-..."
              value={props.aiSettings.apiKey}
              onChange={(event) => update("apiKey", event.target.value)}
            />
          </label>

          <label className="field">
            <span>模型</span>
            <input
              value={props.aiSettings.model}
              onChange={(event) => update("model", event.target.value)}
            />
          </label>

          <label className="field">
            <span>温度 ({props.aiSettings.temperature.toFixed(1)})</span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={props.aiSettings.temperature}
              onChange={(event) => update("temperature", Number(event.target.value))}
            />
          </label>

          <label className="field">
            <span>Token 总量</span>
            <input
              type="number"
              min={0}
              step={1000}
              placeholder="如 32000、128000"
              value={props.aiSettings.contextWindowSize || ""}
              onChange={(event) => update("contextWindowSize", Number(event.target.value) || 0)}
            />
            <span className="field-hint">模型的 Token 配额总量（如无法自动获取，可手动填写）</span>
          </label>

          <div className="field span-2">
            <div className="prompt-section-head">
              <span>追加约束（可选）</span>
              <div className="prompt-section-actions">
                <button
                  className="toolbar-text-button"
                  onClick={() => update("systemPrompt", "")}
                  type="button"
                >
                  清空追加
                </button>
              </div>
            </div>
            {isOverride ? (
              <p className="warn-inline">当前为 #OVERRIDE 模式：将完全替换自动提示词，约束稳定性可能下降。</p>
            ) : null}
            <textarea
              rows={4}
              placeholder={SUPPLEMENT_HINT}
              value={props.aiSettings.systemPrompt}
              onChange={(event) => update("systemPrompt", event.target.value)}
            />
          </div>
        </div>

        <div className="effective-prompt-section">
          <div className="prompt-section-head">
            <strong>实际生效的系统提示词</strong>
            <div className="prompt-section-actions">
              <button
                className="toolbar-text-button"
                onClick={() => setShowEffectivePrompt((current) => !current)}
                type="button"
              >
                {showEffectivePrompt ? "收起" : "展开"}
              </button>
              <button
                className="toolbar-text-button"
                disabled={isLoadingPrompt}
                onClick={() => void loadEffectivePrompt()}
                type="button"
              >
                {isLoadingPrompt ? "刷新中..." : "刷新"}
              </button>
            </div>
          </div>
          {showEffectivePrompt ? (
            <pre className="prompt-preview modal-prompt-preview">{effectivePrompt || "加载中..."}</pre>
          ) : null}
          <p className="muted-text prompt-footnote">
            字数约 {effectivePrompt.length} 字。保存项目后，生成正文与开书问卷均使用此提示词。
          </p>
        </div>

        {testMessage ? <p className={`test-message ${testMessage.includes("成功") ? "good" : ""}`}>{testMessage}</p> : null}

        <div className="modal-actions">
          <button
            className="secondary-button"
            disabled={isTesting || !props.aiSettings.enabled}
            onClick={() => void handleTestConnection()}
            type="button"
          >
            {isTesting ? "测试中..." : "测试连接"}
          </button>
          <button
            className="primary-button"
            disabled={isSaving}
            onClick={() => {
              if (props.onSave) {
                setIsSaving(true);
                void props.onSave().then(() => {
                  props.onClose();
                }).catch(() => {
                  props.onClose();
                }).finally(() => {
                  setIsSaving(false);
                });
              } else {
                props.onClose();
              }
            }}
            type="button"
          >
            {isSaving ? "保存中..." : "完成"}
          </button>
        </div>
      </section>
    </div>
  );
}
