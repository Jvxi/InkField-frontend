import { useNavigate } from "react-router-dom";

import BrandMark from "../components/BrandMark";
import CreateBookForm, { type CreateBookOptions } from "../components/CreateBookForm";
import { useProject } from "../context/ProjectContext";
import { useBreathePulse, usePageTimeline } from "../hooks/useAnimeReveal";

export default function BooksPage(): JSX.Element {
  const { books, activeBookId, isSwitchingBook, switchBook, createNewBook, removeBook, errorText } = useProject();
  const navigate = useNavigate();
  const pageRef = usePageTimeline<HTMLDivElement>(".section-heading", ".book-library-card", undefined, [books.length, activeBookId]);
  const emptyRef = useBreathePulse<HTMLDivElement>([books.length]);

  async function handleOpen(bookId: string): Promise<void> {
    await switchBook(bookId);
    navigate("/book");
  }

  async function handleCreate(options: CreateBookOptions): Promise<void> {
    const created = await createNewBook({
      title: options.title,
      audienceChannel: options.audienceChannel,
      novelType: options.novelType
    });
    if (created) {
      navigate("/book/bootstrap", { replace: true });
    }
  }

  return (
    <section ref={pageRef} className="panel page-panel books-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">书库</p>
          <h2>我的书籍</h2>
        </div>
      </div>
      <div className="book-create-section panel-inset">
        <h3 className="create-book-section-title">创建新书</h3>
        <CreateBookForm disabled={isSwitchingBook} onSubmit={handleCreate} />
        {errorText ? <p className="error-text">{errorText}</p> : null}
      </div>

      {books.length === 0 ? (
        <div ref={emptyRef} className="empty-state empty-state--hero">
          <BrandMark size={56} className="brand-mark--lg empty-state-icon" />
          <h3>还没有任何书籍</h3>
          <p>选择频道与类型后创建新书。</p>
        </div>
      ) : (
        <div className="book-library-grid">
          {books.map((book) => (
            <article
              key={book.id}
              className={`book-library-card ${book.id === activeBookId ? "is-active" : ""}`}
            >
              <header>
                <h3>{book.title}</h3>
                {book.id === activeBookId ? <span className="nav-badge">当前</span> : null}
              </header>
              <p className="book-library-genre">{book.genre || "未设类型"}</p>
              <ul className="book-library-stats">
                <li>{book.chapterCount} 章</li>
                <li>{book.onboardingCompleted ? "问卷已完成" : "问卷未完成"}</li>
                <li>更新 {new Date(book.updatedAt).toLocaleString()}</li>
              </ul>
              <div className="book-library-actions">
                <button
                  className="primary-button compact-button"
                  disabled={isSwitchingBook}
                  onClick={() => void handleOpen(book.id)}
                  type="button"
                >
                  {book.id === activeBookId ? "打开总览" : "切换并打开"}
                </button>
                <button
                  className="secondary-button compact-button"
                  disabled={isSwitchingBook}
                  onClick={() => {
                    if (!window.confirm(`确定删除《${book.title}》？此操作不可恢复。`)) {
                      return;
                    }
                    void removeBook(book.id);
                  }}
                  type="button"
                >
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

    </section>
  );
}
