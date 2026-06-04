import { useEffect, useState } from "react";

const STORAGE_KEY = "novel-announcement-dismissed-today";
const DATE_KEY = "novel-announcement-dismiss-date";

const ANNOUNCEMENTS = [
  {
    version: "v0.5.0",
    date: "2026-06-02",
    title: "章节分组 & 全文审查 & 性能大优化",
    items: [
      "章节列表支持分组收纳，每 20 章为一组，可折叠/展开，快速定位目标章节",
      "新增全文审查功能：AI 逐章扫描不属于正文的内容（作者备注、AI 残留、大纲混入等），一键修复",
      "进入写作页默认选中最新章节，不再每次回到第一章",
      "AI 生成正文后标题/摘要/目的自动刷新，无需手动刷新页面",
      "前端加载性能大幅提升：跳过首次渲染冗余动画、静态数据单次缓存、减少串行请求",
      "后端加载优化：去掉双重数据序列化、读路径改为只读事务、精简书库 ID 查询",
      "公告弹窗支持「今日不再提醒」，每天零点自动重置",
      "全面增强移动端适配：写作页/表单/按钮/模态框/导航栏响应式优化",
      "删除 Token 用量浮动窗口，减少界面干扰"
    ]
  },
  {
    version: "v0.4.0",
    date: "2026-05-27",
    title: "界面升级 & 动画体验",
    items: [
      "全新青色主题配色，视觉更舒适",
      "伏笔页面改为看板布局，按「计划中/已揭示/已回收」三列管理",
      "角色卡片精简，信息更紧凑，一屏展示更多角色",
      "新增可拖拽浮动 Token 用量窗口（本版本后移除）",
      "卡片阴影增强，交互反馈更立体",
      "AI 生成 prompt 精简，调用速度提升约 40%",
      "大纲已有内容时跳过灵感向导和开书问卷强制流程",
      "修复导航栏双重高光 Bug",
      "添加 anime.js 页面入场动画，切换路由有过渡效果"
    ]
  },
  {
    version: "v0.3.0",
    date: "2026-05-15",
    title: "AI 写作核心能力",
    items: [
      "支持流式生成章节正文，实时显示生成进度",
      "续写模式：在已有正文后追加内容，保持风格一致",
      "严格模式：生成后自动校验大纲锚点、必写节点、禁写内容",
      "自动生成章节标题、摘要和目的",
      "大纲节点可绑定到章节，写作时自动参考上下文",
      "角色和伏笔系统：管理人物关系和伏笔线索"
    ]
  },
  {
    version: "v0.2.0",
    date: "2026-04-20",
    title: "开书流程 & 大纲系统",
    items: [
      "15 问开书问卷，快速建立故事框架",
      "灵感向导：输入一句话创意，AI 自动生成大纲提案",
      "大纲时间线编辑器，支持拖拽排序",
      "书籍信息管理：书名、简介、目标平台、受众频道",
      "支持男频/女频切换，适配不同创作风格",
      "多书管理，一键切换不同作品"
    ]
  },
  {
    version: "v0.1.0",
    date: "2026-03-10",
    title: "项目初始化",
    items: [
      "用户注册/登录系统",
      "基础项目数据模型和持久化",
      "React + TypeScript + Vite 前端架构",
      "Spring Boot + JPA 后端架构",
      "AI 对接 OpenAI 兼容接口"
    ]
  }
];

function isDismissedToday(): boolean {
  const dismissed = localStorage.getItem(STORAGE_KEY);
  const date = localStorage.getItem(DATE_KEY);
  if (!dismissed || !date) return false;
  const today = new Date().toISOString().slice(0, 10);
  return date === today && dismissed === "true";
}

function dismissForToday(): void {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(STORAGE_KEY, "true");
  localStorage.setItem(DATE_KEY, today);
}

export default function AnnouncementModal(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isDismissedToday()) {
      const timer = window.setTimeout(() => setIsOpen(true), 600);
      return () => window.clearTimeout(timer);
    }
  }, []);

  function handleDismiss(skipToday: boolean): void {
    if (skipToday) {
      dismissForToday();
    }
    setIsOpen(false);
  }

  if (!isOpen) {
    return <></>;
  }

  return (
    <AnnouncementContent onDismiss={handleDismiss} />
  );
}

function AnnouncementContent(props: { onDismiss: (skipToday: boolean) => void }): JSX.Element {
  const [skipToday, setSkipToday] = useState(false);

  return (
    <div className="modal-backdrop announcement-backdrop" onClick={() => props.onDismiss(skipToday)}>
      <section
        className="modal-panel announcement-panel"
        role="dialog"
        aria-label="系统公告"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">系统公告</p>
            <h2>更新日志</h2>
          </div>
          <button className="mini-button mini-button--icon" onClick={() => props.onDismiss(skipToday)} type="button">
            x
          </button>
        </div>

        <div className="announcement-list">
          {ANNOUNCEMENTS.map((entry) => (
            <article key={entry.version} className="announcement-item">
              <div className="announcement-item-header">
                <span className="announcement-version">{entry.version}</span>
                <span className="announcement-date">{entry.date}</span>
              </div>
              <h3 className="announcement-item-title">{entry.title}</h3>
              <ul className="announcement-changes">
                {entry.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="announcement-footer">
          <label className="announcement-skip-today">
            <input
              type="checkbox"
              checked={skipToday}
              onChange={(e) => setSkipToday(e.target.checked)}
            />
            <span>今日不再提醒</span>
          </label>
          <button className="primary-button" onClick={() => props.onDismiss(skipToday)} type="button">
            知道了
          </button>
        </div>
      </section>
    </div>
  );
}
