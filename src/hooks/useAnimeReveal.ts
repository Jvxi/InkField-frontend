import { useEffect, useRef, useState, type RefObject } from "react";

import {
  animateGridLayout,
  animateStaggerLayout,
  animateTimelineNodes,
  animateTextReveal,
  breathePulse,
  createPageEnterTimeline,
  revealAppShell,
  revealFade,
  revealModal,
  revealOnScroll,
  revealReportCards,
  revealStagger,
  revealStaggerScale,
  slideTransition,
  cardHoverFeedback,
  buttonPress
} from "../animations/motion";

/** 容器内子元素错落入场（跳过首次渲染） */
export function useStaggerReveal<T extends HTMLElement>(
  itemSelector: string,
  deps: unknown[] = []
): RefObject<T> {
  const ref = useRef<T>(null);
  const isFirst = useRef(true);

  useEffect(() => {
    const root = ref.current;
    if (!root) {
      return;
    }
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const items = root.querySelectorAll(itemSelector);
    const animation = revealStagger(items);
    return () => {
      animation?.cancel();
    };
  }, deps);

  return ref;
}

/** 单块内容淡入上移（跳过首次渲染） */
export function useFadeReveal<T extends HTMLElement>(deps: unknown[] = []): RefObject<T> {
  const ref = useRef<T>(null);
  const isFirst = useRef(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const animation = revealFade(element, { offsetY: 10, duration: 380 });
    return () => {
      animation?.cancel();
    };
  }, deps);

  return ref;
}

/** 主壳层：顶栏 + 侧栏导航 */
export function useAppShellEnter(active: boolean): {
  shellRef: RefObject<HTMLDivElement>;
  navRef: RefObject<HTMLElement>;
} {
  const shellRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!active || !shellRef.current) {
      return;
    }
    const topbar = shellRef.current.querySelector(".topbar");
    if (!topbar) {
      return;
    }
    const cleanup = revealAppShell(topbar, navRef.current);
    return () => {
      cleanup?.();
    };
  }, [active]);

  return { shellRef, navRef };
}

/** 弹窗：背景 + 面板 */
export function useModalReveal(
  isOpen: boolean,
  backdropRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>
): void {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    if (!backdrop || !panel) {
      return;
    }
    const cleanup = revealModal(backdrop, panel);
    return () => {
      cleanup?.();
    };
  }, [isOpen, backdropRef, panelRef]);
}

/**
 * 页面入场时间线动画 hook（跳过首次渲染）
 */
export function usePageTimeline<T extends HTMLElement>(
  headingSelector: string,
  cardSelector: string,
  actionsSelector?: string,
  deps: unknown[] = []
): RefObject<T> {
  const ref = useRef<T>(null);
  const isFirst = useRef(true);

  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const heading = container.querySelector(headingSelector);
    const cards = container.querySelectorAll(cardSelector);
    const actions = actionsSelector ? container.querySelector(actionsSelector) : null;

    const tl = createPageEnterTimeline(heading, cards, actions);
    return () => {
      tl?.cancel();
    };
  }, deps);

  return ref;
}

/**
 * 卡片 stagger + scale 入场（跳过首次渲染）
 */
export function useStaggerScaleReveal<T extends HTMLElement>(
  itemSelector: string,
  deps: unknown[] = []
): RefObject<T> {
  const ref = useRef<T>(null);
  const isFirst = useRef(true);

  useEffect(() => {
    const root = ref.current;
    if (!root) {
      return;
    }
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const items = root.querySelectorAll(itemSelector);
    const animation = revealStaggerScale(items);
    return () => {
      animation?.cancel();
    };
  }, deps);

  return ref;
}

/**
 * 合规报告卡片 scale 入场（跳过首次渲染）
 */
export function useReportReveal<T extends HTMLElement>(
  itemSelector: string,
  deps: unknown[] = []
): RefObject<T> {
  const ref = useRef<T>(null);
  const isFirst = useRef(true);

  useEffect(() => {
    const root = ref.current;
    if (!root) {
      return;
    }
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const items = root.querySelectorAll(itemSelector);
    const animation = revealReportCards(items);
    return () => {
      animation?.cancel();
    };
  }, deps);

  return ref;
}

