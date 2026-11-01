import { FileDown, FileUp, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, dateBR, dateInput, lerValor, money, valorDigitado } from "../api.js";
import Notice from "../components/Notice.jsx";
import PageTitle from "../components/PageTitle.jsx";

const TODOS = "TODOS";

const formVazio = () => ({
  data: dateInput(new Date()),
  ativo: "",
  quantidade: "",
  valorCompra: "",
  valorVenda: "",
  tipo: "FII",
  observacao: ""
});

const formDaVenda = (venda) => ({
  data: dateInput(venda.data),
  ativo: venda.ativo,
  quantidade: String(Number(venda.quantidade)),
  valorCompra: String(Number(venda.valorCompra)),
  valorVenda: String(Number(venda.valorVenda)),
  tipo: venda.tipo,
  observacao: venda.observacao || ""
});

// Totais e lucro nao sao gravados: sempre quantidade x preco.
const calcular = (venda) => {
  const quantidade = Number(venda.quantidade) || 0;
  const totalCompra = quantidade * (Number(venda.valorCompra) || 0);
  const totalVenda = quantidade * (Number(venda.valorVenda) || 0);
  return { totalCompra, totalVenda, resultado: totalVenda - totalCompra };
};

const normalizar = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();

// Decimal do Prisma chega como string.
const numero = (valor) => Number(valor || 0);

const tonResultado = (valor) => (valor > 0 ? "text-ok" : valor < 0 ? "text-danger" : "text-muted");

