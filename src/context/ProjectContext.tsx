import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  createBook,
  type CreateBookPayload,
  deleteBook,
  fetchLibrary,
  fetchNovelTypes,
  fetchPlatforms,
  fetchProject,
  persistProject,
  switchActiveBook
} from "../api";
import type {
  BookSummary,
  NovelTypeCatalogResponse,
  Project,
  PublishPlatformInfo
} from "../types";
import { formatGenreLabel, type ProjectUpdater } from "../utils/projectHelpers";

interface ProjectContextValue {
  project: Project | null;
  activeBookId: string;
  books: BookSummary[];
  platforms: PublishPlatformInfo[];
  novelTypeCatalog: NovelTypeCatalogResponse | null;
  statusText: string;
  errorText: string;
  isSaving: boolean;
  isSwitchingBook: boolean;
  hasUnsavedChanges: boolean;
  setErrorText: (value: string) => void;
  setStatusText: (value: string) => void;
  applyProjectUpdate: (updater: ProjectUpdater) => void;
  reloadProject: () => Promise<void>;
  reloadLibrary: () => Promise<void>;
  saveProject: (projectOverride?: Project) => Promise<void>;
  switchBook: (bookId: string) => Promise<void>;
  createNewBook: (options: CreateBookPayload) => Promise<boolean>;
  removeBook: (bookId: string) => Promise<void>;
  updateAudienceChannel: (audienceChannel: "male" | "female") => void;
  updateNovelType: (novelType: string) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider(props: { children: ReactNode }): JSX.Element {
  const [project, setProject] = useState<Project | null>(null);
  const [activeBookId, setActiveBookId] = useState("");
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [platforms, setPlatforms] = useState<PublishPlatformInfo[]>([]);
  const [novelTypeCatalog, setNovelTypeCatalog] = useState<NovelTypeCatalogResponse | null>(null);
  const [statusText, setStatusText] = useState("正在加载书库...");
  const [errorText, setErrorText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSwitchingBook, setIsSwitchingBook] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const reloadLibrary = useCallback(async (): Promise<void> => {
    const library = await fetchLibrary();
    setBooks(library.books);
    setActiveBookId(library.activeBookId);
  }, []);

  const libraryLoadedRef = useRef(false);

  const reloadProject = useCallback(async (): Promise<void> => {
    try {
      setErrorText("");
      // 首次加载时获取书库列表，后续刷新直接获取项目
      if (!libraryLoadedRef.current) {
        const library = await fetchLibrary();
        setBooks(library.books);
        setActiveBookId(library.activeBookId);
        libraryLoadedRef.current = true;
        if (library.books.length === 0) {
          setProject(null);
          setHasUnsavedChanges(false);
          setErrorText("");
          setStatusText("欢迎！请在书库创建你的第一本书。");
          return;
        }
        if (!library.activeBookId) {
          setProject(null);
          setHasUnsavedChanges(false);
          setErrorText("");
          setStatusText("请选择或创建一本书。");
          return;
        }
      }
      const envelope = await fetchProject();
      setActiveBookId(envelope.bookId);
      setProject(envelope.project);
      setHasUnsavedChanges(false);
      setStatusText(`已加载：${envelope.project.meta.title || "未命名作品"}`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "项目加载失败");
      setStatusText("加载失败");
    }
  }, []);

  const staticDataLoadedRef = useRef(false);

  useEffect(() => {
    void reloadProject();
    // platforms 和 novelTypes 是静态数据，只需加载一次
    if (!staticDataLoadedRef.current) {
      staticDataLoadedRef.current = true;
      void fetchPlatforms()
        .then(setPlatforms)
        .catch(() => setPlatforms([]));
      void fetchNovelTypes()
        .then(setNovelTypeCatalog)
        .catch(() => setNovelTypeCatalog(null));
    }
  }, [reloadProject]);

  const applyProjectUpdate = useCallback((updater: ProjectUpdater): void => {
    setProject((current) => {
      if (!current) {
        return current;
      }
      return updater(current);
    });
    setHasUnsavedChanges(true);
    setStatusText("有未保存修改");
    setErrorText("");
  }, []);

  const saveProject = useCallback(async (projectOverride?: Project): Promise<void> => {
    const toSave = projectOverride ?? project;
    if (!toSave) {
      return;
    }
    try {
      setIsSaving(true);
      setErrorText("");
      const saved = await persistProject(toSave);
      setActiveBookId(saved.bookId);
      setProject(saved.project);
      setHasUnsavedChanges(false);
      setStatusText(`已保存：${new Date(saved.project.updatedAt).toLocaleString()}`);
      // 更新书库中当前书的摘要信息（轻量操作，不重新加载整个书库）
      setBooks(prev => prev.map(b => b.id === saved.bookId ? {
        ...b,
        title: saved.project.meta.title || b.title,
        updatedAt: saved.project.updatedAt,
        chapterCount: saved.project.chapters.length
      } : b));
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "保存失败");
      setStatusText("保存失败");
    } finally {
      setIsSaving(false);
    }
  }, [project]);

