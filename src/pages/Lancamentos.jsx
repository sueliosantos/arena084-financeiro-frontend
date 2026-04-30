import { Check, MessageSquare, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, dateInput, money } from "../api.js";
import Notice from "../components/Notice.jsx";
import PageTitle from "../components/PageTitle.jsx";

const initialForm = {
  tipo: "DESPESA",
  valor: "",
  descricao: "",
  observacao: "",
  data: dateInput(new Date()),
  status: "PENDENTE",
  categoriaId: ""
};

export default function Lancamentos() {
  const today = new Date();
  const [mes, setMes] = useState(today.getMonth() + 1);
  const [ano, setAno] = useState(today.getFullYear());
  const [categorias, setCategorias] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [mensagem, setMensagem] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const carregar = async () => {
    const [cats, itens] = await Promise.all([api.categorias.listar(), api.lancamentos.listar(mes, ano)]);
    setCategorias(cats);
    setLancamentos(itens);
  };

  useEffect(() => {
    setError("");
    carregar().catch((err) => setError(err.message));
  }, [mes, ano]);

  const filteredCategorias = useMemo(() => categorias.filter((cat) => cat.tipo === form.tipo), [categorias, form.tipo]);

  const totals = useMemo(
    () =>
      lancamentos.reduce(
        (acc, item) => {
          if (item.tipo === "RECEITA") acc.receitas += Number(item.valor);
          if (item.tipo === "DESPESA") acc.despesas += Number(item.valor);
          return { ...acc, saldo: acc.receitas - acc.despesas };
        },
        { receitas: 0, despesas: 0, saldo: 0 }
      ),
    [lancamentos]
  );

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.lancamentos.criar({ ...form, categoriaId: Number(form.categoriaId), valor: Number(form.valor) });
      setForm(initialForm);
      await carregar();
      setSuccess("Lançamento cadastrado.");
    } catch (err) {
      setError(err.message);
    }
  };

  const submitWhatsApp = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.lancamentos.criar({ mensagem });
      setMensagem("");
      await carregar();
      setSuccess("Mensagem importada.");
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleStatus = async (item) => {
    const status = item.status === "PAGO" ? "PENDENTE" : "PAGO";
    if (item.simulado) {
      await api.lancamentos.materializarRecorrente({ recorrenteId: item.recorrenteId, mes, ano, status, observacao: item.observacao });
    } else {
      await api.lancamentos.atualizar(item.id, { status });
    }
    await carregar();
  };

  const editarObservacao = async (item) => {
    const observacao = window.prompt("Observação do lançamento", item.observacao || "");
    if (observacao === null) return;

    if (item.simulado) {
      await api.lancamentos.materializarRecorrente({ recorrenteId: item.recorrenteId, mes, ano, status: item.status, observacao });
    } else {
      await api.lancamentos.atualizar(item.id, { observacao });
    }
    await carregar();
  };

  const remover = async (item) => {
    if (item.simulado) return;
    await api.lancamentos.remover(item.id);
    await carregar();
  };

  return (
    <section>
      <PageTitle
        title="Lançamentos"
        actions={
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <select className="field w-full sm:w-28" value={mes} onChange={(event) => setMes(event.target.value)}>
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {String(index + 1).padStart(2, "0")}
                </option>
              ))}
            </select>
            <input className="field w-full sm:w-32" type="number" value={ano} onChange={(event) => setAno(event.target.value)} />
          </div>
        }
      />
      <Notice error={error} success={success} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <form className="panel space-y-3" onSubmit={submit}>
            <div className="grid grid-cols-2 gap-2">
              <select className="field" value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value, categoriaId: "" })}>
                <option value="DESPESA">Despesa</option>
                <option value="RECEITA">Receita</option>
              </select>
              <select className="field" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="PENDENTE">Pendente</option>
                <option value="PAGO">Pago</option>
              </select>
            </div>
            <input className="field" placeholder="Descrição" value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} />
            <input className="field" placeholder="Observação" value={form.observacao} onChange={(event) => setForm({ ...form, observacao: event.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="field" type="number" step="0.01" placeholder="Valor" value={form.valor} onChange={(event) => setForm({ ...form, valor: event.target.value })} />
              <input className="field" type="date" value={form.data} onChange={(event) => setForm({ ...form, data: event.target.value })} />
            </div>
            <select className="field" value={form.categoriaId} onChange={(event) => setForm({ ...form, categoriaId: event.target.value })}>
              <option value="">Categoria</option>
              {filteredCategorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </select>
            <button className="btn w-full" type="submit">
              <Plus size={16} /> Adicionar
            </button>
          </form>

          <form className="panel space-y-3" onSubmit={submitWhatsApp}>
            <input className="field" placeholder="+2000 salario ou -50 mercado" value={mensagem} onChange={(event) => setMensagem(event.target.value)} />
            <button className="btn-secondary w-full" type="submit">
              Importar WhatsApp
            </button>
          </form>
        </div>

        <div className="panel overflow-hidden p-0">
          <div className="grid gap-2 border-b border-line p-3 md:grid-cols-3">
            <Summary label="Receitas" value={totals.receitas} />
            <Summary label="Despesas" value={totals.despesas} />
            <Summary label="Saldo" value={totals.saldo} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse">
              <thead className="bg-black/20">
                <tr>
                  <th className="table-cell">Data</th>
                  <th className="table-cell">Descrição</th>
                  <th className="table-cell">Obs</th>
                  <th className="table-cell">Categoria</th>
                  <th className="table-cell">Origem</th>
                  <th className="table-cell">Status</th>
                  <th className="table-cell text-right">Valor</th>
                  <th className="table-cell w-24"></th>
                </tr>
              </thead>
              <tbody>
                {lancamentos.map((item) => (
                  <tr key={item.id}>
                    <td className="table-cell">{dateInput(item.data)}</td>
                    <td className="table-cell">{item.descricao}</td>
                    <td className="table-cell text-muted">{item.observacao || "-"}</td>
                    <td className="table-cell">{item.categoria?.nome}</td>
                    <td className="table-cell">{item.origem}</td>
                    <td className="table-cell">{item.status}</td>
                    <td className={`table-cell text-right font-semibold ${item.tipo === "RECEITA" ? "text-brand" : "text-danger"}`}>{money(item.valor)}</td>
                    <td className="table-cell">
                      <div className="flex justify-end gap-1">
                        <button className="btn-secondary h-8 w-8 p-0" type="button" onClick={() => toggleStatus(item)} title="Alternar status">
                          <Check size={14} />
                        </button>
                        <button className="btn-secondary h-8 w-8 p-0" type="button" onClick={() => editarObservacao(item)} title="Observação">
                          <MessageSquare size={14} />
                        </button>
                        <button className="btn-danger h-8 w-8 p-0" type="button" disabled={item.simulado} onClick={() => remover(item)} title="Remover">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function Summary({ label, value }) {
  return (
    <div>
      <span className="text-xs uppercase text-slate-500">{label}</span>
      <strong className="block text-lg">{money(value)}</strong>
    </div>
  );
}
