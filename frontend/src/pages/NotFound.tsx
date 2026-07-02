import { Link } from "react-router-dom";
import { useLang } from "@/lib/useLang";

export default function NotFound() {
  const es = useLang() === "es";
  return (
    <div className="page-body">
      <div className="prose">
        <h1>404</h1>
        <p className="lede">{es ? "Página no encontrada." : "Page not found."}</p>
        <p>
          <Link className="link" to="/">{es ? "Volver al inicio" : "Back to the introduction"}</Link>
        </p>
      </div>
    </div>
  );
}
