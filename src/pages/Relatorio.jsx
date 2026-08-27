import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, dateBR, money } from "../api.js";
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

const SUPERMERCADO_CATEGORIA_ID = 3;

function dentroDoIntervalo(item, mesInicio, mesFim, ano) {
  const date = new Date(item.data);
  if (Number.isNaN(date.getTime())) return false;

  const itemAno = date.getUTCFullYear();
  const itemMes = date.getUTCMonth() + 1;

  return itemAno === Number(ano) && itemMes >= Number(mesInicio) && itemMes <= Number(mesFim);
}

export default function Relatorio() {
  const today = new Date();
  const [mesInicio, setMesInicio] = useState(today.getMonth() + 1);
  const [mesFim, setMesFim] = useState(today.getMonth() + 1);
  const [ano, setAno] = useState(today.getFullYear());
  const [categoriaIds, setCategoriaIds] = useState([]);
  const [categoriaAberto, setCategoriaAberto] = useState(false);
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [error, setError] = useState("");
  const categoriaRef = useRef(null);

  useEffect(() => {
    let ativo = true;
    setError("");
    const inicio = Number(mesInicio);
    const fim = Number(mesFim);

    if (inicio > fim) {
      setLancamentos([]);
      setError("O mês inicial precisa ser menor ou igual ao mês final.");
      return;
    }

    const meses = Array.from({ length: fim - inicio + 1 }, (_, index) => inicio + index);

    Promise.all([
      api.categorias.listar(),
      Promise.all(meses.map((mes) => api.lancamentos.listar(mes, ano, { tipo, status }))),
    ])
      .then(([cats, itensPorMes]) => {
        if (!ativo) return;
        setCategorias(cats);
        setLancamentos(itensPorMes.flat());
      })
      .catch((err) => {
        if (ativo) setError(err.message);
      });

    return () => {
      ativo = false;
    };
  }, [mesInicio, mesFim, ano, tipo, status]);

  useEffect(() => {
    const fecharClique = (event) => {
      if (categoriaRef.current && !categoriaRef.current.contains(event.target)) {
        setCategoriaAberto(false);
      }
    };

    const fecharTecla = (event) => {
      if (event.key === "Escape") setCategoriaAberto(false);
    };

    document.addEventListener("mousedown", fecharClique);
    document.addEventListener("keydown", fecharTecla);
    return () => {
      document.removeEventListener("mousedown", fecharClique);
      document.removeEventListener("keydown", fecharTecla);
    };
  }, []);

  const toggleCategoria = (id) => {
    const valor = String(id);
    setCategoriaIds((atual) =>
      atual.includes(valor) ? atual.filter((item) => item !== valor) : [...atual, valor],
    );
  };

  const categoriaLabel = useMemo(() => {
    if (!categoriaIds.length) return "Todas as categorias";
    if (categoriaIds.length === 1) {
      return categorias.find((cat) => String(cat.id) === categoriaIds[0])?.nome || "1 categoria";
    }
    return `${categoriaIds.length} categorias`;
  }, [categoriaIds, categorias]);

  const filtered = useMemo(() => {
    return lancamentos
      .filter(
        (item) =>
          dentroDoIntervalo(item, mesInicio, mesFim, ano) &&
          (!categoriaIds.length || categoriaIds.includes(String(item.categoriaId))) &&
          (!tipo || item.tipo === tipo) &&
          (!status || item.status === status),
      )
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [lancamentos, mesInicio, mesFim, ano, categoriaIds, tipo, status]);

  const { receitas, despesas, total } = useMemo(() => {
    const supermercadoSelecionado =
      categoriaIds.length === 1 && String(categoriaIds[0]) === String(SUPERMERCADO_CATEGORIA_ID);
    const validos = filtered.filter(
      (item) =>
        item.status !== "PENDENTE" &&
        (item.contabiliza !== false || supermercadoSelecionado),
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
  }, [filtered, categoriaIds]);

  return (
    <section>
      <PageTitle
        title='Relatório'
        actions={
          <div className='grid gap-2 sm:grid-cols-[150px_150px_110px_180px_180px_220px]'>
            <select
              className='field'
              value={mesInicio}
              onChange={(e) => setMesInicio(Number(e.target.value))}
            >
              {monthNames.map((name, index) => (
                <option key={name} value={index + 1}>
                  De {name}
                </option>
              ))}
            </select>

            <select
              className='field'
              value={mesFim}
              onChange={(e) => setMesFim(Number(e.target.value))}
            >
              {monthNames.map((name, index) => (
                <option key={name} value={index + 1}>
                  Até {name}
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
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value=''>Receitas e despesas</option>
              <option value='DESPESA'>Despesas</option>
              <option value='RECEITA'>Receitas</option>
            </select>

            <select
              className='field'
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value=''>Pagos e pendentes</option>
              <option value='PAGO'>Pagos</option>
              <option value='PENDENTE'>Pendentes</option>
            </select>

            <div className='relative' ref={categoriaRef}>
              <button
                type='button'
                className='field flex items-center justify-between gap-2 text-left'
                onClick={() => setCategoriaAberto((aberto) => !aberto)}
                aria-expanded={categoriaAberto}
                aria-haspopup='listbox'
              >
                <span className='truncate'>{categoriaLabel}</span>
                <ChevronDown size={16} className='shrink-0 text-muted' />
              </button>

              {categoriaAberto && (
                <div className='absolute right-0 z-20 mt-1 max-h-72 w-72 overflow-y-auto rounded-md border border-line bg-panel p-2 shadow-lg shadow-black/40'>
                  <label className='flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-black/20'>
                    <input
                      type='checkbox'
                      checked={!categoriaIds.length}
                      onChange={() => setCategoriaIds([])}
                    />
                    Todas as categorias
                  </label>

                  {categorias.map((cat) => {
                    const selecionada = categoriaIds.includes(String(cat.id));
                    return (
                      <label
                        key={cat.id}
                        className='flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-black/20'
                      >
                        <input
                          type='checkbox'
                          checked={selecionada}
                          onChange={() => toggleCategoria(cat.id)}
                        />
                        <span className='truncate'>{cat.nome}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
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
              <th className='table-cell w-20 text-center'>CONT.</th>
              <th className='table-cell text-right'>Valor</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className='table-cell'>{dateBR(item.data)}</td>
                <td className='table-cell'>{item.descricao}</td>
                <td className='table-cell'>{item.categoria?.nome}</td>
                <td className='table-cell'>{item.tipo}</td>
                <td className='table-cell'>{item.status}</td>
                <td className='table-cell text-muted'>
                  {item.observacao || "-"}
                </td>
                <td className='table-cell text-center'>
                  {item.contabiliza !== false ? (
                    <Check className='mx-auto text-green-400' size={18} aria-label='Contabiliza' />
                  ) : (
                    <X className='mx-auto text-red-500' size={18} aria-label='Não contabiliza' />
                  )}
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

            <tr className='bg-black/20'>
              <td className='table-cell font-semibold' colSpan={7}>
                Receitas
              </td>
              <td className='table-cell text-right font-semibold text-brand'>
                {money(receitas)}
              </td>
            </tr>

            <tr className='bg-black/20'>
              <td className='table-cell font-semibold' colSpan={7}>
                Despesas
              </td>
              <td className='table-cell text-right font-semibold text-danger'>
                {money(despesas)}
              </td>
            </tr>

            <tr className='bg-black/30'>
              <td className='table-cell font-semibold' colSpan={7}>
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
