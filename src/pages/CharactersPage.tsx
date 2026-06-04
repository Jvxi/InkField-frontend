import { useState } from "react";

import {
  CHARACTER_ROLE_OPTIONS,
  isCharacterEmpty,
  isKnownCharacterRole
} from "../constants/characterRoles";
import { Field } from "../components/Field";
import { useProject } from "../context/ProjectContext";
import type { Character } from "../types";
import { usePageTimeline, useStaggerScaleReveal } from "../hooks/useAnimeReveal";
import { createCharacter } from "../utils/projectHelpers";

export default function CharactersPage(): JSX.Element {
  const { project, applyProjectUpdate } = useProject();
  const [editingId, setEditingId] = useState<string | null>(null);

  const pageRef = usePageTimeline<HTMLDivElement>(".section-heading", ".character-card", undefined, [project?.characters.length]);

  if (!project) {
    return <></>;
  }

  const activeProject = project;
  const editingCharacter = editingId ? activeProject.characters.find((c) => c.id === editingId) ?? null : null;

  function purgeEmptyCharacters(characters: Character[]): Character[] {
    return characters.filter((entry) => !isCharacterEmpty(entry));
  }

  function finishEditing(characterId: string | null): void {
    if (characterId) {
      applyProjectUpdate((current) => ({
        ...current,
        characters: purgeEmptyCharacters(current.characters)
      }));
    }
    setEditingId(null);
  }

  function startNewCharacter(): void {
    const existingDraft = activeProject.characters.find((entry) => isCharacterEmpty(entry));
    if (existingDraft) {
      setEditingId(existingDraft.id);
      return;
    }
    const character = createCharacter();
    applyProjectUpdate((current) => ({
      ...current,
      characters: [...current.characters, character]
    }));
    setEditingId(character.id);
  }

  function roleSelectOptions(currentRole: string): JSX.Element[] {
    const options = CHARACTER_ROLE_OPTIONS.map((role) => (
      <option key={role} value={role}>
        {role}
      </option>
    ));
    if (currentRole && !isKnownCharacterRole(currentRole)) {
      options.push(
        <option key={`custom-${currentRole}`} value={currentRole}>
          {currentRole}（原自定义）
        </option>
      );
    }
    return options;
  }

  return (
    <section ref={pageRef} className="panel page-panel characters-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">人物设定</p>
          <h2>角色库</h2>
        </div>
        <button className="secondary-button" onClick={startNewCharacter} type="button">
          新增角色
        </button>
      </div>

      {activeProject.characters.length === 0 ? (
        <div className="empty-state">
          <p>还没有角色，点击「新增角色」开始设定</p>
        </div>
      ) : (
        <div className={`characters-layout ${editingCharacter ? "characters-layout--editing" : ""}`}>
          {/* 左侧：角色卡片网格 */}
          <div className="character-card-grid">
            {activeProject.characters.map((character) => {
              const isEditing = editingId === character.id;
              const personality = character.profile.trim() || "（未填写性格）";
              const conduct = character.motivation.trim() || "（未填写行事作风）";

              return (
                <article
                  key={character.id}
                  className={`character-card ${isEditing ? "is-editing" : ""}`}
                  onClick={() => { if (!isEditing) setEditingId(character.id); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") setEditingId(character.id); }}
                >
                  <header className="character-card-header">
                    <div className="character-card-title-block">
                      <h3>{character.name || "未命名角色"}</h3>
                      {character.role ? <span className="character-role-badge">{character.role}</span> : null}
                    </div>
                    <div className="card-header-actions">
                      <button
                        className="toolbar-text-button danger-text"
                        onClick={(e) => {
                          e.stopPropagation();
                          applyProjectUpdate((current) => ({
                            ...current,
                            characters: current.characters.filter((entry) => entry.id !== character.id),
                            chapters: current.chapters.map((chapter) => ({
                              ...chapter,
                              characterIds: chapter.characterIds.filter((entry) => entry !== character.id)
                            }))
                          }));
                          if (editingId === character.id) {
                            setEditingId(null);
                          }
                        }}
                        type="button"
                      >
                        删除
                      </button>
                    </div>
                  </header>

                  <div className="character-card-body">
                    <div className="character-traits-grid">
                      <div className="character-trait">
                        <span className="character-trait-label">性格</span>
                        <p>{personality}</p>
                      </div>
                      <div className="character-trait">
                        <span className="character-trait-label">行事作风</span>
                        <p>{conduct}</p>
                      </div>
                    </div>
                    {character.constraint.trim() || character.relationships.trim() ? (
                      <div className="character-traits-grid">
                        {character.constraint.trim() ? (
                          <div className="character-trait">
                            <span className="character-trait-label">底线</span>
                            <p>{character.constraint}</p>
                          </div>
                        ) : null}
                        {character.relationships.trim() ? (
                          <div className="character-trait">
                            <span className="character-trait-label">关系</span>
                            <p>{character.relationships}</p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          {/* 右侧：编辑面板 */}
          {editingCharacter ? (
            <div className="character-edit-panel panel-inset">
              <div className="section-heading">
                <h3>{editingCharacter.name || "未命名角色"}</h3>
                <button
                  className="toolbar-text-button"
                  onClick={() => finishEditing(editingCharacter.id)}
                  type="button"
                >
                  完成
                </button>
              </div>
              <div className="form-grid">
                <Field label="姓名">
                  <input
                    placeholder="输入角色姓名"
                    value={editingCharacter.name}
                    onChange={(event) =>
                      applyProjectUpdate((current) => ({
                        ...current,
                        characters: current.characters.map((entry) =>
                          entry.id === editingCharacter.id ? { ...entry, name: event.target.value } : entry
                        )
                      }))
                    }
                  />
                </Field>
                <Field label="角色定位">
                  <select
                    value={editingCharacter.role || ""}
                    onChange={(event) =>
                      applyProjectUpdate((current) => ({
                        ...current,
                        characters: current.characters.map((entry) =>
                          entry.id === editingCharacter.id ? { ...entry, role: event.target.value } : entry
                        )
                      }))
                    }
                  >
                    <option value="">请选择定位</option>
                    {roleSelectOptions(editingCharacter.role)}
                  </select>
                </Field>
                <Field className="span-2" label="性格">
                  <textarea
                    rows={3}
                    placeholder="例如：外冷内热，嘴硬心软，遇事先观察再出手"
                    value={editingCharacter.profile}
                    onChange={(event) =>
                      applyProjectUpdate((current) => ({
                        ...current,
                        characters: current.characters.map((entry) =>
                          entry.id === editingCharacter.id ? { ...entry, profile: event.target.value } : entry
                        )
                      }))
                    }
                  />
                </Field>
                <Field className="span-2" label="行事作风">
                  <textarea
                    rows={3}
                    placeholder="例如：能动手少废话，对盟友护短，对敌人不留隔夜仇"
                    value={editingCharacter.motivation}
                    onChange={(event) =>
                      applyProjectUpdate((current) => ({
                        ...current,
                        characters: current.characters.map((entry) =>
                          entry.id === editingCharacter.id ? { ...entry, motivation: event.target.value } : entry
                        )
                      }))
                    }
                  />
                </Field>
                <Field label="底线与限制">
                  <textarea
                    rows={2}
                    value={editingCharacter.constraint}
                    onChange={(event) =>
                      applyProjectUpdate((current) => ({
                        ...current,
                        characters: current.characters.map((entry) =>
                          entry.id === editingCharacter.id ? { ...entry, constraint: event.target.value } : entry
                        )
                      }))
                    }
                  />
                </Field>
                <Field label="人物关系">
                  <textarea
                    rows={2}
                    value={editingCharacter.relationships}
                    onChange={(event) =>
                      applyProjectUpdate((current) => ({
                        ...current,
                        characters: current.characters.map((entry) =>
                          entry.id === editingCharacter.id
                            ? { ...entry, relationships: event.target.value }
                            : entry
                        )
                      }))
                    }
                  />
                </Field>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
