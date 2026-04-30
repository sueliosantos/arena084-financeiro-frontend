import { BarChart3, CalendarDays, FolderTree, LogOut, Repeat, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import Categorias from "./pages/Categorias.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Lancamentos from "./pages/Lancamentos.jsx";
import Login from "./pages/Login.jsx";
import MovimentacaoMes from "./pages/MovimentacaoMes.jsx";
import Recorrentes from "./pages/Recorrentes.jsx";

const tabs = [
  { id: "dashboard", label: "Dash", icon: BarChart3, component: Dashboard },
  { id: "movimentacao", label: "Movimentação Mês", icon: CalendarDays, component: MovimentacaoMes },
  { id: "lancamentos", label: "Lançamentos", icon: WalletCards, component: Lancamentos },
  { id: "recorrentes", label: "Recorrentes", icon: Repeat, component: Recorrentes },
  { id: "categorias", label: "Categoria", icon: FolderTree, component: Categorias }
];

export default function App() {
  const [active, setActive] = useState("dashboard");
  const [ano, setAno] = useState(new Date().getFullYear());
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("financeiro_user");
    return raw ? JSON.parse(raw) : null;
  });
  const ActivePage = tabs.find((tab) => tab.id === active).component;

  useEffect(() => {
    if (!localStorage.getItem("financeiro_token")) {
      setUser(null);
    }
    const handleLogout = () => setUser(null);
    window.addEventListener("financeiro:logout", handleLogout);
    return () => window.removeEventListener("financeiro:logout", handleLogout);
  }, []);

  const logout = () => {
    localStorage.removeItem("financeiro_token");
    localStorage.removeItem("financeiro_user");
    setUser(null);
    setActive("dashboard");
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-col gap-4 border-b border-line pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">ARENA084</p>
            <h1 className="text-2xl font-semibold">Controle Financeiro</h1>
            <p className="text-sm text-muted">{user.nome}</p>
          </div>
          <nav className="grid grid-cols-2 gap-2 sm:flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = tab.id === active;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActive(tab.id)}
                  className={`flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
                    selected ? "border-brand bg-brand text-slate-950" : "border-line bg-panel text-ink hover:border-brand"
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
            <button className="btn-secondary" type="button" onClick={logout}>
              <LogOut size={16} />
              Sair
            </button>
          </nav>
        </header>
        <ActivePage ano={ano} setAno={setAno} />
      </div>
    </main>
  );
}
