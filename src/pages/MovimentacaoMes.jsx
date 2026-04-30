import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3 } from "lucide-react";
import { api, dateInput, money } from "../api.js";
import Notice from "../components/Notice.jsx";
import PageTitle from "../components/PageTitle.jsx";

const monthNames = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function MovimentacaoMes({ ano }) {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

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
      setSuccess(status === "PAGO" ? "Lancamento marcado como pago." : "Lancamento marcado como pendente.");
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

  return (
    <section>
      <PageTitle
        title="Movimentacao Mes"
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
        <table className="w-full min-w-[900px] border-collapse">
          <thead className="bg-black/20">
            <tr>
              <th className="table-cell">Data</th>
              <th className="table-cell">Descricao</th>
              <th className="table-cell">Categoria</th>
              <th className="table-cell">Origem</th>
              <th className="table-cell">Status</th>
              <th className="table-cell">Obs</th>
              <th className="table-cell text-right">Valor</th>
              <th className="table-cell text-right">Acao</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="table-cell">{dateInput(item.data)}</td>
                <td className="table-cell">{item.descricao}</td>
                <td className="table-cell">{item.categoria?.nome}</td>
                <td className="table-cell">{item.origem}</td>
                <td className="table-cell">{item.status}</td>
                <td className="table-cell text-muted">{item.observacao || "-"}</td>
                <td className={`table-cell text-right font-semibold ${item.tipo === "RECEITA" ? "text-brand" : "text-danger"}`}>{money(item.valor)}</td>
                <td className="table-cell text-right">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
