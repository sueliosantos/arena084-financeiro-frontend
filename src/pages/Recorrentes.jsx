import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, dateInput, money } from "../api.js";
import Notice from "../components/Notice.jsx";
import PageTitle from "../components/PageTitle.jsx";

const initialForm = {
  descricao: "",
  valor: "",
  tipo: "DESPESA",
  categoriaId: "",
  dataInicio: dateInput(new Date()),
  dataFim: "",
  diaPagamento: "",
  ativo: true
};

export default function Recorrentes() {
  const [categorias, setCategorias] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [aplicarAPartir, setAplicarAPartir] = useState(dateInput(new Date()));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const carregar = async () => {
    const [cats, recorrentes] = await Promise.all([api.categorias.listar(), api.recorrentes.listar()]);
    setCategorias(cats);
    setItems(recorrentes);
  };

  useEffect(() => {
    carregar().catch((err) => setError(err.message));
  }, []);

  const filteredCategorias = useMemo(() => categorias.filter((cat) => cat.tipo === form.tipo), [categorias, form.tipo]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      const payload = {
        ...form,
        valor: Number(form.valor),
        categoriaId: Number(form.categoriaId),
        diaPagamento: form.diaPagamento ? Number(form.diaPagamento) : null,
        dataFim: form.dataFim || null
      };

      if (editing) {
        await api.recorrentes.atualizar(editing, { ...payload, aplicarAPartir });
      } else {
        await api.recorrentes.criar(payload);
      }
      setForm(initialForm);
      setEditing(null);
      await carregar();
      setSuccess(editing ? "Recorrente atualizado a partir da data escolhida." : "Recorrente cadastrado.");
    } catch (err) {
      setError(err.message);
    }
  };

  const toggle = async (item) => {
    await api.recorrentes.atualizar(item.id, { ativo: !item.ativo });
    await carregar();
  };

  const remover = async (id) => {
    await api.recorrentes.remover(id);
    await carregar();
  };

  const editar = (item) => {
    setEditing(item.id);
    setForm({
      descricao: item.descricao,
      valor: item.valor,
      tipo: item.tipo,
      categoriaId: item.categoriaId,
      dataInicio: dateInput(item.dataInicio),
      dataFim: item.dataFim ? dateInput(item.dataFim) : "",
      diaPagamento: item.diaPagamento ? String(item.diaPagamento) : "",
      ativo: item.ativo
    });
    setAplicarAPartir(dateInput(new Date()));
  };

  return (
    <section>
      <PageTitle title="Recorrentes" />
      <Notice error={error} success={success} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
        <form className="panel space-y-3" onSubmit={submit}>
          <input className="field" placeholder="Descrição" value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <select className="field" value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value, categoriaId: "" })}>
              <option value="DESPESA">Despesa</option>
              <option value="RECEITA">Receita</option>
            </select>
            <input className="field" type="number" step="0.01" placeholder="Valor" value={form.valor} onChange={(event) => setForm({ ...form, valor: event.target.value })} />
          </div>
          <select className="field" value={form.categoriaId} onChange={(event) => setForm({ ...form, categoriaId: event.target.value })}>
            <option value="">Categoria</option>
            {filteredCategorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs text-muted">
              Início do período
              <input className="field" type="date" value={form.dataInicio} onChange={(event) => setForm({ ...form, dataInicio: event.target.value })} />
            </label>
            <label className="space-y-1 text-xs text-muted">
              Fim do período
              <input className="field" type="date" value={form.dataFim} onChange={(event) => setForm({ ...form, dataFim: event.target.value })} />
            </label>
          </div>
          <label className="space-y-1 text-xs text-muted">
            Dia do pagamento opcional
            <input
              className="field"
              type="number"
              min="1"
              max="31"
              placeholder="Vazio usa o dia do início"
              value={form.diaPagamento}
              onChange={(event) => setForm({ ...form, diaPagamento: event.target.value })}
            />
          </label>
          {editing && (
            <label className="space-y-1 text-xs text-muted">
              Aplicar alteração a partir de
              <input className="field" type="date" value={aplicarAPartir} onChange={(event) => setAplicarAPartir(event.target.value)} />
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.ativo} onChange={(event) => setForm({ ...form, ativo: event.target.checked })} />
            Ativo
          </label>
          <button className="btn w-full" type="submit">
            <Plus size={16} /> Adicionar
          </button>
          {editing && (
            <button className="btn-secondary w-full" type="button" onClick={() => setEditing(null)}>
              Cancelar edição
            </button>
          )}
        </form>

        <div className="panel overflow-x-auto p-0">
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="bg-black/20">
              <tr>
                <th className="table-cell">Descrição</th>
                <th className="table-cell">Categoria</th>
                <th className="table-cell">Período</th>
                <th className="table-cell">Dia pgto.</th>
                <th className="table-cell">Ativo</th>
                <th className="table-cell text-right">Valor</th>
                <th className="table-cell w-32"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="table-cell">{item.descricao}</td>
                  <td className="table-cell">{item.categoria?.nome}</td>
                  <td className="table-cell">
                    {dateInput(item.dataInicio)} - {item.dataFim ? dateInput(item.dataFim) : "infinito"}
                  </td>
                  <td className="table-cell">{item.diaPagamento || "-"}</td>
                  <td className="table-cell">{item.ativo ? "Sim" : "Não"}</td>
                  <td className={`table-cell text-right font-semibold ${item.tipo === "RECEITA" ? "text-brand" : "text-danger"}`}>{money(item.valor)}</td>
                  <td className="table-cell">
                    <div className="flex justify-end gap-2">
                      <button className="btn-secondary h-8" type="button" onClick={() => toggle(item)}>
                        {item.ativo ? "Pausar" : "Ativar"}
                      </button>
                      <button className="btn-secondary h-8 w-8 p-0" type="button" onClick={() => editar(item)} title="Editar daqui para frente">
                        <Pencil size={14} />
                      </button>
                      <button className="btn-danger h-8 w-8 p-0" type="button" onClick={() => remover(item.id)} title="Remover">
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
    </section>
  );
}
