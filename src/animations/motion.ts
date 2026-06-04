import { animate, createTimeline, stagger, onScroll, splitText, type JSAnimation, type Timeline } from "animejs";

const EASE_ENTER = "outExpo";
const EASE_MODAL = "outQuint";
const EASE_SPRING = "outBack";

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function toElements(targets: Element | NodeListOf<Element> | Element[] | string): Element[] {
  if (typeof targets === "string") {
    return Array.from(document.querySelectorAll(targets));
  }
  if (targets instanceof Element) {
    return [targets];
  }
  return Array.from(targets);
}

// ═══════════════════════════════════════
// 基础入场动画
// ═══════════════════════════════════════

export function revealStagger(
  targets: Element | NodeListOf<Element> | Element[] | string,
  options?: { delay?: number; staggerMs?: number; duration?: number; offsetY?: number }
): JSAnimation | null {
  if (prefersReducedMotion()) {
    return null;
  }
  const elements = toElements(targets);
  if (elements.length === 0) {
    return null;
  }
  const offsetY = options?.offsetY ?? 8;
  return animate(elements, {
    opacity: { from: 0, to: 1 },
    translateY: { from: offsetY, to: 0 },
    duration: options?.duration ?? 250,
    delay: stagger(options?.staggerMs ?? 24, { start: options?.delay ?? 0 }),
    ease: EASE_ENTER,
    priority: 2
  });
}

export function revealFade(
  targets: Element | NodeListOf<Element> | Element[] | string,
  options?: { delay?: number; duration?: number; offsetY?: number }
): JSAnimation | null {
  if (prefersReducedMotion()) {
    return null;
  }
  const elements = toElements(targets);
  if (elements.length === 0) {
    return null;
  }
  const offsetY = options?.offsetY ?? 6;
  return animate(elements, {
    opacity: { from: 0, to: 1 },
    translateY: { from: offsetY, to: 0 },
    duration: options?.duration ?? 220,
    delay: options?.delay ?? 0,
    ease: EASE_ENTER,
    priority: 0
  });
}

export function revealAppShell(topbar: Element, nav: Element | null): (() => void) | null {
  if (prefersReducedMotion()) {
    return null;
  }
  const topAnim = animate(topbar, {
    opacity: { from: 0, to: 1 },
    translateY: { from: -4, to: 0 },
    duration: 200,
    ease: EASE_ENTER,
    priority: 0
  });
  let navAnim: JSAnimation | null = null;
  if (nav) {
    const links = nav.querySelectorAll(".nav-link");
    if (links.length > 0) {
      navAnim = animate(links, {
        opacity: { from: 0, to: 1 },
        translateX: { from: -6, to: 0 },
        duration: 200,
        delay: stagger(20, { start: 40 }),
        ease: EASE_ENTER,
        priority: 1
      });
    }
  }
  return () => {
    topAnim.cancel();
    navAnim?.cancel();
  };
}

export function revealModal(backdrop: Element, panel: Element): (() => void) | null {
  if (prefersReducedMotion()) {
    return null;
  }
  const tl = createTimeline({ defaults: { ease: EASE_MODAL } });
  tl.add(backdrop, {
    opacity: { from: 0, to: 1 },
    duration: 120
  });
  tl.add(panel, {
    opacity: { from: 0, to: 1 },
    translateY: { from: 12, to: 0 },
    scale: { from: 0.98, to: 1 },
    duration: 200
  }, "-=80");
  return () => {
    tl.cancel();
  };
}

export function revealBanner(target: Element): JSAnimation | null {
  if (prefersReducedMotion()) {
    return null;
  }
  return animate(target, {
    opacity: { from: 0, to: 1 },
    translateY: { from: -6, to: 0 },
    duration: 280,
    ease: EASE_ENTER,
    priority: 3
  });
}

export function shakeElement(target: Element): JSAnimation | null {
  if (prefersReducedMotion()) {
    return null;
  }
  return animate(target, {
    translateX: { from: -6, to: 6 },
    duration: 300,
    ease: "outCubic",
    alternate: true,
    loop: 2,
    priority: 4
  });
}

export function pulseSuccess(target: Element): JSAnimation | null {
  if (prefersReducedMotion()) {
    return null;
  }
  return animate(target, {
    scale: [{ from: 1, to: 1.03 }, { from: 1.03, to: 1 }],
    duration: 400,
    ease: "inOutSine",
    priority: 4
  });
}

// ═══════════════════════════════════════
// 页面入场时间线
// ═══════════════════════════════════════

