import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, money } from "../api.js";
import Notice from "../components/Notice.jsx";
import PageTitle from "../components/PageTitle.jsx";

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function Dashboard({ ano, setAno }) {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [data, setData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .resumo(ano, mes)
      .then((resumo) => {
        const meses = resumo.meses.map((item) => ({ ...item, nome: monthNames[item.mes - 1] }));
        setData(meses);
        setSelectedMonth(meses[meses.length - 1] || null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [ano, mes]);

  const totals = useMemo(
    () =>
      data.reduce(
        (acc, item) => ({
          receitas: acc.receitas + item.receitas,
          despesas: acc.despesas + item.despesas,
          pendente: acc.pendente + item.pendente,
          saldo: acc.saldo + item.saldo
        }),
        { receitas: 0, despesas: 0, pendente: 0, saldo: 0 }
      ),
    [data]
  );

  return (
    <section>
      <PageTitle
        title="Dashboard"
        actions={
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <input className="field w-full sm:w-32" type="number" value={ano} onChange={(event) => setAno(event.target.value)} />
            <select className="field w-full sm:w-32" value={mes} onChange={(event) => setMes(event.target.value)}>
              {monthNames.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        }
      />
      <Notice error={error} />

      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Receitas" value={totals.receitas} tone="text-brand" />
        <Metric label="Despesas" value={totals.despesas} tone="text-danger" />
        <Metric label="Pendente" value={totals.pendente} tone="text-warn" />
        <Metric label="Saldo" value={totals.saldo} tone={totals.saldo >= 0 ? "text-brand" : "text-danger"} />
      </div>

      <div className="panel mt-4 h-[430px]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">Carregando...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#28466f" />
              <XAxis dataKey="nome" stroke="#a7bdd8" />
              <YAxis tickFormatter={(value) => `R$ ${value}`} width={80} stroke="#a7bdd8" />
              <Tooltip formatter={(value) => money(value)} contentStyle={{ background: "#172f53", border: "1px solid #28466f", color: "#eef6ff" }} />
              <Legend />
              <Bar dataKey="receitas" name="Receitas" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#fb7185" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pendente" name="Pendente" fill="#facc15" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saldo" name="Saldo" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="panel mt-4 overflow-x-auto p-0">
        <div className="border-b border-line p-3">
          <h3 className="font-semibold">Cadastrados no mês {selectedMonth?.nome || "-"}</h3>
        </div>
        <table className="w-full min-w-[720px] border-collapse">
          <thead className="bg-black/20">
            <tr>
              <th className="table-cell">Descrição</th>
              <th className="table-cell">Tipo</th>
              <th className="table-cell">Status</th>
              <th className="table-cell">Origem</th>
              <th className="table-cell text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {(selectedMonth?.itens || []).map((item) => (
              <tr key={`${item.origem}-${item.id}-${item.descricao}`}>
                <td className="table-cell">{item.descricao}</td>
                <td className="table-cell">{item.tipo}</td>
                <td className="table-cell">{item.status}</td>
                <td className="table-cell">{item.origem}</td>
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
      <strong className={`mt-1 block text-2xl ${tone}`}>{money(value)}</strong>
    </div>
  );
}
