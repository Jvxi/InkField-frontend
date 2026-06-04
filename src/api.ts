import type {
  AiSettings,
  BookSummary,
  ChapterGenerationResponse,
  GenerationStreamEvent,
  ReviewIssue,
  ReviewStreamEvent,
  LibraryIndex,
  NovelTypeCatalogResponse,
  OnboardingAnswer,
  OnboardingQuestion,
  OutlineBootstrapProposal,
  Project,
  ProjectEnvelope,
  ProjectImportAnalysis,
  PublishPlatformInfo
} from "./types";
import { getAuthToken } from "./utils/authStorage";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

function authHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (extra) {
    const extraRecord = extra instanceof Headers ? Object.fromEntries(extra.entries()) : extra;
    Object.assign(headers, extraRecord);
  }
  return headers;
}

async function request<T>(path: string, init?: RequestInit, timeoutMs?: number): Promise<T> {
  const controller = timeoutMs != null && timeoutMs > 0 ? new AbortController() : null;
  const timeoutId =
    controller != null
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : undefined;

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      headers: authHeaders(init?.headers),
      ...init,
      signal: controller?.signal
    });
  } catch (error) {
    if (controller?.signal.aborted) {
      throw new Error(`请求超时（${Math.round((timeoutMs ?? 0) / 1000)} 秒），请稍后重试。`);
    }
    throw error;
  } finally {
    if (timeoutId != null) {
      window.clearTimeout(timeoutId);
    }
  }

  if (!response.ok) {
    const fallbackMessage = `请求失败（${response.status}）`;

    try {
      const errorPayload = (await response.json()) as { message?: string };
      throw new Error(errorPayload.message ?? fallbackMessage);
    } catch (error) {
      if (error instanceof Error && error.message !== fallbackMessage) {
        throw error;
      }
      throw new Error(fallbackMessage);
    }
  }

  return (await response.json()) as T;
}

export interface CaptchaChallenge {
  captchaId: string;
  question: string;
}

export function fetchCaptcha(): Promise<CaptchaChallenge> {
  return request<CaptchaChallenge>("/auth/captcha");
}

export function checkCaptcha(payload: {
  captchaId: string;
  captchaAnswer: string;
}): Promise<{ valid: boolean }> {
  return request<{ valid: boolean }>("/auth/captcha/check", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function sendRegisterCode(payload: {
  email: string;
  captchaId: string;
  captchaAnswer: string;
}): Promise<{ ok: boolean; message: string; devCode?: string }> {
  return request<{ ok: boolean; message: string; devCode?: string }>("/auth/send-code", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function register(
  email: string,
  password: string,
  emailCode: string
): Promise<{ token: string; userId: string; email: string; devMailMode: boolean }> {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, emailCode })
  });
}

export function login(
  email: string,
  password: string
): Promise<{ token: string; userId: string; email: string }> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function logout(): Promise<{ ok: boolean }> {
  return request("/auth/logout", { method: "POST" });
}

export function fetchAuthMe(): Promise<{ userId: string; email: string }> {
  return request("/auth/me");
}

export function fetchProject(): Promise<ProjectEnvelope> {
  return request<ProjectEnvelope>("/project");
}

export function fetchLibrary(): Promise<LibraryIndex> {
  return request<LibraryIndex>("/library");
}

export interface CreateBookPayload {
  title?: string;
  audienceChannel: "male" | "female";
  novelType: string;
}

