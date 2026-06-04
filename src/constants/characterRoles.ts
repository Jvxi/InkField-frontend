import type { Character } from "../types";

/** 网文常用角色定位模板（存库为中文标签） */
export const CHARACTER_ROLE_OPTIONS = [  "主角",
  "男主",
  "女主",
  "反派",
  "配角",
  "导师",
  "感情线",
  "群像",
  "其他"
] as const;

export type CharacterRoleOption = (typeof CHARACTER_ROLE_OPTIONS)[number];

export function isKnownCharacterRole(role: string): role is CharacterRoleOption {
  return (CHARACTER_ROLE_OPTIONS as readonly string[]).includes(role);
}

/** 除角色定位外，至少有一项实质内容才视为有效角色 */
export function isCharacterEmpty(character: Character): boolean {
  if (character.name.trim().length > 0) {
    return false;
  }
  if (character.profile.trim().length > 0) {
    return false;
  }
  if (character.motivation.trim().length > 0) {
    return false;
  }
  if (character.constraint.trim().length > 0) {
    return false;
  }
  if (character.relationships.trim().length > 0) {
    return false;
  }
  return true;
}

export function normalizeCharacterRole(role: string): string {
  const trimmed = role.trim();
  if (!trimmed) {
    return "";
  }
  if (isKnownCharacterRole(trimmed)) {
    return trimmed;
  }
  const aliases: Record<string, CharacterRoleOption> = {
    主人公: "主角",
    女主角: "女主",
    男主角: "男主",
    大反派: "反派",
    反派boss: "反派",
    配角团: "配角",
    师父: "导师",
    恋人: "感情线",
    CP: "感情线"
  };
  return aliases[trimmed] ?? trimmed;
}
