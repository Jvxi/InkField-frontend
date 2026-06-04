import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

import { revealFade, revealStagger } from "../animations/motion";

/** 路由切换时主内容区入场（跳过首次渲染） */
export default function PageTransition(props: { children: React.ReactNode }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
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

    const panel =
      root.querySelector<HTMLElement>(".panel, .page-panel") ??
      (root.firstElementChild as HTMLElement | null) ??
      root;

    const heading = panel.querySelector(".section-heading, h2, h3");
    const cards = panel.querySelectorAll(
      ".book-library-card, .character-card, .panel-inset, .question-card, .outline-timeline-item"
    );

    const panelAnim = revealFade(panel, { offsetY: 14, duration: 460, delay: 0 });
    const headingAnim = heading
      ? revealFade(heading, { offsetY: 8, duration: 380, delay: 60 })
      : null;
    const cardsAnim =
      cards.length > 0 ? revealStagger(cards, { staggerMs: 38, duration: 440, delay: 100 }) : null;

    return () => {
      panelAnim?.cancel();
      headingAnim?.cancel();
      cardsAnim?.cancel();
    };
  }, [location.pathname]);

  return (
    <div ref={ref} className="page-transition-root">
      {props.children}
    </div>
  );
}