export default function VendasAtivos({ ano }) {
  const [vendas, setVendas] = useState([]);
  const [anoFiltro, setAnoFiltro] = useState(TODOS);
  const [tipo, setTipo] = useState("");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const arquivoRef = useRef(null);

  const carregar = async () => setVendas(await api.vendasAtivos.listar());

  useEffect(() => {
    carregar().catch((err) => setError(err.message));
  }, []);

  const anos = useMemo(() => {
    const lista = new Set(vendas.map((v) => new Date(v.data).getUTCFullYear()));
    lista.add(Number(ano));
    return [...lista].sort((a, b) => b - a);
  }, [vendas, ano]);

  const tipos = useMemo(() => [...new Set(vendas.map((v) => v.tipo))].sort(), [vendas]);

  const filtradas = useMemo(() => {
    const termo = normalizar(busca);
    return vendas.filter(
      (v) =>
        (anoFiltro === TODOS || new Date(v.data).getUTCFullYear() === Number(anoFiltro)) &&
        (!tipo || v.tipo === tipo) &&
        (!termo || normalizar(v.ativo).includes(termo))
    );
  }, [vendas, anoFiltro, tipo, busca]);

  const totais = useMemo(
    () =>
      filtradas.reduce(
        (acc, v) => {
          const { totalCompra, totalVenda, resultado } = calcular(v);
          acc.compra += totalCompra;
          acc.venda += totalVenda;
          acc.resultado += resultado;
          if (resultado > 0) acc.lucros += resultado;
          if (resultado < 0) acc.prejuizos += resultado;
          return acc;
        },
        { compra: 0, venda: 0, resultado: 0, lucros: 0, prejuizos: 0 }
      ),
    [filtradas]
  );

  const avisar = (fn) => async (...args) => {
    setError("");
    setSuccess("");
    try {
      return await fn(...args);
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const salvar = avisar(async (dados) => {
    const payload = {
      ...dados,
      quantidade: lerValor(dados.quantidade),
      valorCompra: lerValor(dados.valorCompra),
      valorVenda: lerValor(dados.valorVenda)
    };
    if (editando.id) await api.vendasAtivos.atualizar(editando.id, payload);
    else await api.vendasAtivos.criar(payload);
    await carregar();
    setSuccess(editando.id ? "Venda atualizada." : "Venda cadastrada.");
    return true;
  });

  const remover = avisar(async (venda) => {
    if (!window.confirm(`Excluir a venda de ${venda.ativo} em ${dateBR(venda.data)}?`)) return;
    await api.vendasAtivos.remover(venda.id);
    await carregar();
    setSuccess("Venda excluída.");
  });

  const importar = avisar(async (event) => {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    setOcupado(true);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await arquivo.arrayBuffer());
      const linhas = lerPlanilha(XLSX, workbook);
      if (!linhas.length) throw new Error("Nenhuma venda encontrada. A planilha precisa de um cabeçalho com DATA, ATIVO (ou FII), QTD, VALOR COMPRA, VALOR VENDA e TIPO.");
      if (!window.confirm(`${linhas.length} venda(s) encontrada(s). Importar? Elas serão somadas às já cadastradas.`)) return;
      const { importadas } = await api.vendasAtivos.importar(linhas);
      await carregar();
      setSuccess(`${importadas} venda(s) importada(s).`);
    } finally {
      setOcupado(false);
    }
  });

  const exportar = avisar(async () => {
    setOcupado(true);
    try {
      const XLSX = await import("xlsx");
      const cabecalho = ["DATA", "ATIVO", "QTD", "VALOR COMPRA", "VALOR VENDA", "TOTAL COMPRA", "TOTAL VENDA", "TIPO", "LUCRO/PREJUIZO", "OBS"];
      const linhas = filtradas.map((v) => {
        const { totalCompra, totalVenda, resultado } = calcular(v);
        const d = new Date(v.data);
        return [
          new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
          v.ativo,
          numero(v.quantidade),
          numero(v.valorCompra),
          numero(v.valorVenda),
          totalCompra,
          totalVenda,
          v.tipo,
          resultado,
          v.observacao || ""
        ];
      });
      linhas.push([null, "TOTAL", null, null, null, totais.compra, totais.venda, null, totais.resultado, null]);
      const ws = XLSX.utils.aoa_to_sheet([cabecalho, ...linhas], { cellDates: true, dateNF: "dd/mm/yyyy" });
      ws["!cols"] = [12, 12, 8, 14, 14, 14, 14, 10, 16, 24].map((wch) => ({ wch }));
      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let r = 1; r <= range.e.r; r += 1) {
        for (const c of [3, 4, 5, 6, 8]) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          if (cell && cell.t === "n") cell.z = "#,##0.00";
        }
      }
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, anoFiltro === TODOS ? "VENDAS" : anoFiltro);
      XLSX.writeFile(wb, `VENDAS ATIVOS ${anoFiltro}.xlsx`);
    } finally {
      setOcupado(false);
    }
  });

  return (
    <section className="space-y-5">
      <PageTitle
        title="Vendas de ativos"
        actions={
          <div className="grid grid-cols-3 gap-2 sm:flex">
            <input ref={arquivoRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importar} />
            <button className="btn-secondary" type="button" disabled={ocupado} onClick={() => arquivoRef.current?.click()}>
              <FileUp size={16} />
              Importar<span className="hidden sm:inline"> Excel</span>
            </button>
            <button className="btn-secondary" type="button" disabled={ocupado || !filtradas.length} onClick={exportar}>
              <FileDown size={16} />
              Exportar<span className="hidden sm:inline"> Excel</span>
            </button>
            <button className="btn" type="button" onClick={() => setEditando({})}>
              <Plus size={16} />
              Nova<span className="hidden sm:inline"> venda</span>
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="sem-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1">
          {[TODOS, ...anos.map(String)].map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setAnoFiltro(opcao)}
              className={`h-8 shrink-0 rounded-xl px-3.5 text-xs font-semibold transition ${
                anoFiltro === opcao ? "bg-white text-zinc-950" : "text-muted hover:bg-white/[0.06] hover:text-ink"
              }`}
            >
              {opcao}
            </button>
          ))}
        </div>
        <select className="field md:w-44" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          {tipos.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input className="field md:flex-1" type="search" placeholder="Buscar ativo" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <Notice error={error} success={success} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao label="Total comprado" valor={totais.compra} />
        <Cartao label="Total vendido" valor={totais.venda} />
        <Cartao label="Lucros" valor={totais.lucros} tom="text-ok" />
        <Cartao label="Prejuízos" valor={totais.prejuizos} tom="text-danger" />
      </div>

      <div className="panel relative overflow-hidden">
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${totais.resultado >= 0 ? "bg-emerald-400/60" : "bg-red-400/60"}`} />
        <p className="text-[11px] font-semibold tracking-wider text-muted">
          Resultado líquido {anoFiltro === TODOS ? "(todos os anos)" : anoFiltro} · {filtradas.length} venda(s)
        </p>
        <strong className={`mt-2 block text-4xl font-extrabold tracking-tight ${tonResultado(totais.resultado)}`}>{money(totais.resultado)}</strong>
      </div>

      <div className="panel overflow-x-auto p-0">
        <table className="w-full min-w-[980px] border-collapse">
          <thead>
            <tr>
              <th className="table-cell">Data</th>
              <th className="table-cell">Ativo</th>
              <th className="table-cell text-right">Qtd</th>
              <th className="table-cell text-right">Valor compra</th>
              <th className="table-cell text-right">Valor venda</th>
              <th className="table-cell text-right">Total compra</th>
              <th className="table-cell text-right">Total venda</th>
              <th className="table-cell">Tipo</th>
              <th className="table-cell text-right">Lucro/Prejuízo</th>
              <th className="table-cell">Obs</th>
              <th className="table-cell w-24" aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {filtradas.map((v) => {
              const { totalCompra, totalVenda, resultado } = calcular(v);
              return (
                <tr key={v.id}>
                  <td className="table-cell text-muted">{dateBR(v.data)}</td>
                  <td className="table-cell font-semibold">{v.ativo}</td>
                  <td className="table-cell text-right">{numero(v.quantidade).toLocaleString("pt-BR")}</td>
                  <td className="table-cell text-right">{money(v.valorCompra)}</td>
                  <td className="table-cell text-right">{money(v.valorVenda)}</td>
                  <td className="table-cell text-right text-muted">{money(totalCompra)}</td>
                  <td className="table-cell text-right text-muted">{money(totalVenda)}</td>
                  <td className="table-cell">
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[11px] font-semibold">{v.tipo}</span>
                  </td>
                  <td className={`table-cell text-right font-semibold ${tonResultado(resultado)}`}>{money(resultado)}</td>
                  <td className="table-cell text-muted">{v.observacao || "-"}</td>
                  <td className="table-cell">
                    <div className="flex justify-end gap-1">
                      <button className="btn-secondary h-8 w-8 p-0" type="button" onClick={() => setEditando(v)} title="Editar venda" aria-label="Editar venda">
                        <Pencil size={14} />
                      </button>
                      <button className="btn-danger h-8 w-8 p-0" type="button" onClick={() => remover(v)} title="Excluir venda" aria-label="Excluir venda">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filtradas.length && (
              <tr>
                <td className="table-cell py-10 text-center text-muted" colSpan={11}>
                  Nenhuma venda no filtro. Use "Importar Excel" ou "Nova venda".
                </td>
              </tr>
            )}
          </tbody>
          {filtradas.length > 0 && (
            <tfoot>
              <tr className="font-semibold">
                <td className="table-cell" colSpan={5}>
                  Total
                </td>
                <td className="table-cell text-right">{money(totais.compra)}</td>
                <td className="table-cell text-right">{money(totais.venda)}</td>
                <td className="table-cell" />
                <td className={`table-cell text-right ${tonResultado(totais.resultado)}`}>{money(totais.resultado)}</td>
                <td className="table-cell" colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {editando && <VendaModal venda={editando} tipos={tipos} onSalvar={salvar} onFechar={() => setEditando(null)} />}
    </section>
  );
}

function Cartao({ label, valor, tom = "text-ink" }) {
  return (
    <div className="panel">
      <p className="text-[11px] font-semibold tracking-wider text-muted">{label}</p>
      <strong className={`mt-2 block text-xl font-bold tracking-tight ${tom}`}>{money(valor)}</strong>
    </div>
  );
}

function VendaModal({ venda, tipos, onSalvar, onFechar }) {
  const [valores, setValores] = useState(() => (venda.id ? formDaVenda(venda) : formVazio()));
  const set = (campo) => (event) => setValores({ ...valores, [campo]: event.target.value });
  const setNumero = (campo) => (event) => setValores({ ...valores, [campo]: valorDigitado(event.target.value) });
  const previa = calcular({
    quantidade: lerValor(valores.quantidade),
    valorCompra: lerValor(valores.valorCompra),
    valorVenda: lerValor(valores.valorVenda)
  });

  const submit = async (event) => {
    event.preventDefault();
    if (await onSalvar(valores)) onFechar();
  };

  return (
    <div className="overlay" onClick={onFechar}>
      <form className="panel max-h-full w-full max-w-lg space-y-3 overflow-y-auto" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{venda.id ? "Editar venda" : "Nova venda"}</h2>
          <button className="btn-secondary h-8 w-8 shrink-0 p-0" type="button" onClick={onFechar} title="Fechar" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input className="field" type="date" value={valores.data} onChange={set("data")} required />
          <input className="field" placeholder="Ativo (ex. HGLG11)" value={valores.ativo} onChange={set("ativo")} required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select className="field" value={valores.tipo} onChange={set("tipo")} required>
            {[...new Set(["FII", "AÇÃO", "ETF", ...tipos, valores.tipo])].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input className="field" inputMode="decimal" placeholder="Quantidade" value={valores.quantidade} onChange={setNumero("quantidade")} required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input className="field" inputMode="decimal" placeholder="Valor compra (unit.)" value={valores.valorCompra} onChange={setNumero("valorCompra")} required />
          <input className="field" inputMode="decimal" placeholder="Valor venda (unit.)" value={valores.valorVenda} onChange={setNumero("valorVenda")} required />
        </div>
        <input className="field" placeholder="Observação" value={valores.observacao} onChange={set("observacao")} />
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm">
          <div>
            <p className="text-[11px] text-muted">Total compra</p>
            <strong>{money(previa.totalCompra)}</strong>
          </div>
          <div>
            <p className="text-[11px] text-muted">Total venda</p>
            <strong>{money(previa.totalVenda)}</strong>
          </div>
          <div>
            <p className="text-[11px] text-muted">Resultado</p>
            <strong className={tonResultado(previa.resultado)}>{money(previa.resultado)}</strong>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={onFechar}>
            Cancelar
          </button>
          <button className="btn" type="submit">
            <Save size={16} />
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}

// Le a primeira aba com cabecalho "DATA" e mapeia as colunas pelo nome (as calculadas sao ignoradas).
function lerPlanilha(XLSX, workbook) {
  const COLUNAS = {
    data: ["DATA"],
    ativo: ["ATIVO", "FII"],
    quantidade: ["QTD", "QUANTIDADE"],
    valorCompra: ["VALOR COMPRA"],
    valorVenda: ["VALOR VENDA"],
    tipo: ["TIPO"],
    observacao: ["OBS", "OBSERVACAO", "COLUNA 1"]
  };

  for (const nome of workbook.SheetNames) {
    const linhas = XLSX.utils.sheet_to_json(workbook.Sheets[nome], { header: 1, raw: true, defval: null });
    const iCabecalho = linhas.findIndex((linha) => linha.some((celula) => normalizar(celula) === "DATA"));
    if (iCabecalho < 0) continue;

    const cabecalho = linhas[iCabecalho].map(normalizar);
    const indice = Object.fromEntries(Object.entries(COLUNAS).map(([campo, nomes]) => [campo, cabecalho.findIndex((c) => nomes.includes(c))]));
    if (["data", "ativo", "quantidade", "valorCompra", "valorVenda"].some((campo) => indice[campo] < 0)) continue;

    const celula = (linha, campo) => (indice[campo] < 0 ? null : linha[indice[campo]]);
    return linhas
      .slice(iCabecalho + 1)
      .filter((linha) => celula(linha, "ativo") && celula(linha, "data"))
      .filter((linha) => normalizar(celula(linha, "ativo")) !== "TOTAL")
      .map((linha) => ({
        data: lerData(XLSX, celula(linha, "data")),
        ativo: String(celula(linha, "ativo")).trim(),
        quantidade: lerNumero(celula(linha, "quantidade")),
        valorCompra: lerNumero(celula(linha, "valorCompra")),
        valorVenda: lerNumero(celula(linha, "valorVenda")),
        tipo: String(celula(linha, "tipo") ?? "").trim() || "OUTRO",
        observacao: celula(linha, "observacao") == null ? "" : String(celula(linha, "observacao")).trim()
      }));
  }
  return [];
}

function lerData(XLSX, valor) {
  const doisDigitos = (n) => String(n).padStart(2, "0");
  if (typeof valor === "number") {
    const { y, m, d } = XLSX.SSF.parse_date_code(valor);
    return `${y}-${doisDigitos(m)}-${doisDigitos(d)}`;
  }
  if (valor instanceof Date) return `${valor.getFullYear()}-${doisDigitos(valor.getMonth() + 1)}-${doisDigitos(valor.getDate())}`;
  const br = String(valor).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return `${br[3]}-${doisDigitos(br[2])}-${doisDigitos(br[1])}`;
  return String(valor).slice(0, 10);
}

function lerNumero(valor) {
  if (typeof valor === "number") return valor;
  const texto = String(valor ?? "").replace(/[^\d,.-]/g, "");
  return Number(texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto);
}
