import { useEffect, useMemo, useState } from "react";
import { api, dateInput, money } from "../api.js";
import Notice from "../components/Notice.jsx";
import PageTitle from "../components/PageTitle.jsx";

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function Relatorio() {
  const today = new Date();
  const [mes, setMes] = useState(today.getMonth() + 1);
  const [ano, setAno] = useState(today.getFullYear());
  const [categoriaId, setCategoriaId] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    Promise.all([api.categorias.listar(), api.lancamentos.listar(mes, ano)])
      .then(([cats, itens]) => {
        setCategorias(cats);
        setLancamentos(itens);
      })
      .catch((err) => setError(err.message));
  }, [mes, ano]);

  const filtered = useMemo(() => {
    return lancamentos
      .filter(
        (item) =>
          !categoriaId || String(item.categoriaId) === String(categoriaId),
      )
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [lancamentos, categoriaId]);

  // 🔥 AQUI ESTÁ O AJUSTE CORRETO
  const { receitas, despesas, total } = useMemo(() => {
    const validos = filtered.filter(
      (item) => item.status !== "PENDENTE" && item.contabiliza !== false,
    );

    const receitas = validos
      .filter((item) => item.tipo === "RECEITA")
      .reduce((sum, item) => sum + Number(item.valor), 0);

    const despesas = validos
      .filter((item) => item.tipo === "DESPESA")
      .reduce((sum, item) => sum + Number(item.valor), 0);

    return {
      receitas,
      despesas,
      total: receitas - despesas,
    };
  }, [filtered]);

  return (
    <section>
      <PageTitle
        title='Relatório'
        actions={
          <div className='grid gap-2 sm:grid-cols-[180px_120px_220px]'>
            <select
              className='field'
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
            >
              {monthNames.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>

            <input
              className='field'
              type='number'
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
            />

            <select
              className='field'
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              <option value=''>Todas as categorias</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <Notice error={error} />

      <div className='panel mt-4 overflow-x-auto p-0'>
        <table className='w-full min-w-[900px] border-collapse'>
          <thead className='bg-black/20'>
            <tr>
              <th className='table-cell'>Data</th>
              <th className='table-cell'>Descrição</th>
              <th className='table-cell'>Categoria</th>
              <th className='table-cell'>Tipo</th>
              <th className='table-cell'>Status</th>
              <th className='table-cell'>Obs</th>
              <th className='table-cell text-right'>Valor</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className='table-cell'>{dateInput(item.data)}</td>
                <td className='table-cell'>{item.descricao}</td>
                <td className='table-cell'>{item.categoria?.nome}</td>
                <td className='table-cell'>{item.tipo}</td>
                <td className='table-cell'>{item.status}</td>
                <td className='table-cell text-muted'>
                  {item.observacao || "-"}
                </td>
                <td
                  className={`table-cell text-right font-semibold ${
                    item.tipo === "RECEITA" ? "text-brand" : "text-danger"
                  }`}
                >
                  {money(item.valor)}
                </td>
              </tr>
            ))}

            {/* 🔥 RESUMO FINAL */}
            <tr className='bg-black/20'>
              <td className='table-cell font-semibold' colSpan={6}>
                Receitas
              </td>
              <td className='table-cell text-right font-semibold text-brand'>
                {money(receitas)}
              </td>
            </tr>

            <tr className='bg-black/20'>
              <td className='table-cell font-semibold' colSpan={6}>
                Despesas
              </td>
              <td className='table-cell text-right font-semibold text-danger'>
                {money(despesas)}
              </td>
            </tr>

            <tr className='bg-black/30'>
              <td className='table-cell font-semibold' colSpan={6}>
                Total
              </td>
              <td
                className={`table-cell text-right font-bold ${
                  total >= 0 ? "text-brand" : "text-danger"
                }`}
              >
                {money(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
