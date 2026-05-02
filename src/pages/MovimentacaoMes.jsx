import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Pencil, Save, X } from "lucide-react";
import { api, dateInput, money } from "../api.js";
import Notice from "../components/Notice.jsx";
import PageTitle from "../components/PageTitle.jsx";

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const emptyEditForm = { valor: "", data: "", status: "PENDENTE", observacao: "", contabiliza: true };

export default function MovimentacaoMes({ ano }) {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);

  const carregar = async () => {
    setError("");
    setItems(await api.lancamentos.listar(mes, ano));
  };

  useEffect(() => {
    setSuccess("");
    carregar().catch((err) => setError(err.message));
  }, [mes, ano]);

  const toggleStatus = async (item) => {
    const status = item.status === "PAGO" ? "PENDENTE" : "PAGO";
    setError("");
    setSuccess("");
    setUpdatingId(item.id);

    try {
      if (item.simulado) {
        await api.lancamentos.materializarRecorrente({ recorrenteId: item.recorrenteId, mes, ano, status, observacao: item.observacao });
      } else {
        await api.lancamentos.atualizar(item.id, { status });
      }

      await carregar();
      setSuccess(status === "PAGO" ? "Lançamento marcado como pago." : "Lançamento marcado como pendente.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const abrirEdicao = (item) => {
    setError("");
    setSuccess("");
    setEditingItem(item);
    setEditForm({
      valor: String(item.valor ?? ""),
      data: dateInput(item.data),
      status: item.status,
      observacao: item.observacao || "",
      contabiliza: item.contabiliza !== false
    });
  };

  const fecharEdicao = () => {
    setEditingItem(null);
    setEditForm(emptyEditForm);
  };

  const salvarEdicao = async (event) => {
    event.preventDefault();
    if (!editingItem) return;

    const valor = Number(String(editForm.valor).replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(valor) || valor < 0) {
      setError("Informe um valor válido.");
      return;
    }

    setError("");
    setSuccess("");
    setUpdatingId(editingItem.id);

    try {
      const payload = {
        valor,
        data: editForm.data,
        status: editForm.status,
        observacao: editForm.observacao,
        contabiliza: editForm.contabiliza
      };

      if (editingItem.simulado) {
        await api.lancamentos.materializarRecorrente({
          recorrenteId: editingItem.recorrenteId,
          mes,
          ano,
          ...payload
        });
      } else {
        await api.lancamentos.atualizar(editingItem.id, payload);
      }

      await carregar();
      fecharEdicao();
      setSuccess("Lançamento atualizado.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          if (item.contabiliza === false) return acc;
          if (item.status === "PAGO" && item.tipo === "RECEITA") acc.receitas += Number(item.valor);
          if (item.status === "PAGO" && item.tipo === "DESPESA") acc.despesas += Number(item.valor);
          if (item.status !== "PAGO" && item.tipo === "DESPESA") acc.pendente += Number(item.valor);
          acc.saldo = acc.receitas - acc.despesas;
          return acc;
        },
        { receitas: 0, despesas: 0, pendente: 0, saldo: 0 }
      ),
    [items]
  );

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => (a.status === "PAGO" ? 0 : 1) - (b.status === "PAGO" ? 0 : 1)),
    [items]
  );

  return (
    <section>
      <PageTitle
        title="Movimentação Mês"
        actions={
          <select className="field w-full sm:w-48" value={mes} onChange={(event) => setMes(event.target.value)}>
            {monthNames.map((name, index) => (
              <option key={name} value={index + 1}>
                {name} / {ano}
              </option>
            ))}
          </select>
        }
      />
      <Notice error={error} success={success} />

      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Receitas confirmadas" value={totals.receitas} tone="text-brand" />
        <Metric label="Despesas confirmadas" value={totals.despesas} tone="text-danger" />
        <Metric label="Pendente" value={totals.pendente} tone="text-warn" />
        <Metric label="Saldo confirmado" value={totals.saldo} tone={totals.saldo >= 0 ? "text-brand" : "text-danger"} />
      </div>

      <div className="panel mt-4 overflow-x-auto p-0">
        <table className="w-full min-w-[960px] border-collapse">
          <thead className="bg-black/20">
            <tr>
              <th className="table-cell">Data</th>
              <th className="table-cell">Descrição</th>
              <th className="table-cell">Categoria</th>
              <th className="table-cell">Origem</th>
              <th className="table-cell">Status</th>
              <th className="table-cell">Conta</th>
              <th className="table-cell">Obs</th>
              <th className="table-cell text-right">Valor</th>
              <th className="table-cell text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => (
              <tr key={item.id}>
                <td className="table-cell">{dateInput(item.data)}</td>
                <td className="table-cell">{item.descricao}</td>
                <td className="table-cell">{item.categoria?.nome}</td>
                <td className="table-cell">{item.origem}</td>
                <td className="table-cell text-center">
                  <span title={item.status === "PAGO" ? "Pago" : "Pendente"} aria-label={item.status === "PAGO" ? "Pago" : "Pendente"}>
                    {item.status === "PAGO" ? "✅" : "⚠️"}
                  </span>
                </td>
                <td className="table-cell">{item.contabiliza === false ? "Não" : "Sim"}</td>
                <td className="table-cell text-muted">{item.observacao || "-"}</td>
                <td className={`table-cell text-right font-semibold ${item.tipo === "RECEITA" ? "text-brand" : "text-danger"}`}>{money(item.valor)}</td>
                <td className="table-cell text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="btn-secondary h-8 w-8 p-0"
                      type="button"
                      onClick={() => abrirEdicao(item)}
                      disabled={updatingId === item.id}
                      title="Editar lançamento"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className={item.status === "PAGO" ? "btn-secondary h-8 px-2" : "btn h-8 px-2"}
                      type="button"
                      onClick={() => toggleStatus(item)}
                      disabled={updatingId === item.id}
                      title={item.status === "PAGO" ? "Marcar como pendente" : "Marcar como pago"}
                    >
                      {item.status === "PAGO" ? <Clock3 size={14} /> : <CheckCircle2 size={14} />}
                      {item.status === "PAGO" ? "Pendente" : "Pagar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <form className="panel w-full max-w-lg space-y-4" onSubmit={salvarEdicao}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Editar lançamento</h2>
                <p className="text-sm text-muted">{editingItem.descricao}</p>
              </div>
              <button className="btn-secondary h-8 w-8 p-0" type="button" onClick={fecharEdicao} title="Fechar">
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-muted">
                Valor
                <input className="field" type="text" value={editForm.valor} onChange={(event) => setEditForm({ ...editForm, valor: event.target.value })} />
              </label>
              <label className="space-y-1 text-xs text-muted">
                Data de pagamento
                <input className="field" type="date" value={editForm.data} onChange={(event) => setEditForm({ ...editForm, data: event.target.value })} />
              </label>
            </div>

            <label className="space-y-1 text-xs text-muted">
              Status
              <select className="field" value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}>
                <option value="PENDENTE">Pendente</option>
                <option value="PAGO">Pago</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editForm.contabiliza}
                onChange={(event) => setEditForm({ ...editForm, contabiliza: event.target.checked })}
              />
              Contabiliza nos totais e gráficos
            </label>

            <label className="space-y-1 text-xs text-muted">
              Observação
              <textarea
                className="field min-h-24 resize-y py-2"
                value={editForm.observacao}
                onChange={(event) => setEditForm({ ...editForm, observacao: event.target.value })}
              />
            </label>

            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={fecharEdicao}>
                Cancelar
              </button>
              <button className="btn" type="submit" disabled={updatingId === editingItem.id}>
                <Save size={16} />
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className="panel">
      <p className="text-sm text-muted">{label}</p>
      <strong className={`mt-1 block text-xl ${tone}`}>{money(value)}</strong>
    </div>
  );
}