  const switchBook = useCallback(
    async (bookId: string): Promise<void> => {
      if (bookId === activeBookId) {
        return;
      }
      try {
        setIsSwitchingBook(true);
        setErrorText("");
        if (hasUnsavedChanges && project) {
          const saved = await persistProject(project);
          setActiveBookId(saved.bookId);
          setProject(saved.project);
          setHasUnsavedChanges(false);
        }
        const envelope = await switchActiveBook(bookId);
        setActiveBookId(envelope.bookId);
        setProject(envelope.project);
        setHasUnsavedChanges(false);
        setStatusText(`已切换：${envelope.project.meta.title || "未命名作品"}`);
        // 只更新 activeBookId，不重新加载整个书库
        setActiveBookId(envelope.bookId);
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : "切换书籍失败");
      } finally {
        setIsSwitchingBook(false);
      }
    },
    [activeBookId, hasUnsavedChanges, project]
  );

  const createNewBook = useCallback(
    async (options: CreateBookPayload): Promise<boolean> => {
      try {
        setIsSwitchingBook(true);
        setErrorText("");
        if (hasUnsavedChanges && project) {
          await persistProject(project);
          setHasUnsavedChanges(false);
        }
        const envelope = await createBook(options);
        setActiveBookId(envelope.bookId);
        setProject(envelope.project);
        // 把新书加入书库列表
        setBooks(prev => [{
          id: envelope.bookId,
          title: envelope.project.meta.title || "新书",
          genre: envelope.project.meta.genre || "",
          updatedAt: envelope.project.updatedAt,
          chapterCount: envelope.project.chapters.length,
          onboardingCompleted: envelope.project.onboarding?.completed ?? false
        }, ...prev]);
        setStatusText(`已创建：${envelope.project.meta.title || "新书"}`);
        return true;
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : "创建书籍失败");
        return false;
      } finally {
        setIsSwitchingBook(false);
      }
    },
    [hasUnsavedChanges, project]
  );

  const removeBook = useCallback(
    async (bookId: string): Promise<void> => {
      try {
        setIsSwitchingBook(true);
        setErrorText("");
        const library = await deleteBook(bookId);
        setBooks(library.books);
        setActiveBookId(library.activeBookId);
        if (library.books.length === 0 || !library.activeBookId) {
          setProject(null);
          setHasUnsavedChanges(false);
          setStatusText("书籍已删除，书库为空。请创建新书。");
          return;
        }
        const envelope = await fetchProject();
        setProject(envelope.project);
        setActiveBookId(envelope.bookId);
        setHasUnsavedChanges(false);
        setStatusText(`已删除书籍，当前：${envelope.project.meta.title || "未命名"}`);
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : "删除书籍失败");
      } finally {
        setIsSwitchingBook(false);
      }
    },
    []
  );

  const updateAudienceChannel = useCallback(
    (audienceChannel: "male" | "female"): void => {
      if (!project || !novelTypeCatalog) {
        return;
      }
      const typesForAudience = novelTypeCatalog.types.filter((type) => type.audienceChannel === audienceChannel);
      const nextType =
        typesForAudience.find((type) => type.id === project.meta.novelType)?.id ?? typesForAudience[0]?.id ?? "";
      applyProjectUpdate((current) => ({
        ...current,
        meta: {
          ...current.meta,
          audienceChannel,
          novelType: nextType,
          genre: formatGenreLabel(audienceChannel, nextType, novelTypeCatalog.types)
        }
      }));
    },
    [applyProjectUpdate, novelTypeCatalog, project]
  );

  const updateNovelType = useCallback(
    (novelType: string): void => {
      if (!project || !novelTypeCatalog) {
        return;
      }
      applyProjectUpdate((current) => ({
        ...current,
        meta: {
          ...current.meta,
          novelType,
          genre: formatGenreLabel(current.meta.audienceChannel, novelType, novelTypeCatalog.types)
        }
      }));
    },
    [applyProjectUpdate, novelTypeCatalog, project]
  );

  const value = useMemo(
    () => ({
      project,
      activeBookId,
      books,
      platforms,
      novelTypeCatalog,
      statusText,
      errorText,
      isSaving,
      isSwitchingBook,
      hasUnsavedChanges,
      setErrorText,
      setStatusText,
      applyProjectUpdate,
      reloadProject,
      reloadLibrary,
      saveProject,
      switchBook,
      createNewBook,
      removeBook,
      updateAudienceChannel,
      updateNovelType
    }),
    [
      project,
      activeBookId,
      books,
      platforms,
      novelTypeCatalog,
      statusText,
      errorText,
      isSaving,
      isSwitchingBook,
      hasUnsavedChanges,
      applyProjectUpdate,
      reloadProject,
      reloadLibrary,
      saveProject,
      switchBook,
      createNewBook,
      removeBook,
      updateAudienceChannel,
      updateNovelType
    ]
  );

  return <ProjectContext.Provider value={value}>{props.children}</ProjectContext.Provider>;
}

export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within ProjectProvider");
  }
  return context;
}
