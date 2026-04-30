import { LockKeyhole } from "lucide-react";
import { useState } from "react";
import { api } from "../api.js";
import Notice from "../components/Notice.jsx";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ nome: "", email: "", senha: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "cadastro") {
        await api.auth.cadastro(form);
      }

      const session = await api.auth.login({ email: form.email, senha: form.senha });
      localStorage.setItem("financeiro_token", session.token);
      localStorage.setItem("financeiro_user", JSON.stringify({ id: session.id, nome: session.nome, email: session.email }));
      onLogin({ id: session.id, nome: session.nome, email: session.email });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 text-ink">
      <form className="panel w-full max-w-md space-y-4" onSubmit={submit}>
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-brand text-slate-950">
            <LockKeyhole size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">ARENA084</p>
            <h1 className="text-xl font-semibold">Acesso Financeiro</h1>
          </div>
        </div>

        <Notice error={error} />

        {mode === "cadastro" && (
          <input className="field" placeholder="Nome" value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} />
        )}
        <input className="field" type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <input className="field" type="password" placeholder="Senha" value={form.senha} onChange={(event) => setForm({ ...form, senha: event.target.value })} />

        <button className="btn w-full" type="submit" disabled={loading}>
          {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta e entrar"}
        </button>

        <button
          className="btn-secondary w-full"
          type="button"
          onClick={() => {
            setError("");
            setMode(mode === "login" ? "cadastro" : "login");
          }}
        >
          {mode === "login" ? "Criar novo acesso" : "Ja tenho acesso"}
        </button>
      </form>
    </main>
  );
}