export function createBook(payload: CreateBookPayload): Promise<ProjectEnvelope> {
  return request<ProjectEnvelope>("/library/books", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function switchActiveBook(bookId: string): Promise<ProjectEnvelope> {
  return request<ProjectEnvelope>("/library/active", {
    method: "PUT",
    body: JSON.stringify({ bookId })
  });
}

export function deleteBook(bookId: string): Promise<LibraryIndex> {
  return request<LibraryIndex>(`/library/books/${encodeURIComponent(bookId)}`, {
    method: "DELETE"
  });
}

export function fetchPlatforms(): Promise<PublishPlatformInfo[]> {
  return request<PublishPlatformInfo[]>("/platforms");
}

export function fetchNovelTypes(): Promise<NovelTypeCatalogResponse> {
  return request<NovelTypeCatalogResponse>("/novel-types");
}

export function persistProject(project: Project): Promise<ProjectEnvelope> {
  return request<ProjectEnvelope>("/project", {
    method: "PUT",
    body: JSON.stringify(project)
  });
}

export function analyzeProjectImportOutline(outlineText: string): Promise<ProjectImportAnalysis> {
  return request<ProjectImportAnalysis>(
    "/project/import/analyze/outline",
    {
      method: "POST",
      body: JSON.stringify({ outlineText })
    },
    180_000
  );
}

export function analyzeProjectImportChapters(chaptersText: string): Promise<ProjectImportAnalysis> {
  return request<ProjectImportAnalysis>(
    "/project/import/analyze/chapters",
    {
      method: "POST",
      body: JSON.stringify({ chaptersText })
    },
    180_000
  );
}

export function generateChapter(chapterId: string): Promise<ChapterGenerationResponse> {
  return request<ChapterGenerationResponse>(`/chapters/${chapterId}/generate`, {
    method: "POST"
  });
}

function extractSsePayload(block: string): string {
  const payload = block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n")
    .trim();

  if (payload.startsWith("data:")) {
    return payload.slice(5).trim();
  }

  return payload;
}

function parseSseJsonPayload(payload: string): unknown | null {
  if (!payload) {
    return null;
  }

  try {
    let parsed: unknown = JSON.parse(payload);
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseSseChunk<T>(buffer: string): { events: T[]; rest: string } {
  const events: T[] = [];
  const blocks = buffer.split("\n\n");

  for (let index = 0; index < blocks.length - 1; index += 1) {
    const payload = extractSsePayload(blocks[index]);
    if (!payload) {
      continue;
    }

    const parsed = parseSseJsonPayload(payload);
    if (parsed && typeof parsed === "object") {
      events.push(parsed as T);
    }
  }

  return {
    events,
    rest: blocks.at(-1) ?? ""
  };
}

async function readHttpErrorMessage(response: Response): Promise<string> {
  const fallback = `请求失败（${response.status}）`;
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? fallback;
  } catch {
    return fallback;
  }
}

export async function generateChapterStream(
  chapterId: string,
  handlers: {
    onDelta: (content: string, accumulated: string) => void;
    onDone: (result: ChapterGenerationResponse) => void;
    onCancelled: (message: string) => void;
    onError: (message: string) => void;
  },
  signal?: AbortSignal,
  continueMode: boolean = false
): Promise<void> {
  const streamHeaders: Record<string, string> = { Accept: "text/event-stream" };
  const token = getAuthToken();
  if (token) {
    streamHeaders.Authorization = `Bearer ${token}`;
  }

  const url = continueMode
    ? `${apiBaseUrl}/chapters/${chapterId}/generate/stream?continue=true`
    : `${apiBaseUrl}/chapters/${chapterId}/generate/stream`;

  const response = await fetch(url, {
    method: "POST",
    headers: streamHeaders,
    signal
  });

  if (!response.ok) {
    throw new Error(await readHttpErrorMessage(response));
  }
  if (!response.body) {
    throw new Error("流式生成失败：无响应内容");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";

  const consumeEvents = (events: GenerationStreamEvent[]): void => {
    for (const event of events) {
      if (event.type === "delta" && event.content) {
        accumulated += event.content;
        handlers.onDelta(event.content, accumulated);
      } else if (event.type === "done" && event.result) {
        handlers.onDone(event.result);
      } else if (event.type === "cancelled") {
        handlers.onCancelled(event.message ?? "生成已取消");
      } else if (event.type === "error") {
        handlers.onError(event.message ?? "流式生成失败");
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (value) {
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseChunk<GenerationStreamEvent>(buffer);
      buffer = parsed.rest;
      consumeEvents(parsed.events);
    }
    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    const parsed = parseSseChunk<GenerationStreamEvent>(`${buffer}\n\n`);
    consumeEvents(parsed.events);
  }
}

export function fetchOnboardingQuestions(): Promise<OnboardingQuestion[]> {
  return request<OnboardingQuestion[]>("/onboarding/questions");
}

export function generateOnboardingQuestions(): Promise<{
  questions: OnboardingQuestion[];
  bookId: string;
  project: Project;
}> {
  return request<{ questions: OnboardingQuestion[]; bookId: string; project: Project }>(
    "/onboarding/generate",
    {
      method: "POST"
    }
  );
}

export interface OnboardingStreamEvent {
  type: "question" | "done" | "error";
  question?: OnboardingQuestion;
  questions?: OnboardingQuestion[];
  bookId?: string;
  project?: Project;
  message?: string;
}

export async function generateOnboardingQuestionsStream(handlers: {
  onQuestion: (question: OnboardingQuestion, index: number) => void;
  onDone: (result: { questions: OnboardingQuestion[]; bookId: string; project: Project }) => void;
  onError: (message: string) => void;
}): Promise<void> {
  const streamHeaders: Record<string, string> = { Accept: "text/event-stream" };
  const token = getAuthToken();
  if (token) {
    streamHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBaseUrl}/onboarding/generate/stream`, {
    method: "POST",
    headers: streamHeaders
  });

  if (!response.ok) {
    throw new Error(await readHttpErrorMessage(response));
  }
  if (!response.body) {
    throw new Error("流式生成失败：无响应内容");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let questionIndex = 0;

  const consumeEvents = (events: OnboardingStreamEvent[]): void => {
    for (const event of events) {
      if (event.type === "question" && event.question) {
        questionIndex += 1;
        handlers.onQuestion(event.question, questionIndex);
      } else if (event.type === "done" && event.project && event.questions) {
        handlers.onDone({
          questions: event.questions,
          bookId: event.bookId ?? "",
          project: event.project
        });
      } else if (event.type === "error") {
        handlers.onError(event.message ?? "生成失败");
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (value) {
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseChunk<OnboardingStreamEvent>(buffer);
      buffer = parsed.rest;
      consumeEvents(parsed.events);
    }
    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    const parsed = parseSseChunk<OnboardingStreamEvent>(`${buffer}\n\n`);
    consumeEvents(parsed.events);
  }
}

export function submitOnboardingAnswers(answers: OnboardingAnswer[]): Promise<Project> {
  return request<Project>("/onboarding/submit", {
    method: "POST",
    body: JSON.stringify({ answers })
  });
}

export interface OutlineBootstrapStreamEvent {
  type: "question" | "done" | "error";
  question?: OnboardingQuestion;
  questions?: OnboardingQuestion[];
  message?: string;
}

export async function streamOutlineBootstrapQuestions(handlers: {
  onQuestion: (question: OnboardingQuestion, index: number) => void;
  onDone: (questions: OnboardingQuestion[]) => void;
  onError: (message: string) => void;
}): Promise<void> {
  const streamHeaders: Record<string, string> = { Accept: "text/event-stream" };
  const token = getAuthToken();
  if (token) {
    streamHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBaseUrl}/outline-bootstrap/questions/stream`, {
    method: "POST",
    headers: streamHeaders
  });

  if (!response.ok) {
    throw new Error(await readHttpErrorMessage(response));
  }
  if (!response.body) {
    throw new Error("流式生成失败：无响应内容");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let questionIndex = 0;
  let streamFailed = false;

  const consumeEvents = (events: OutlineBootstrapStreamEvent[]): void => {
    for (const event of events) {
      if (event.type === "question" && event.question) {
        questionIndex += 1;
        handlers.onQuestion(event.question, questionIndex);
      } else if (event.type === "done" && event.questions) {
        handlers.onDone(event.questions);
      } else if (event.type === "error") {
        streamFailed = true;
        handlers.onError(event.message ?? "生成失败");
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (value) {
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseChunk<OutlineBootstrapStreamEvent>(buffer);
      buffer = parsed.rest;
      consumeEvents(parsed.events);
    }
    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    const parsed = parseSseChunk<OutlineBootstrapStreamEvent>(`${buffer}\n\n`);
    consumeEvents(parsed.events);
  }

  if (!streamFailed && questionIndex === 0) {
    handlers.onError("未收到有效问题，请检查 AI 配置后重试。");
  }
}

export function generateOutlineBootstrapProposals(
  answers: OnboardingAnswer[]
): Promise<{ proposals: OutlineBootstrapProposal[] }> {
  return request<{ proposals: OutlineBootstrapProposal[] }>("/outline-bootstrap/proposals", {
    method: "POST",
    body: JSON.stringify({ answers })
  });
}

export function applyOutlineBootstrapProposal(
  proposal: OutlineBootstrapProposal
): Promise<ProjectEnvelope> {
  return request<ProjectEnvelope>("/outline-bootstrap/apply", {
    method: "POST",
    body: JSON.stringify({ proposal })
  });
}

export function fetchSystemPromptPreview(): Promise<{ prompt: string }> {
  return request<{ prompt: string }>("/system-prompt/preview");
}

export function testAiConnection(aiSettings: AiSettings): Promise<{ ok: boolean; message: string }> {
  return request<{ ok: boolean; message: string }>("/ai/test", {
    method: "POST",
    body: JSON.stringify(aiSettings)
  });
}

export async function reviewChaptersStream(
  handlers: {
    onProgress: (chapterId: string, chapterTitle: string, chapterIndex: number, totalChapters: number) => void;
    onResult: (chapterId: string, chapterTitle: string, issues: ReviewIssue[]) => void;
    onDone: (reviewedCount: number, issueCount: number) => void;
    onError: (message: string) => void;
    onCancelled: (message: string) => void;
  },
  signal?: AbortSignal
): Promise<void> {
  const streamHeaders: Record<string, string> = { Accept: "text/event-stream" };
  const token = getAuthToken();
  if (token) {
    streamHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBaseUrl}/chapters/review/stream`, {
    method: "POST",
    headers: streamHeaders,
    signal
  });

  if (!response.ok) {
    throw new Error(await readHttpErrorMessage(response));
  }
  if (!response.body) {
    throw new Error("审查失败：无响应内容");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const consumeEvents = (events: ReviewStreamEvent[]): void => {
    for (const event of events) {
      if (event.type === "progress" && event.chapterId) {
        handlers.onProgress(event.chapterId, event.chapterTitle ?? "", event.chapterIndex ?? 0, event.totalChapters ?? 0);
      } else if (event.type === "result" && event.chapterId) {
        handlers.onResult(event.chapterId, event.chapterTitle ?? "", event.issues ?? []);
      } else if (event.type === "done") {
        handlers.onDone(event.reviewedCount ?? 0, event.issueCount ?? 0);
      } else if (event.type === "cancelled") {
        handlers.onCancelled(event.message ?? "审查已取消");
      } else if (event.type === "error") {
        handlers.onError(event.message ?? "审查失败");
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (value) {
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseChunk<ReviewStreamEvent>(buffer);
      buffer = parsed.rest;
      consumeEvents(parsed.events);
    }
    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    const parsed = parseSseChunk<ReviewStreamEvent>(`${buffer}\n\n`);
    consumeEvents(parsed.events);
  }
}