export function createPageEnterTimeline(
  heading: Element | null,
  cards: Element[] | NodeListOf<Element> | string,
  actions?: Element | null
): Timeline | null {
  if (prefersReducedMotion()) {
    return null;
  }
  const tl = createTimeline({ defaults: { ease: EASE_ENTER } });

  if (heading) {
    tl.add(heading, {
      opacity: { from: 0, to: 1 },
      translateY: { from: -8, to: 0 },
      duration: 300
    });
  }

  const cardElements = typeof cards === "string"
    ? document.querySelectorAll(cards)
    : cards;
  const cardArr = Array.from(cardElements);
  if (cardArr.length > 0) {
    tl.add(cardArr, {
      opacity: { from: 0, to: 1 },
      translateY: { from: 12, to: 0 },
      duration: 360,
      delay: stagger(40)
    }, heading ? "-=160" : 0);
  }

  if (actions) {
    tl.add(actions, {
      opacity: { from: 0, to: 1 },
      duration: 260
    }, "-=120");
  }

  return tl;
}

// ═══════════════════════════════════════
// 大纲时间线动画
// ═══════════════════════════════════════

export function animateTimelineNodes(container: Element): (() => void) | null {
  if (prefersReducedMotion()) {
    return null;
  }
  const items = container.querySelectorAll(".outline-timeline-item");
  if (items.length === 0) {
    return null;
  }
  const tl = createTimeline({ defaults: { ease: EASE_ENTER } });

  items.forEach((item, index) => {
    const dot = item.querySelector(".outline-timeline-dot");
    const card = item.querySelector(".outline-timeline-card");
    const line = item.querySelector(".outline-timeline-line");

    if (dot) {
      tl.add(dot, {
        scale: { from: 0, to: 1 },
        duration: 220
      }, index * 100);
    }
    if (card) {
      tl.add(card, {
        opacity: { from: 0, to: 1 },
        translateX: { from: -12, to: 0 },
        duration: 320
      }, index * 100 + 60);
    }
    if (line && index < items.length - 1) {
      tl.add(line, {
        scaleY: { from: 0, to: 1 },
        duration: 240
      }, index * 100 + 120);
    }
  });

  return () => {
    tl.cancel();
  };
}

// ═══════════════════════════════════════
// 文字拆分动画
// ═══════════════════════════════════════

export function animateTextReveal(
  target: Element | string,
  options?: { duration?: number; staggerMs?: number; delay?: number }
): (() => void) | null {
  if (prefersReducedMotion()) {
    return null;
  }
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) {
    return null;
  }

  try {
    const splitter = splitText(el, {
      words: { class: "anime-word" },
      chars: { class: "anime-char" }
    });

    const chars = el.querySelectorAll(".anime-char");
    if (chars.length === 0) {
      return null;
    }

    const anim = animate(chars, {
      opacity: { from: 0, to: 1 },
      translateY: { from: 6, to: 0 },
      rotateZ: { from: -2, to: 0 },
      duration: options?.duration ?? 300,
      delay: stagger(options?.staggerMs ?? 22, { start: options?.delay ?? 0 }),
      ease: EASE_ENTER
    });

    return () => {
      anim.cancel();
      splitter.revert();
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════
// 滚动驱动动画
// ═══════════════════════════════════════

export function revealOnScroll(
  targets: Element | NodeListOf<Element> | Element[] | string,
  options?: { offsetY?: number; duration?: number }
): (() => void) | null {
  if (prefersReducedMotion()) {
    return null;
  }
  const elements = toElements(targets);
  if (elements.length === 0) {
    return null;
  }

  const offsetY = options?.offsetY ?? 16;
  const duration = options?.duration ?? 420;

  const cleanupFns: (() => void)[] = [];

  elements.forEach((el) => {
    const anim = animate(el, {
      opacity: { from: 0, to: 1 },
      translateY: { from: offsetY, to: 0 },
      duration,
      ease: EASE_ENTER,
      autoplay: false
    });

    const observer = onScroll({
      target: el,
      enter: "80%",
      leave: "0%",
      onEnter: () => {
        anim.play();
      },
      repeat: false
    });

    cleanupFns.push(() => {
      anim.cancel();
      observer.revert();
    });
  });

  return () => {
    cleanupFns.forEach((fn) => fn());
  };
}

// ═══════════════════════════════════════
// 数字递增动画
// ═══════════════════════════════════════

export function animateCountUp(
  target: Element | string,
  endValue: number,
  options?: { duration?: number; decimals?: number }
): JSAnimation | null {
  if (prefersReducedMotion()) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (el) {
      (el as HTMLElement).textContent = String(endValue);
    }
    return null;
  }
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) {
    return null;
  }
  const decimals = options?.decimals ?? 0;
  return animate(el, {
    textContent: [0, endValue],
    round: decimals === 0 ? 1 : Math.pow(10, decimals),
    duration: options?.duration ?? 1000,
    ease: "outExpo"
  });
}

