import type {
  Chapter,
  Character,
  ForeshadowingItem,
  OutlineNode,
  Project,
  ProjectImportAnalysis
} from "../types";
import { createId } from "./projectHelpers";

export interface ImportApplySelection {
  meta: boolean;
  outline: boolean;
  chapters: boolean;
  characters: boolean;
  foreshadowing: boolean;
  replaceOutline: boolean;
  replaceChapters: boolean;
}

function mapForeshadowingStatus(status: string): ForeshadowingItem["status"] {
  const value = status.trim().toLowerCase();
  if (value === "planted" || value === "revealed") {
    return "revealed";
  }
  if (value === "resolved" || value === "paid_off") {
    return "paid_off";
  }
  return "planned";
}

/** 导入写入：分析结果非空则覆盖对应字段 */
function pickImportText(current: string, incoming: string): string {
  const next = incoming.trim();
  return next || current;
}

function mergeLines(current: string[], incoming: string[]): string[] {
  const merged = [...current];
  for (const line of incoming) {
    const value = line.trim();
    if (!value || merged.includes(value)) {
      continue;
    }
    merged.push(value);
  }
  return merged;
}

export function applyProjectImport(
  project: Project,
  analysis: ProjectImportAnalysis,
  selection: ImportApplySelection
): Project {
  let next: Project = { ...project };
  let importedUsefulInfo = false;

  if (selection.meta) {
    const hasMetaImport =
      analysis.title.trim().length > 0 ||
      analysis.synopsis.trim().length > 0 ||
      analysis.premise.trim().length > 0 ||
      analysis.tone.trim().length > 0 ||
      analysis.targetLength.trim().length > 0 ||
      analysis.styleRules.length > 0 ||
      analysis.worldRules.length > 0;
    next = {
      ...next,
      meta: {
        ...next.meta,
        title: pickImportText(next.meta.title, analysis.title),
        synopsis: pickImportText(next.meta.synopsis ?? "", analysis.synopsis),
        premise: pickImportText(next.meta.premise, analysis.premise),
        tone: pickImportText(next.meta.tone, analysis.tone),
        targetLength: pickImportText(next.meta.targetLength, analysis.targetLength),
        styleRules: mergeLines(next.meta.styleRules, analysis.styleRules),
        worldRules: mergeLines(next.meta.worldRules, analysis.worldRules)
      }
    };
    importedUsefulInfo = importedUsefulInfo || hasMetaImport;
  }

  if (selection.outline && analysis.outlineNodes.length > 0) {
    const baseOrder = selection.replaceOutline
      ? 0
      : next.outlineNodes.reduce((max, node) => Math.max(max, node.order), 0);
    const imported: OutlineNode[] = analysis.outlineNodes.map((node, index) => ({
      id: createId(),
      order: baseOrder + index + 1,
      title: node.title,
      summary: node.summary,
      objective: node.objective,
      keyConflict: node.keyConflict,
      mustKeep: node.mustKeep ?? [],
      forbidden: node.forbidden ?? []
    }));
    next = {
      ...next,
      outlineNodes: selection.replaceOutline ? imported : [...next.outlineNodes, ...imported]
    };
    importedUsefulInfo = true;
  }

  if (selection.characters && analysis.characters.length > 0) {
    const imported: Character[] = analysis.characters.map((character) => ({
      id: createId(),
      name: character.name,
      role: character.role,
      profile: character.profile,
      motivation: character.motivation,
      constraint: character.constraint,
      relationships: character.relationships
    }));
    next = {
      ...next,
      characters: [...next.characters, ...imported]
    };
    importedUsefulInfo = true;
  }

  if (selection.foreshadowing && (analysis.foreshadowing?.length ?? 0) > 0) {
    const imported: ForeshadowingItem[] = analysis.foreshadowing.map((item) => ({
      id: createId(),
      title: item.title,
      setup: item.setup,
      payoff: item.payoff,
      plannedReveal: item.plannedReveal,
      status: mapForeshadowingStatus(item.status),
      notes: ""
    }));
    next = {
      ...next,
      foreshadowing: [...next.foreshadowing, ...imported]
    };
    importedUsefulInfo = true;
  }

  if (selection.chapters && analysis.chapters.length > 0) {
    const baseOrder = selection.replaceChapters
      ? 0
      : next.chapters.reduce((max, chapter) => Math.max(max, chapter.order), 0);
    const imported: Chapter[] = analysis.chapters.map((chapter, index) => ({
      id: createId(),
      order: baseOrder + index + 1,
      title: chapter.title,
      summary: chapter.summary,
      purpose: chapter.purpose,
      outlineNodeIds: [],
      characterIds: [],
      foreshadowingIds: [],
      mandatoryBeats: [],
      forbiddenContent: [],
      notes: "",
      draft: chapter.content ?? ""
    }));
    next = {
      ...next,
      chapters: selection.replaceChapters ? imported : [...next.chapters, ...imported]
    };
    importedUsefulInfo = true;
  }

  if (importedUsefulInfo && !next.onboarding.completed) {
    next = {
      ...next,
      onboarding: {
        ...next.onboarding,
        completed: true
      }
    };
  }

  return next;
}
