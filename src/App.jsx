import { BarChart3, CalendarDays, ClipboardList, FolderTree, LogOut, Menu as MenuIcon, Repeat, ShoppingCart, TrendingUp, Wallet, WalletCards, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Categorias from "./pages/Categorias.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Lancamentos from "./pages/Lancamentos.jsx";
import Compras from "./pages/Compras.jsx";
import Login from "./pages/Login.jsx";
import MovimentacaoMes from "./pages/MovimentacaoMes.jsx";
import Recorrentes from "./pages/Recorrentes.jsx";
import Relatorio from "./pages/Relatorio.jsx";
import VendasAtivos from "./pages/VendasAtivos.jsx";

const tabs = [
  { id: "dashboard", label: "Dash", icon: BarChart3, component: Dashboard },
  { id: "movimentacao", label: "Movimentação Mês", icon: CalendarDays, component: MovimentacaoMes },
  { id: "lancamentos", label: "Lançamentos", icon: WalletCards, component: Lancamentos },
  { id: "relatorio", label: "Relatório", icon: ClipboardList, component: Relatorio },
  { id: "vendas-ativos", label: "Vendas Ativos", icon: TrendingUp, component: VendasAtivos },
  { id: "recorrentes", label: "Recorrentes", icon: Repeat, component: Recorrentes },
  { id: "lista-compras", label: "Compras", icon: ShoppingCart, component: Compras },
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

  const iniciais = (user.nome || "?").trim().slice(0, 1);
  const [gaveta, setGaveta] = useState(false);
  const abrir = (id) => {
    setActive(id);
    setGaveta(false);
  };

  return (
    <div className="min-h-screen text-ink">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button className="btn-secondary h-10 w-10 p-0 md:hidden" type="button" onClick={() => setGaveta(true)} title="Menu" aria-label="Abrir menu">
                <MenuIcon size={18} />
              </button>
              <Marca />
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden max-w-48 truncate text-sm font-semibold sm:block">{user.nome}</span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white to-zinc-500 text-sm font-bold text-zinc-950">
                {iniciais}
              </span>
              <button className="btn-secondary h-9 px-3" type="button" onClick={logout} title="Sair" aria-label="Sair">
                <LogOut size={16} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
          <div className="hidden md:block">
            <Menu active={active} onChange={setActive} />
          </div>
        </div>
      </header>

      {gaveta && <Gaveta active={active} onChange={abrir} onFechar={() => setGaveta(false)} user={user} onSair={logout} />}

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <ActivePage ano={ano} setAno={setAno} />
      </main>
    </div>
  );
}

function Marca() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-zinc-950 shadow-[0_8px_30px_-8px_rgba(255,255,255,0.5)]">
        <Wallet size={18} />
      </span>
      <div className="leading-tight">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-muted">ARENA084</p>
        <p className="text-base font-bold tracking-tight">Financeiro</p>
      </div>
    </div>
  );
}

// Celular: menu em gaveta lateral, aberto pelo botao do topo.
function Gaveta({ active, onChange, onFechar, user, onSair }) {
  useEffect(() => {
    const fechar = (event) => event.key === "Escape" && onFechar();
    window.addEventListener("keydown", fechar);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", fechar);
      document.body.style.overflow = "";
    };
  }, [onFechar]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden" onClick={onFechar}>
      <aside
        className="flex h-full w-72 max-w-[85vw] flex-col border-r border-white/[0.08] bg-zinc-950 px-4 py-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <Marca />
          <button className="btn-secondary h-9 w-9 p-0" type="button" onClick={onFechar} title="Fechar" aria-label="Fechar menu">
            <X size={16} />
          </button>
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = tab.id === active;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={`flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                  selected ? "bg-white text-zinc-950" : "text-muted hover:bg-white/[0.05] hover:text-ink"
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div className="mt-4 flex items-center gap-3 border-t border-white/[0.08] pt-4">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{user.nome}</span>
          <button className="btn-secondary h-9 px-3" type="button" onClick={onSair}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>
    </div>
  );
}

// Desktop: abas com sublinhado (rola de lado se faltar espaco).
function Menu({ active, onChange }) {
  const ativoRef = useRef(null);

  useEffect(() => {
    ativoRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [active]);

  return (
    <nav className="sem-scrollbar -mx-4 flex overflow-x-auto px-2 sm:mx-0 sm:px-0">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={selected ? ativoRef : null}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm transition ${
              selected ? "border-white font-semibold text-ink" : "border-transparent font-medium text-muted hover:text-ink"
            }`}
          >
            <Icon size={16} className={selected ? "" : "opacity-70"} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
