import { Check, ChevronDown, FileDown, Pencil, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, dateBR, lerValor, money } from "../api.js";
import EditarLancamentoModal from "../components/EditarLancamentoModal.jsx";
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
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
  const base = secoes.reduce((s, g) => s + Math.abs(g.liquido), 0) || 1;
  const classe = (v) => (v >= 0 ? "rec" : "desp");

  const resumo = secoes
    .map(
      (g) => `<tr><td>${escapar(g.nome)}</td><td class="num">${g.lista.length}</td>
        <td class="num ${classe(g.liquido)}">${money(Math.abs(g.liquido))}</td>
        <td class="num">${((Math.abs(g.liquido) / base) * 100).toFixed(1).replace(".", ",")}%</td></tr>`,
    )
    .join("");
  const colunas = `<colgroup><col style="width:13%"><col style="width:37%"><col style="width:13%"><col style="width:22%"><col style="width:15%"></colgroup>`;
  const detalhes = secoes
    .map(
      (g) => `<section class="cat">
      <div class="cat-topo"><strong>${escapar(g.nome)}</strong><span>${g.lista.length} lançamento(s)</span>
        <b class="${classe(g.liquido)}">${money(Math.abs(g.liquido))}</b></div>
      <table>${colunas}<thead><tr><th>Data</th><th>Descrição</th><th>Status</th><th>Obs</th><th class="num">Valor</th></tr></thead><tbody>
      ${g.lista
        .map(
          (i) => `<tr class="${i.contabiliza === false ? "nc" : ""}"><td>${dateBR(i.data)}</td><td>${escapar(i.descricao)}</td>
            <td><span class="st ${i.status === "PAGO" ? "pago" : "pend"}">${i.status === "PAGO" ? "Pago" : "Pendente"}</span></td>
            <td>${escapar(i.observacao || "")}</td>
            <td class="num ${i.tipo === "RECEITA" ? "rec" : "desp"}">${money(i.valor)}</td></tr>`,
        )
        .join("")}
      </tbody></table></section>`,
    )
    .join("");

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório por categoria - ${escapar(periodo)}</title>
  <style>
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;margin:24px;font-size:11.5px;text-transform:uppercase}
    .capa{text-align:center;background:linear-gradient(135deg,#0f2a5c,#1d4ed8);color:#fff;border-radius:10px;padding:18px 12px;margin-bottom:18px}
    .capa h1{font-size:22px;margin:0;letter-spacing:.04em} .capa p{margin:6px 0 0;font-size:13px;opacity:.9}
    h2{font-size:13px;margin:22px 0 8px;color:#0f2a5c;letter-spacing:.06em}
    table{width:100%;border-collapse:collapse;table-layout:fixed}
    th,td{padding:5px 8px;text-align:left;vertical-align:top;overflow-wrap:anywhere}
    th{font-size:10px;color:#475569;background:#e2e8f0;letter-spacing:.05em}
    tbody tr:nth-child(even) td{background:#f8fafc}
    .num{text-align:right;white-space:nowrap}
    .rec{color:#047857} .desp{color:#b91c1c}
    tr.nc td{color:#94a3b8}
    .resumo{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
    .cat{margin-top:14px;border:1px solid #dbe3ef;border-radius:8px;overflow:hidden;break-inside:avoid-page}
    .cat-topo{display:flex;align-items:baseline;gap:10px;padding:8px 12px;background:#dbeafe;border-left:5px solid #1d4ed8}
    .cat-topo strong{font-size:13px;color:#0f2a5c} .cat-topo span{color:#64748b;font-size:10px;flex:1} .cat-topo b{font-size:13px}
    .st{display:inline-block;padding:1px 7px;border-radius:999px;font-size:9.5px;font-weight:bold}
    .st.pago{background:#dcfce7;color:#166534} .st.pend{background:#fef3c7;color:#92400e}
    .totais{margin:22px 0 0 auto;max-width:340px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
    .totais td{font-size:13px;padding:7px 12px} .totais tr:last-child td{font-weight:bold;background:#0f2a5c;color:#fff}
    .nota{color:#64748b;font-size:9.5px;margin-top:6px;text-align:right;text-transform:none}
    thead{display:table-header-group}
    @page{margin:12mm}
  </style></head><body>
  <header class="capa"><h1>Relatório por categoria</h1><p>${escapar(periodo)}${filtros ? " · " + escapar(filtros) : ""}</p></header>
  <h2>Resumo</h2>
  <div class="resumo"><table><colgroup><col style="width:55%"><col style="width:10%"><col style="width:20%"><col style="width:15%"></colgroup>
  <thead><tr><th>Categoria</th><th class="num">Qtd</th><th class="num">Total</th><th class="num">%</th></tr></thead><tbody>${resumo}</tbody></table></div>
  <h2>Lançamentos por categoria</h2>
  ${detalhes || "<p>Nenhum lançamento no filtro.</p>"}
  <table class="totais"><tbody>
    <tr><td>Receitas</td><td class="num rec">${money(receitas)}</td></tr>
    <tr><td>Despesas</td><td class="num desp">${money(despesas)}</td></tr>
    <tr><td>Total</td><td class="num">${money(total)}</td></tr>
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
  const [editando, setEditando] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [success, setSuccess] = useState("");
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
  }, [mesInicio, mesFim, ano, tipo, status, recarga]);

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

  const salvarEdicao = async (dados) => {
    setError("");
    setSuccess("");
    if (!dados.categoriaId) {
      setError("Escolha uma categoria antes de salvar o lançamento.");
      return false;
    }
    const valor = lerValor(dados.valor);
    if (!dados.valor || !Number.isFinite(valor) || valor < 0) {
      setError("Informe um valor válido.");
      return false;
    }
    try {
      const payload = { ...dados, categoriaId: Number(dados.categoriaId), valor };
      if (editando.simulado) {
        const data = new Date(editando.data);
        await api.lancamentos.materializarRecorrente({
          recorrenteId: editando.recorrenteId,
          mes: data.getUTCMonth() + 1,
          ano: data.getUTCFullYear(),
          ...payload,
        });
      } else {
        await api.lancamentos.atualizar(editando.id, payload);
      }
      setRecarga((n) => n + 1);
      setSuccess("Lançamento atualizado.");
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

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

      <Notice error={error} success={success} />

      <div className='mt-4 flex flex-col gap-2 sm:flex-row sm:items-center'>
        <input
          className='field w-full flex-1'
          type='search'
          placeholder='Buscar por descrição'
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
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
              <th className='table-cell w-14' aria-label='Ações' />
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
                <td className='table-cell text-right'>
                  <button
                    className='btn-secondary h-8 w-8 p-0'
                    type='button'
                    onClick={() => setEditando(item)}
                    title='Editar lançamento'
                    aria-label='Editar lançamento'
                  >
                    <Pencil size={14} />
                  </button>
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
              <td className='table-cell' />
            </tr>

            <tr className='bg-black/20'>
              <td className='table-cell font-semibold' colSpan={7}>
                Despesas
              </td>
              <td className='table-cell text-right font-semibold text-danger'>
                {money(despesas)}
              </td>
              <td className='table-cell' />
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
              <td className='table-cell' />
            </tr>
          </tbody>
        </table>
      </div>

      {editando && (
        <EditarLancamentoModal
          item={editando}
          categorias={categorias}
          onSalvar={salvarEdicao}
          onFechar={() => setEditando(null)}
        />
      )}
    </section>
  );
}