/**
 * 滚动驱动的入场动画 hook
 */
export function useScrollReveal<T extends HTMLElement>(
  itemSelector: string,
  deps: unknown[] = []
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) {
      return;
    }
    const items = root.querySelectorAll(itemSelector);
    const cleanup = revealOnScroll(items);
    return () => {
      cleanup?.();
    };
  }, deps);

  return ref;
}

/**
 * 标题文字拆分动画 hook（跳过首次渲染）
 */
export function useTextReveal<T extends HTMLElement>(
  selector: string,
  deps: unknown[] = []
): RefObject<T> {
  const ref = useRef<T>(null);
  const isFirst = useRef(true);

  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const el = container.querySelector(selector);
    if (!el) {
      return;
    }
    const cleanup = animateTextReveal(el);
    return () => {
      cleanup?.();
    };
  }, deps);

  return ref;
}

/**
 * 大纲时间线逐项展开动画 hook
 */
export function useTimelineNodes<T extends HTMLElement>(
  deps: unknown[] = []
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }
    const cleanup = animateTimelineNodes(container);
    return () => {
      cleanup?.();
    };
  }, deps);

  return ref;
}

/**
 * 步骤切换动画 hook
 */
export function useStepTransition<T extends HTMLElement>(
  step: string | number,
  deps: unknown[] = []
): RefObject<T> {
  const ref = useRef<T>(null);
  const prevStep = useRef(step);

  useEffect(() => {
    const container = ref.current;
    if (!container || prevStep.current === step) {
      prevStep.current = step;
      return;
    }
    prevStep.current = step;

    const cleanup = slideTransition(null, container);
    return () => {
      cleanup?.();
    };
  }, [step, ...deps]);

  return ref;
}

/**
 * 空状态品牌标识呼吸动画 hook
 */
export function useBreathePulse<T extends HTMLElement>(
  deps: unknown[] = []
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const animation = breathePulse(el);
    return () => {
      animation?.cancel();
    };
  }, deps);

  return ref;
}

/**
 * 数字递增动画 hook
 */
export function useCountUp(
  endValue: number,
  deps: unknown[] = []
): { ref: RefObject<HTMLSpanElement>; displayValue: number } {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (endValue === 0) {
      setDisplayValue(0);
      return;
    }
    const startTime = performance.now();
    const duration = 1000;
    let animFrame: number;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.round(eased * endValue));
      if (progress < 1) {
        animFrame = requestAnimationFrame(tick);
      }
    }

    animFrame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [endValue, ...deps]);

  return { ref, displayValue };
}

/**
 * 网格布局动画 hook
 */
export function useGridLayout<T extends HTMLElement>(
  itemSelector: string,
  deps: unknown[] = []
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }
    const cleanup = animateGridLayout(container);
    return () => {
      cleanup?.();
    };
  }, deps);

  return ref;
}

/**
 * 子元素交错布局动画 hook
 */
export function useStaggerLayout<T extends HTMLElement>(
  itemSelector: string,
  deps: unknown[] = []
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }
    const cleanup = animateStaggerLayout(container, itemSelector);
    return () => {
      cleanup?.();
    };
  }, deps);

  return ref;
}

/**
 * 卡片悬浮反馈 hook
 */
export function useCardHover<T extends HTMLElement>(): {
  ref: RefObject<T>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
} {
  const ref = useRef<T>(null);

  function onMouseEnter() {
    if (ref.current) {
      cardHoverFeedback(ref.current, true);
    }
  }

  function onMouseLeave() {
    if (ref.current) {
      cardHoverFeedback(ref.current, false);
    }
  }

  return { ref, onMouseEnter, onMouseLeave };
}

/**
 * 按钮点击反馈 hook
 */
export function useButtonPress<T extends HTMLElement>(): {
  ref: RefObject<T>;
  onClick: (e: React.MouseEvent) => void;
} {
  const ref = useRef<T>(null);

  function onClick(e: React.MouseEvent) {
    if (ref.current) {
      buttonPress(ref.current);
    }
  }

  return { ref, onClick };
}
