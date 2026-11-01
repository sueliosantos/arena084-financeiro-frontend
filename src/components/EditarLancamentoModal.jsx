import { Save, X } from "lucide-react";
import { useState } from "react";
import { dateInput, valorDigitado } from "../api.js";

export const formLancamentoVazio = {
  tipo: "DESPESA",
  valor: "",
  descricao: "",
  observacao: "",
  data: dateInput(new Date()),
  status: "PAGO",
  categoriaId: "",
  contabiliza: true
};

export const formDoLancamento = (item) => ({
  tipo: item.tipo,
  valor: String(item.valor ?? ""),
  descricao: item.descricao || "",
  observacao: item.observacao || "",
  data: dateInput(item.data),
  status: item.status,
  categoriaId: item.categoriaId ? String(item.categoriaId) : "",
  contabiliza: item.contabiliza !== false
});

// Modal de edicao usado em Lancamentos e no Relatorio. onSalvar(dados) devolve true quando salvou.
export default function EditarLancamentoModal({ item, categorias, onSalvar, onFechar }) {
  const [valores, setValores] = useState(() => formDoLancamento(item));

  const submit = async (event) => {
    event.preventDefault();
    if (await onSalvar(valores)) onFechar();
  };

  return (
    <div className="overlay" onClick={onFechar}>
      <form className="panel max-h-full w-full max-w-lg space-y-3 overflow-y-auto" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Editar lançamento</h2>
            <p className="truncate text-sm text-muted">{item.descricao}</p>
          </div>
          <button className="btn-secondary h-8 w-8 shrink-0 p-0" type="button" onClick={onFechar} title="Fechar" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        <CamposLancamento valores={valores} onChange={setValores} categorias={categorias} />
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={onFechar}>
            Cancelar
          </button>
          <button className="btn" type="submit">
            <Save size={16} />
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}

export function CamposLancamento({ valores, onChange, categorias }) {
  const set = (campo, valor) => onChange({ ...valores, [campo]: valor });
  const filtradas = categorias.filter((cat) => cat.tipo === valores.tipo);

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <select className="field" value={valores.tipo} onChange={(event) => onChange({ ...valores, tipo: event.target.value, categoriaId: "" })}>
          <option value="DESPESA">Despesa</option>
          <option value="RECEITA">Receita</option>
        </select>
        <select className="field" value={valores.status} onChange={(event) => set("status", event.target.value)}>
          <option value="PENDENTE">Pendente</option>
          <option value="PAGO">Pago</option>
        </select>
      </div>
      <input className="field" placeholder="Descrição" value={valores.descricao} onChange={(event) => set("descricao", event.target.value)} />
      <input className="field" placeholder="Observação" value={valores.observacao} onChange={(event) => set("observacao", event.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <input className="field" type="text" inputMode="decimal" placeholder="Valor" value={valores.valor} onChange={(event) => set("valor", valorDigitado(event.target.value))} />
        <input className="field" type="date" value={valores.data} onChange={(event) => set("data", event.target.value)} />
      </div>
      <select className="field" value={valores.categoriaId} onChange={(event) => set("categoriaId", event.target.value)}>
        <option value="">Categoria</option>
        {filtradas.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.nome}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={valores.contabiliza} onChange={(event) => set("contabiliza", event.target.checked)} />
        Contabiliza nos totais e gráficos
      </label>
    </>
  );
}
