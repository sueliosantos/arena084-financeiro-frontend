import { Check, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, dateInput, lerValor, money, valorDigitado } from "../api.js";
import LancamentoVoz from "../components/LancamentoVoz.jsx";
import Notice from "../components/Notice.jsx";
import PageTitle from "../components/PageTitle.jsx";

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const initialForm = {
  tipo: "DESPESA",
  valor: "",
  descricao: "",
  observacao: "",
  data: dateInput(new Date()),
  status: "PAGO",
  categoriaId: "",
  contabiliza: true
};

export default function Lancamentos() {
  const today = new Date();
  const [mes, setMes] = useState(today.getMonth() + 1);
  const [ano, setAno] = useState(today.getFullYear());
  const [categorias, setCategorias] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState(initialForm);
  const [mensagem, setMensagem] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const carregar = async () => {
    const [cats, itens] = await Promise.all([api.categorias.listar(), api.lancamentos.listar(mes, ano)]);
    setCategorias(cats);
    setLancamentos(itens);
  };

  useEffect(() => {
    setError("");
    carregar().catch((err) => setError(err.message));
  }, [mes, ano]);

  const totals = useMemo(
    () =>
      lancamentos.reduce(
        (acc, item) => {
          if (item.contabiliza === false) return acc;
          if (item.tipo === "RECEITA") acc.receitas += Number(item.valor);
          if (item.tipo === "DESPESA") acc.despesas += Number(item.valor);
          return { ...acc, saldo: acc.receitas - acc.despesas };
        },
        { receitas: 0, despesas: 0, saldo: 0 }
      ),
    [lancamentos]
  );

  const lancamentosOrdenados = useMemo(
    () =>
      [...lancamentos].sort((a, b) => {
        const porData = timestamp(b.data) - timestamp(a.data);
        if (porData !== 0) return porData;
        const porCriacao = timestamp(b.criadoEm) - timestamp(a.criadoEm);
        if (porCriacao !== 0) return porCriacao;
        const idA = Number(a.id);
        const idB = Number(b.id);
        if (Number.isFinite(idA) && Number.isFinite(idB)) return idB - idA;
        if (Number.isFinite(idA) !== Number.isFinite(idB)) return Number.isFinite(idB) ? 1 : -1;
        return 0;
      }),
    [lancamentos]
  );

  const salvar = async (dados, item) => {
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
      if (item?.simulado) {
        await api.lancamentos.materializarRecorrente({ recorrenteId: item.recorrenteId, mes, ano, ...payload });
      } else if (item) {
        await api.lancamentos.atualizar(item.id, payload);
      } else {
        await api.lancamentos.criar(payload);
      }
      await carregar();
      setSuccess(item ? "Lançamento atualizado." : "Lançamento cadastrado.");
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (await salvar(form)) setForm(initialForm);
  };

  const salvarEdicao = async (event) => {
    event.preventDefault();
    if (await salvar(editForm, editingItem)) cancelarEdicao();
  };

  const submitWhatsApp = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.lancamentos.criar({ mensagem });
      setMensagem("");
      await carregar();
      setSuccess("Mensagem importada.");
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleStatus = async (item) => {
    const status = item.status === "PAGO" ? "PENDENTE" : "PAGO";
    if (item.simulado) {
      await api.lancamentos.materializarRecorrente({ recorrenteId: item.recorrenteId, mes, ano, status, observacao: item.observacao, contabiliza: item.contabiliza !== false });
    } else {
      await api.lancamentos.atualizar(item.id, { status });
    }
    await carregar();
  };

  const editar = (item) => {
    setError("");
    setSuccess("");
    setEditingItem(item);
    setEditForm({
      tipo: item.tipo,
      valor: String(item.valor ?? ""),
      descricao: item.descricao || "",
      observacao: item.observacao || "",
      data: dateInput(item.data),
      status: item.status,
      categoriaId: item.categoriaId ? String(item.categoriaId) : "",
      contabiliza: item.contabiliza !== false
    });
  };

  const cancelarEdicao = () => {
    setEditingItem(null);
    setEditForm(initialForm);
  };

  const remover = async (item) => {
    if (item.simulado) return;
    if (!window.confirm(`Excluir o lançamento "${item.descricao}"?`)) return;

    setError("");
    setSuccess("");
    try {
      await api.lancamentos.remover(item.id);
      await carregar();
      setSuccess("Lançamento excluído.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section>
      <PageTitle
        title="Lançamentos"
        actions={
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <select className="field w-full sm:w-48" value={mes} onChange={(event) => setMes(event.target.value)}>
              {monthNames.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name} / {ano}
                </option>
              ))}
            </select>
            <input className="field w-full sm:w-32" type="number" value={ano} onChange={(event) => setAno(event.target.value)} />
          </div>
        }
      />
      <Notice error={error} success={success} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <form className="panel space-y-3" onSubmit={submit}>
            <h2 className="font-semibold">Novo lançamento</h2>
            <LancamentoVoz
              categorias={categorias}
              onSalvo={async () => {
                await carregar();
                setSuccess("Lançamento por voz cadastrado.");
              }}
            />
            <CamposLancamento valores={form} onChange={setForm} categorias={categorias} />
            <button className="btn w-full" type="submit">
              <Plus size={16} />
              Adicionar
            </button>
          </form>

          <form className="panel space-y-3" onSubmit={submitWhatsApp}>
            <input className="field" placeholder="+2000 salário ou -50 mercado" value={mensagem} onChange={(event) => setMensagem(event.target.value)} />
            <button className="btn-secondary w-full" type="submit">
              Importar WhatsApp
            </button>
          </form>
        </div>

        <div className="panel overflow-hidden p-0">
          <div className="grid gap-2 border-b border-line p-3 md:grid-cols-3">
            <Summary label="Receitas" value={totals.receitas} />
            <Summary label="Despesas" value={totals.despesas} />
            <Summary label="Saldo" value={totals.saldo} />
          </div>
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="min-w-[640px] w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-24" />
                <col />
                <col className="w-24" />
                <col className="w-36" />
                <col className="w-28" />
                <col className="w-32" />
              </colgroup>
              <thead className="bg-black/20">
                <tr>
                  <th className="table-cell">Data</th>
                  <th className="table-cell">Descrição</th>
                  <th className="table-cell">Obs</th>
                  <th className="table-cell">Categoria</th>
                  <th className="table-cell text-right">Valor</th>
                  <th className="table-cell text-right">A&ccedil;&otilde;es</th>
                </tr>
              </thead>
              <tbody>
                {lancamentosOrdenados.map((item) => (
                  <tr key={item.id}>
                    <td className="table-cell whitespace-nowrap">{formatarData(item.data)}</td>
                    <td className="table-cell truncate" title={item.descricao}>{item.descricao}</td>
                    <td className="table-cell truncate text-muted" title={item.observacao || ""}>{item.observacao || "-"}</td>
                    <td className="table-cell truncate" title={item.categoria?.nome}>{item.categoria?.nome}</td>
                    <td className={`table-cell text-right font-semibold ${item.tipo === "RECEITA" ? "text-brand" : "text-danger"}`}>{money(item.valor)}</td>
                    <td className="table-cell">
                      <div className="flex justify-end gap-1">
                        <button
                          className={`btn-secondary h-8 w-8 shrink-0 p-0 ${item.status === "PAGO" ? "!border-green-500 !bg-green-600/25 !text-green-400" : "opacity-60"}`}
                          type="button"
                          onClick={() => toggleStatus(item)}
                          title={item.status === "PAGO" ? "Pago — marcar como pendente" : "Pendente — marcar como pago"}
                          aria-label={item.status === "PAGO" ? "Pago, marcar como pendente" : "Pendente, marcar como pago"}
                          aria-pressed={item.status === "PAGO"}
                        >
                          <Check size={14} />
                        </button>
                        <button className="btn-secondary h-8 w-8 p-0" type="button" onClick={() => editar(item)} title="Editar lançamento" aria-label="Editar lançamento">
                          <Pencil size={14} />
                        </button>
                        <button className="btn-danger h-8 w-8 p-0" type="button" disabled={item.simulado} onClick={() => remover(item)} title="Excluir" aria-label="Excluir">
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
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={cancelarEdicao}>
          <form className="panel max-h-full w-full max-w-lg space-y-3 overflow-y-auto" onSubmit={salvarEdicao} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">Editar lançamento</h2>
                <p className="truncate text-sm text-muted">{editingItem.descricao}</p>
              </div>
              <button className="btn-secondary h-8 w-8 shrink-0 p-0" type="button" onClick={cancelarEdicao} title="Fechar" aria-label="Fechar">
                <X size={16} />
              </button>
            </div>
            <CamposLancamento valores={editForm} onChange={setEditForm} categorias={categorias} />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={cancelarEdicao}>
                Cancelar
              </button>
              <button className="btn" type="submit">
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

function CamposLancamento({ valores, onChange, categorias }) {
  const set = (campo, valor) => onChange({ ...valores, [campo]: valor });
  const filtradas = categorias.filter((cat) => cat.tipo === valores.tipo);

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <select className="field" value={valores.tipo} onChange={(event) => onChange({ ...valores, tipo: event.target.value, categoriaId: "" })}>
          <option value="DESPESA">Despesa</option>
          <option value="RECEITA">Receita</option>
        </select>
        <select className="field" value={valores.status} onChange={(event) => set("status", event.target.value)}>
          <option value="PENDENTE">Pendente</option>
          <option value="PAGO">Pago</option>
        </select>
      </div>
      <input className="field" placeholder="Descrição" value={valores.descricao} onChange={(event) => set("descricao", event.target.value)} />
      <input className="field" placeholder="Observação" value={valores.observacao} onChange={(event) => set("observacao", event.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <input className="field" type="text" inputMode="decimal" placeholder="Valor" value={valores.valor} onChange={(event) => set("valor", valorDigitado(event.target.value))} />
        <input className="field" type="date" value={valores.data} onChange={(event) => set("data", event.target.value)} />
      </div>
      <select className="field" value={valores.categoriaId} onChange={(event) => set("categoriaId", event.target.value)}>
        <option value="">Categoria</option>
        {filtradas.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.nome}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={valores.contabiliza} onChange={(event) => set("contabiliza", event.target.checked)} />
        Contabiliza nos totais e gráficos
      </label>
    </>
  );
}

function Summary({ label, value }) {
  return (
    <div>
      <span className="text-xs uppercase text-muted">{label}</span>
      <strong className="block text-lg">{money(value)}</strong>
    </div>
  );
}

function formatarData(data) {
  const [ano, mes, dia] = dateInput(data).split("-");
  return `${dia}/${mes}/${ano}`;
}

function timestamp(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}
