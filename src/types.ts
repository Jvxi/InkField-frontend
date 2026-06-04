export interface ProjectMeta {
  title: string;
  synopsis: string;
  genre: string;
  premise: string;
  tone: string;
  targetLength: string;
  styleRules: string[];
  worldRules: string[];
  strictMode: boolean;
  publishPlatform: string;
  audienceChannel: "male" | "female" | string;
  novelType: string;
}

export interface NovelAudienceInfo {
  id: "male" | "female" | string;
  label: string;
  description: string;
}

export interface NovelTypeInfo {
  id: string;
  label: string;
  audienceChannel: "male" | "female" | string;
  description: string;
  writingHints: string[];
}

export interface NovelTypeCatalogResponse {
  audiences: NovelAudienceInfo[];
  types: NovelTypeInfo[];
}

export interface PublishPlatformInfo {
  id: string;
  label: string;
  description: string;
  writingRules: string[];
}

export interface AiSettings {
  enabled: boolean;
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  contextWindowSize: number;
  systemPrompt: string;
}

export interface OutlineNode {
  id: string;
  order: number;
  title: string;
  summary: string;
  objective: string;
  keyConflict: string;
  mustKeep: string[];
  forbidden: string[];
}

export interface Character {
  id: string;
  name: string;
  role: string;
  profile: string;
  motivation: string;
  constraint: string;
  relationships: string;
}

export interface ForeshadowingItem {
  id: string;
  title: string;
  setup: string;
  payoff: string;
  plannedReveal: string;
  status: "planned" | "revealed" | "paid_off";
  notes: string;
}

export interface Chapter {
  id: string;
  order: number;
  title: string;
  summary: string;
  purpose: string;
  outlineNodeIds: string[];
  characterIds: string[];
  foreshadowingIds: string[];
  mandatoryBeats: string[];
  forbiddenContent: string[];
  notes: string;
  draft: string;
}

export interface OnboardingAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface OnboardingState {
  completed: boolean;
  questions: OnboardingQuestion[];
  answers: OnboardingAnswer[];
}

export interface OnboardingQuestion {
  id: string;
  title: string;
  hint: string;
  placeholder: string;
}

export interface ImportedOutlineNode {
  title: string;
  summary: string;
  objective: string;
  keyConflict: string;
  mustKeep: string[];
  forbidden: string[];
}

export interface ImportedChapter {
  order: number;
  title: string;
  summary: string;
  purpose: string;
  content: string;
}

export interface ImportedCharacter {
  name: string;
  role: string;
  profile: string;
  motivation: string;
  constraint: string;
  relationships: string;
}

export interface ImportedForeshadowing {
  title: string;
  setup: string;
  payoff: string;
  plannedReveal: string;
  status: string;
}

export interface ProjectImportAnalysis {
  title: string;
  synopsis: string;
  premise: string;
  tone: string;
  targetLength: string;
  styleRules: string[];
  worldRules: string[];
  outlineNodes: ImportedOutlineNode[];
  chapters: ImportedChapter[];
  characters: ImportedCharacter[];
  foreshadowing: ImportedForeshadowing[];
}

export interface OutlineBootstrapProposal {
  id: string;
  name: string;
  pitch: string;
  premise: string;
  tone: string;
  targetLength: string;
  styleRules: string[];
  worldRules: string[];
  outlineNodes: {
    title: string;
    summary: string;
    objective: string;
    keyConflict: string;
    mustKeep: string[];
    forbidden: string[];
  }[];
  characters: {
    name: string;
    role: string;
    profile: string;
    motivation: string;
    constraint: string;
    relationships: string;
  }[];
}

export interface BookSummary {
  id: string;
  title: string;
  genre: string;
  updatedAt: string;
  chapterCount: number;
  onboardingCompleted: boolean;
}

export interface LibraryIndex {
  activeBookId: string;
  books: BookSummary[];
}

export interface ProjectEnvelope {
  bookId: string;
  project: Project;
}

export interface Project {
  meta: ProjectMeta;
  aiSettings: AiSettings;
  onboarding: OnboardingState;
  outlineNodes: OutlineNode[];
  characters: Character[];
  foreshadowing: ForeshadowingItem[];
  chapters: Chapter[];
  updatedAt: string;
}

export interface ComplianceReport {
  passed: boolean;
  metaLabelHits: string[];
  narrationMetaHits: string[];
  missingMandatoryBeats: string[];
  forbiddenHits: string[];
  missingOutlineAnchors: string[];
  missingChapterAnchors: string[];
  groundedOutlineTitles: string[];
  groundedCharacterNames: string[];
}

export interface ChapterGenerationResponse {
  chapterId: string;
  provider: string;
  accepted: boolean;
  draft: string;
  promptPreview: string;
  compliance: ComplianceReport;
  rejectionReason: string;
  warnings: string[];
}

export interface GenerationStreamEvent {
  type: "delta" | "done" | "error" | "cancelled";
  content?: string;
  result?: ChapterGenerationResponse;
  message?: string;
}

export interface ReviewIssue {
  original: string;
  description: string;
  suggestion: string;
}

export interface ReviewStreamEvent {
  type: "progress" | "result" | "done" | "error" | "cancelled";
  chapterId?: string;
  chapterTitle?: string;
  chapterIndex?: number;
  totalChapters?: number;
  issues?: ReviewIssue[];
  reviewedCount?: number;
  issueCount?: number;
  message?: string;
}