// ═══════════════════════════════════════
// 卡片增强动画
// ═══════════════════════════════════════

export function revealStaggerScale(
  targets: Element | NodeListOf<Element> | Element[] | string,
  options?: { delay?: number; staggerMs?: number; duration?: number }
): JSAnimation | null {
  if (prefersReducedMotion()) {
    return null;
  }
  const elements = toElements(targets);
  if (elements.length === 0) {
    return null;
  }
  return animate(elements, {
    opacity: { from: 0, to: 1 },
    translateY: { from: 10, to: 0 },
    scale: { from: 0.97, to: 1 },
    duration: options?.duration ?? 280,
    delay: stagger(options?.staggerMs ?? 32, { start: options?.delay ?? 0 }),
    ease: EASE_SPRING,
    priority: 2
  });
}

export function revealReportCards(
  targets: Element | NodeListOf<Element> | Element[] | string
): JSAnimation | null {
  if (prefersReducedMotion()) {
    return null;
  }
  const elements = toElements(targets);
  if (elements.length === 0) {
    return null;
  }
  return animate(elements, {
    opacity: { from: 0, to: 1 },
    scale: { from: 0.9, to: 1 },
    duration: 360,
    delay: stagger(60),
    ease: EASE_SPRING
  });
}

// ═══════════════════════════════════════
// 步骤切换动画
// ═══════════════════════════════════════

export function slideTransition(
  exitTarget: Element | null,
  enterTarget: Element | null,
  options?: { duration?: number }
): (() => void) | null {
  if (prefersReducedMotion()) {
    return null;
  }
  const cleanupFns: (() => void)[] = [];

  if (exitTarget) {
    const exitAnim = animate(exitTarget, {
      opacity: { from: 1, to: 0 },
      translateX: { from: 0, to: -20 },
      duration: options?.duration ?? 220,
      ease: "inCubic"
    });
    cleanupFns.push(() => exitAnim.cancel());
  }

  if (enterTarget) {
    const enterAnim = animate(enterTarget, {
      opacity: { from: 0, to: 1 },
      translateX: { from: 20, to: 0 },
      duration: options?.duration ?? 320,
      ease: EASE_ENTER
    });
    cleanupFns.push(() => enterAnim.cancel());
  }

  return () => {
    cleanupFns.forEach((fn) => fn());
  };
}

// ═══════════════════════════════════════
// 进度条动画
// ═══════════════════════════════════════

export function animateProgressBar(
  target: Element | string,
  progress: number,
  options?: { duration?: number }
): JSAnimation | null {
  if (prefersReducedMotion()) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (el) {
      (el as HTMLElement).style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }
    return null;
  }
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) {
    return null;
  }
  return animate(el, {
    width: `${Math.min(100, Math.max(0, progress))}%`,
    duration: options?.duration ?? 500,
    ease: EASE_ENTER
  });
}

// ═══════════════════════════════════════
// 呼吸动画
// ═══════════════════════════════════════

export function breathePulse(target: Element | string): JSAnimation | null {
  if (prefersReducedMotion()) {
    return null;
  }
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) {
    return null;
  }
  return animate(el, {
    scale: [{ from: 1, to: 1.04 }, { from: 1.04, to: 1 }],
    opacity: [{ from: 0.75, to: 1 }, { from: 1, to: 0.75 }],
    duration: 2000,
    ease: "inOutSine",
    loop: true
  });
}

// ═══════════════════════════════════════
// 横幅自动消失
// ═══════════════════════════════════════

export function bannerAutoDismiss(
  target: Element,
  options?: { holdMs?: number; duration?: number }
): (() => void) | null {
  if (prefersReducedMotion()) {
    return null;
  }
  const holdMs = options?.holdMs ?? 5000;
  const duration = options?.duration ?? 260;

  const tl = createTimeline();
  tl.add(target, {
    opacity: { from: 0, to: 1 },
    translateY: { from: -8, to: 0 },
    duration,
    ease: EASE_ENTER
  });
  tl.add(target, {
    opacity: { from: 1, to: 0 },
    translateY: { from: 0, to: -6 },
    duration: 220,
    ease: "inCubic"
  }, `+=${holdMs}`);

  return () => {
    tl.cancel();
  };
}

// ═══════════════════════════════════════
// 交互反馈动画
// ═══════════════════════════════════════

export function highlightChapterRow(target: Element): JSAnimation | null {
  if (prefersReducedMotion()) {
    return null;
  }
  return animate(target, {
    scale: [{ from: 1, to: 1.008 }, { from: 1.008, to: 1 }],
    duration: 240,
    ease: EASE_ENTER
  });
}

