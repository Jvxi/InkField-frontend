import type { ProjectImportAnalysis } from "../types";

export function emptyImportAnalysis(): ProjectImportAnalysis {
  return {
    title: "",
    synopsis: "",
    premise: "",
    tone: "",
    targetLength: "",
    styleRules: [],
    worldRules: [],
    outlineNodes: [],
    chapters: [],
    characters: [],
    foreshadowing: []
  };
}

function pickText(base: string, patch: string): string {
  const next = patch.trim();
  return next || base;
}

export function mergeProjectImport(
  base: ProjectImportAnalysis | null,
  patch: ProjectImportAnalysis
): ProjectImportAnalysis {
  const current = base ?? emptyImportAnalysis();
  return {
    title: pickText(current.title, patch.title),
    synopsis: pickText(current.synopsis, patch.synopsis),
    premise: pickText(current.premise, patch.premise),
    tone: pickText(current.tone, patch.tone),
    targetLength: pickText(current.targetLength, patch.targetLength),
    styleRules: patch.styleRules.length > 0 ? patch.styleRules : current.styleRules,
    worldRules: patch.worldRules.length > 0 ? patch.worldRules : current.worldRules,
    outlineNodes: patch.outlineNodes.length > 0 ? patch.outlineNodes : current.outlineNodes,
    chapters: patch.chapters.length > 0 ? patch.chapters : current.chapters,
    characters: patch.characters.length > 0 ? patch.characters : current.characters,
    foreshadowing:
      (patch.foreshadowing?.length ?? 0) > 0 ? (patch.foreshadowing ?? []) : current.foreshadowing
  };
}
