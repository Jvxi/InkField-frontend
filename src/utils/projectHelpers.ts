import type { Chapter, Character, ForeshadowingItem, OutlineNode, Project } from "../types";

export function createId(): string {
  // 优先使用 crypto.randomUUID()，如果不可用则使用兼容方案
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // 兼容方案：生成符合UUID v4格式的随机ID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function parseLines(value: string): string[] {
  return value
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function formatLines(value: string[]): string {
  return value.join("\n");
}

export function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.order - right.order);
}

export function moveOrderedItem<T extends { id: string; order: number }>(
  items: T[],
  id: string,
  direction: -1 | 1
): T[] {
  const sorted = sortByOrder(items);
  const index = sorted.findIndex((item) => item.id === id);
  if (index < 0) {
    return items;
  }
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= sorted.length) {
    return items;
  }
  const current = sorted[index];
  const target = sorted[targetIndex];
  return items.map((item) => {
    if (item.id === current.id) {
      return { ...item, order: target.order };
    }
    if (item.id === target.id) {
      return { ...item, order: current.order };
    }
    return item;
  });
}

export function createOutlineNode(nextOrder: number): OutlineNode {
  return {
    id: createId(),
    order: nextOrder,
    title: "新大纲节点",
    summary: "",
    objective: "",
    keyConflict: "",
    mustKeep: [],
    forbidden: []
  };
}

export function createCharacter(): Character {
  return {
    id: createId(),
    name: "",
    role: "",
    profile: "",
    motivation: "",
    constraint: "",
    relationships: ""
  };
}

export function createForeshadowing(): ForeshadowingItem {
  return {
    id: createId(),
    title: "新伏笔",
    setup: "",
    payoff: "",
    plannedReveal: "",
    status: "planned",
    notes: ""
  };
}

export function createChapter(nextOrder: number): Chapter {
  return {
    id: createId(),
    order: nextOrder,
    title: `第 ${nextOrder} 章`,
    summary: "",
    purpose: "",
    outlineNodeIds: [],
    characterIds: [],
    foreshadowingIds: [],
    mandatoryBeats: [],
    forbiddenContent: [],
    notes: "",
    draft: ""
  };
}

export function toggleSelection(selectedIds: string[], itemId: string): string[] {
  return selectedIds.includes(itemId)
    ? selectedIds.filter((entry) => entry !== itemId)
    : [...selectedIds, itemId];
}

export function formatGenreLabel(
  audienceChannel: string,
  novelTypeId: string,
  types: { id: string; label: string }[]
): string {
  const audienceLabel = audienceChannel === "female" ? "女频" : "男频";
  const typeLabel = types.find((type) => type.id === novelTypeId)?.label ?? novelTypeId;
  return `${audienceLabel} · ${typeLabel}`;
}

export type ProjectUpdater = (project: Project) => Project;
