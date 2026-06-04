import { useProject } from "../context/ProjectContext";

export default function BookSwitcher(): JSX.Element {
  const { books, activeBookId, isSwitchingBook, switchBook } = useProject();

  const activeBook = books.find((book) => book.id === activeBookId);

  return (
    <div className="book-switcher">
      <label className="book-switcher-label">
        <span>当前书籍</span>
        <select
          disabled={isSwitchingBook || books.length === 0}
          value={activeBookId}
          onChange={(event) => void switchBook(event.target.value)}
        >
          {books.map((book) => (
            <option key={book.id} value={book.id}>
              {book.title}（{book.chapterCount} 章）
            </option>
          ))}
        </select>
      </label>
      {books.length === 0 ? (
        <span className="book-switcher-meta book-switcher-meta--empty">暂无书籍</span>
      ) : activeBook ? (
        <span className="book-switcher-meta">{activeBook.genre || "未设类型"}</span>
      ) : null}
    </div>
  );
}