export function selectProposalCard(target: Element): JSAnimation | null {
  if (prefersReducedMotion()) {
    return null;
  }
  return animate(target, {
    scale: [{ from: 1, to: 1.015 }, { from: 1.015, to: 1 }],
    duration: 320,
    ease: EASE_SPRING
  });
}

// ═══════════════════════════════════════
// 布局动画
// ═══════════════════════════════════════

export function animateGridLayout(
  container: Element | string,
  options?: { duration?: number; staggerMs?: number }
): (() => void) | null {
  if (prefersReducedMotion()) {
    return null;
  }
  const el = typeof container === "string" ? document.querySelector(container) : container;
  if (!el) {
    return null;
  }
  const children = Array.from(el.children);
  if (children.length === 0) {
    return null;
  }
  const anim = animate(children, {
    opacity: { from: 0.7, to: 1 },
    scale: { from: 0.97, to: 1 },
    duration: options?.duration ?? 300,
    delay: stagger(options?.staggerMs ?? 25),
    ease: EASE_ENTER
  });
  return () => {
    anim.cancel();
  };
}

export function animateStaggerLayout(
  container: Element | string,
  itemSelector: string,
  options?: { duration?: number; staggerMs?: number; offsetY?: number }
): (() => void) | null {
  if (prefersReducedMotion()) {
    return null;
  }
  const el = typeof container === "string" ? document.querySelector(container) : container;
  if (!el) {
    return null;
  }
  const items = el.querySelectorAll(itemSelector);
  if (items.length === 0) {
    return null;
  }
  const offsetY = options?.offsetY ?? 12;
  const anim = animate(items, {
    opacity: { from: 0, to: 1 },
    translateY: { from: offsetY, to: 0 },
    duration: options?.duration ?? 380,
    delay: stagger(options?.staggerMs ?? 40),
    ease: EASE_SPRING
  });
  return () => {
    anim.cancel();
  };
}

export function animateSectionDivider(target: Element | string): JSAnimation | null {
  if (prefersReducedMotion()) {
    return null;
  }
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) {
    return null;
  }
  return animate(el, {
    scaleX: { from: 0, to: 1 },
    opacity: { from: 0, to: 1 },
    duration: 400,
    ease: EASE_ENTER
  });
}

// ═══════════════════════════════════════
// 新增：卡片悬浮反馈
// ═══════════════════════════════════════

export function cardHoverFeedback(target: Element, entering: boolean): JSAnimation | null {
  if (prefersReducedMotion()) {
    return null;
  }
  return animate(target, {
    translateY: entering ? -2 : 0,
    duration: 180,
    ease: EASE_ENTER
  });
}

// ═══════════════════════════════════════
// 新增：按钮点击波纹
// ═══════════════════════════════════════

export function buttonPress(target: Element): JSAnimation | null {
  if (prefersReducedMotion()) {
    return null;
  }
  return animate(target, {
    scale: [{ from: 1, to: 0.97 }, { from: 0.97, to: 1 }],
    duration: 200,
    ease: EASE_ENTER
  });
}

// ═══════════════════════════════════════
// 新增：展开/折叠动画
// ═══════════════════════════════════════

export function expandReveal(target: Element): JSAnimation | null {
  if (prefersReducedMotion()) {
    return null;
  }
  return animate(target, {
    opacity: { from: 0, to: 1 },
    height: { from: "0px", to: "auto" },
    duration: 280,
    ease: EASE_ENTER
  });
}

export function collapseHide(target: Element): JSAnimation | null {
  if (prefersReducedMotion()) {
    return null;
  }
  return animate(target, {
    opacity: { from: 1, to: 0 },
    height: { from: "auto", to: "0px" },
    duration: 200,
    ease: "inCubic"
  });
}

// ═══════════════════════════════════════
// 新增：列表项移除动画
// ═══════════════════════════════════════

export function removeItemAnimate(target: Element): JSAnimation | null {
  if (prefersReducedMotion()) {
    return null;
  }
  return animate(target, {
    opacity: { from: 1, to: 0 },
    translateX: { from: 0, to: -16 },
    scale: { from: 1, to: 0.95 },
    duration: 200,
    ease: "inCubic"
  });
}

// ═══════════════════════════════════════
// 新增：状态变更高亮
// ═══════════════════════════════════════

export function statusChangeFlash(target: Element): JSAnimation | null {
  if (prefersReducedMotion()) {
    return null;
  }
  return animate(target, {
    backgroundColor: [
      { value: "rgba(75, 85, 99, 0.08)", duration: 150 },
      { value: "rgba(75, 85, 99, 0)", duration: 400 }
    ],
    ease: "inOutSine"
  });
}
