import { Check, ChevronDown, FileDown, Search, X } from "lucide-react";
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

const normalizar = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const escapar = (texto) =>
  String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Abre o relatorio agrupado por categoria numa janela propria, em fundo branco,
// e chama a impressao (o usuario escolhe "Salvar como PDF").
function imprimirPorCategoria({ itens, periodo, filtros, receitas, despesas, total }) {
  const grupos = new Map();
  for (const item of itens) {
    const nome = item.categoria?.nome || "Sem categoria";
    if (!grupos.has(nome)) grupos.set(nome, []);
    grupos.get(nome).push(item);
  }
  const secoes = [...grupos.entries()]
    .map(([nome, lista]) => {
      const rec = lista.filter((i) => i.tipo === "RECEITA").reduce((s, i) => s + Number(i.valor), 0);
      const desp = lista.filter((i) => i.tipo === "DESPESA").reduce((s, i) => s + Number(i.valor), 0);
      return { nome, lista, liquido: rec - desp };
    })
    .sort((a, b) => Math.abs(b.liquido) - Math.abs(a.liquido));
  const base = secoes.reduce((s, g) => s + Math.abs(g.liquido), 0) || 1;
  const classe = (v) => (v >= 0 ? "rec" : "desp");

  const resumo = secoes
    .map(
      (g) => `<tr><td>${escapar(g.nome)}</td><td class="num">${g.lista.length}</td>
        <td class="num ${classe(g.liquido)}">${money(Math.abs(g.liquido))}</td>
        <td class="num">${((Math.abs(g.liquido) / base) * 100).toFixed(1).replace(".", ",")}%</td></tr>`,
    )
    .join("");
  const detalhes = secoes
    .map(
      (g) => `<section><h3>${escapar(g.nome)} <span>${g.lista.length} lançamento(s)</span></h3>
      <table><thead><tr><th>Data</th><th>Descrição</th><th>Status</th><th>Obs</th><th class="num">Valor</th></tr></thead><tbody>
      ${g.lista
        .map(
          (i) => `<tr class="${i.contabiliza === false ? "nc" : ""}"><td>${dateBR(i.data)}</td><td>${escapar(i.descricao)}</td>
            <td>${i.status === "PAGO" ? "Pago" : "Pendente"}</td><td>${escapar(i.observacao || "")}</td>
            <td class="num ${i.tipo === "RECEITA" ? "rec" : "desp"}">${money(i.valor)}</td></tr>`,
        )
        .join("")}
      </tbody><tfoot><tr><td colspan="4">Subtotal</td><td class="num ${classe(g.liquido)}">${money(Math.abs(g.liquido))}</td></tr></tfoot></table></section>`,
    )
    .join("");

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório por categoria - ${escapar(periodo)}</title>
  <style>
    *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;margin:24px;font-size:12px}
    h1{font-size:20px;margin:0} .sub{color:#6b7280;margin:4px 0 16px}
    h2{font-size:14px;margin:20px 0 8px;border-bottom:2px solid #1f2937;padding-bottom:4px}
    h3{font-size:13px;margin:16px 0 6px;background:#eef2f7;padding:6px 8px;border-radius:4px} h3 span{font-weight:normal;color:#6b7280;font-size:11px}
    table{width:100%;border-collapse:collapse} th,td{padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top}
    th{font-size:11px;color:#6b7280;text-transform:uppercase} .num{text-align:right;white-space:nowrap}
    .rec{color:#047857} .desp{color:#b91c1c} tfoot td{font-weight:bold;border-bottom:none}
    tr.nc td{color:#9ca3af} .totais{margin-top:20px;max-width:320px;margin-left:auto} .totais td{font-size:13px}
    .totais tr:last-child td{font-weight:bold;border-top:2px solid #1f2937}
    .nota{color:#6b7280;font-size:10px;margin-top:6px;text-align:right}
    section{break-inside:avoid-page} thead{display:table-header-group}
    @page{margin:14mm}
  </style></head><body>
  <h1>Relatório por categoria</h1>
  <p class="sub">${escapar(periodo)}${filtros ? " · " + escapar(filtros) : ""}</p>
  <h2>Resumo</h2>
  <table><thead><tr><th>Categoria</th><th class="num">Qtd</th><th class="num">Total</th><th class="num">%</th></tr></thead><tbody>${resumo}</tbody></table>
  <h2>Lançamentos por categoria</h2>
  ${detalhes || "<p>Nenhum lançamento no filtro.</p>"}
  <table class="totais"><tbody>
    <tr><td>Receitas</td><td class="num rec">${money(receitas)}</td></tr>
    <tr><td>Despesas</td><td class="num desp">${money(despesas)}</td></tr>
    <tr><td>Total</td><td class="num ${classe(total)}">${money(total)}</td></tr>
  </tbody></table>
  <p class="nota">Totais finais consideram só lançamentos pagos e contabilizados (em cinza: não contabiliza).</p>
  <script>window.onload=function(){window.print()}</script>
  </body></html>`;

  const janela = window.open("", "_blank");
  if (!janela) return false;
  janela.document.open();
  janela.document.write(html);
  janela.document.close();
  return true;
}

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
  const [busca, setBusca] = useState("");
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
    const termo = normalizar(busca.trim());
    return lancamentos
      .filter(
        (item) =>
          dentroDoIntervalo(item, mesInicio, mesFim, ano) &&
          (!categoriaIds.length || categoriaIds.includes(String(item.categoriaId))) &&
          (!tipo || item.tipo === tipo) &&
          (!status || item.status === status) &&
          (!termo || normalizar(item.descricao).includes(termo)),
      )
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [lancamentos, mesInicio, mesFim, ano, categoriaIds, tipo, status, busca]);

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

  const gerarPdf = () => {
    const periodo =
      Number(mesInicio) === Number(mesFim)
        ? `${monthNames[mesInicio - 1]} / ${ano}`
        : `${monthNames[mesInicio - 1]} a ${monthNames[mesFim - 1]} / ${ano}`;
    const filtros = [
      tipo === "DESPESA" ? "Despesas" : tipo === "RECEITA" ? "Receitas" : "",
      status === "PAGO" ? "Pagos" : status === "PENDENTE" ? "Pendentes" : "",
      categoriaIds.length ? categoriaLabel : "",
      busca.trim() ? `Busca: "${busca.trim()}"` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    if (!imprimirPorCategoria({ itens: filtered, periodo, filtros, receitas, despesas, total })) {
      setError("O navegador bloqueou a janela do relatório. Permita pop-ups para este site.");
    }
  };

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

      <div className='mt-4 flex flex-col gap-2 sm:flex-row sm:items-center'>
        <label className='relative flex-1'>
          <Search size={16} className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted' />
          <input
            className='field w-full pl-9'
            type='search'
            placeholder='Buscar por descrição'
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>
        <button type='button' className='btn whitespace-nowrap' onClick={gerarPdf} disabled={!filtered.length}>
          <FileDown size={16} />
          PDF por categoria
        </button>
      </div>

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
