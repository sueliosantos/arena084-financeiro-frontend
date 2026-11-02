import { CalendarHeart, ShoppingCart } from "lucide-react";
import { useState } from "react";
import DatasImportantes from "./DatasImportantes.jsx";
import ListaCompras from "./ListaCompras.jsx";

const SUBABAS = [
  { id: "lista", label: "Lista de compras", icon: ShoppingCart, component: ListaCompras },
  { id: "datas", label: "Datas importantes", icon: CalendarHeart, component: DatasImportantes }
];

const CHAVE = "financeiro_compras_subaba";

const lerSubaba = () => {
  try {
    return localStorage.getItem(CHAVE) || "lista";
  } catch {
    return "lista";
  }
};

export default function Compras(props) {
  const [ativa, setAtiva] = useState(lerSubaba);
  const Pagina = (SUBABAS.find((aba) => aba.id === ativa) || SUBABAS[0]).component;

  const trocar = (id) => {
    setAtiva(id);
    try {
      localStorage.setItem(CHAVE, id);
    } catch {
      // sem storage: so nao lembra a escolha
    }
  };

  return (
    <div className="space-y-5">
      <div className="inline-flex w-full gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1 sm:w-auto">
        {SUBABAS.map((aba) => {
          const Icon = aba.icon;
          const selecionada = aba.id === ativa;
          return (
            <button
              key={aba.id}
              type="button"
              onClick={() => trocar(aba.id)}
              className={`flex h-9 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold transition sm:flex-none ${
                selecionada ? "bg-white text-zinc-950" : "text-muted hover:bg-white/[0.06] hover:text-ink"
              }`}
            >
              <Icon size={15} />
              {aba.label}
            </button>
          );
        })}
      </div>
      <Pagina {...props} />
    </div>
  );
}
