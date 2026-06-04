import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useProject } from "../context/ProjectContext";
import { formatLines, sortByOrder } from "../utils/projectHelpers";

export default function ChapterDetailPage(): JSX.Element {
  const { project } = useProject();
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();

  const sortedOutline = useMemo(
    () => sortByOrder(project?.outlineNodes ?? []),
    [project?.outlineNodes]
  );

  if (!project || !chapterId) {
    return (
      <section className="panel page-panel">
        <p>章节不存在</p>
        <Link to="/book">返回书籍信息</Link>
      </section>
    );
  }

  const chapter = project.chapters.find((entry) => entry.id === chapterId);
  if (!chapter) {
    return (
      <section className="panel page-panel">
        <p>未找到该章节</p>
        <Link to="/book">返回书籍信息</Link>
      </section>
    );
  }

  const boundOutline = sortedOutline.filter((node) => chapter.outlineNodeIds.includes(node.id));
  const boundCharacters = project.characters.filter((c) => chapter.characterIds.includes(c.id));
  const boundForeshadowing = project.foreshadowing.filter((f) => chapter.foreshadowingIds.includes(f.id));

  return (
    <div className="chapter-detail">
      <section className="panel page-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">第 {chapter.order} 章</p>
            <h2>{chapter.title || "未命名章节"}</h2>
          </div>
          <div className="toolbar">
            <Link className="secondary-button" to="/book">
              返回总览
            </Link>
            <button
              className="primary-button"
              onClick={() => navigate(`/write?chapter=${chapter.id}`)}
              type="button"
            >
              编辑章节
            </button>
          </div>
        </div>

        {chapter.summary ? (
          <div className="overview-block">
            <h3>章节摘要</h3>
            <p className="overview-text">{chapter.summary}</p>
          </div>
        ) : null}

        {chapter.purpose ? (
          <div className="overview-block">
            <h3>章节目的</h3>
            <p className="overview-text">{chapter.purpose}</p>
          </div>
        ) : null}

        {chapter.mandatoryBeats.length > 0 ? (
          <div className="overview-block">
            <h3>必须发生</h3>
            <ul className="overview-list">
              {chapter.mandatoryBeats.map((beat) => (
                <li key={beat}>{beat}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {chapter.forbiddenContent.length > 0 ? (
          <div className="overview-block">
            <h3>禁止内容</h3>
            <ul className="overview-list">
              {chapter.forbiddenContent.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {chapter.notes ? (
          <div className="overview-block">
            <h3>备注</h3>
            <p className="overview-text">{chapter.notes}</p>
          </div>
        ) : null}

        <div className="chapter-detail-bindings">
          {boundOutline.length > 0 ? (
            <div>
              <span className="outline-field-label">绑定大纲</span>
              <div className="chip-row">
                {boundOutline.map((node) => (
                  <span key={node.id} className="tag">
                    {node.title}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {boundCharacters.length > 0 ? (
            <div>
              <span className="outline-field-label">出场角色</span>
              <div className="chip-row">
                {boundCharacters.map((c) => (
                  <span key={c.id} className="tag">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {boundForeshadowing.length > 0 ? (
            <div>
              <span className="outline-field-label">相关伏笔</span>
              <div className="chip-row">
                {boundForeshadowing.map((f) => (
                  <span key={f.id} className="tag">
                    {f.title}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel page-panel">
        <div className="section-heading">
          <h2>正文</h2>
          <button
            className="secondary-button"
            onClick={() => navigate(`/write?chapter=${chapter.id}`)}
            type="button"
          >
            编辑正文
          </button>
        </div>
        {chapter.draft.trim() ? (
          <div className="chapter-draft-preview">{chapter.draft}</div>
        ) : (
          <div className="empty-state">
            <p>本章尚未撰写正文</p>
            <button
              className="primary-button"
              onClick={() => navigate(`/write?chapter=${chapter.id}`)}
              type="button"
            >
              去写作
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
