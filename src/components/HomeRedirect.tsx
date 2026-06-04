import { Navigate } from "react-router-dom";

import { useProject } from "../context/ProjectContext";

export default function HomeRedirect(): JSX.Element {
  const { books } = useProject();
  if (books.length === 0) {
    return <Navigate to="/books" replace />;
  }
  return <Navigate to="/book" replace />;
}
