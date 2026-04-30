import { useEffect, useMemo, useState } from "react";
import { api, dateInput, money } from "../api.js";
import Notice from "../components/Notice.jsx";
import PageTitle from "../components/PageTitle.jsx";

const monthNames = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function MovimentacaoMes({ ano }) {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    api
      .lancamentos.listar(mes, ano)
      .then(setItems)
      .catch((err) => setError(err.message));
  }, [mes, ano]);

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
      <Notice error={error} />

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
