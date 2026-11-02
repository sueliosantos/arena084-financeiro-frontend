import { CalendarHeart, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, dateBR, dateInput } from "../api.js";
import Notice from "../components/Notice.jsx";
import PageTitle from "../components/PageTitle.jsx";

const formVazio = () => ({ data: dateInput(new Date()), descricao: "", observacao: "" });

const normalizar = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();

// "hoje", "ha 12 dias", "ha 3 meses", "ha 1 ano e 2 meses"
const haQuanto = (valor) => {
  const data = new Date(valor);
  const hoje = new Date();
  const inicio = Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
  const fim = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const dias = Math.round((fim - inicio) / 86400000);
  if (dias === 0) return "hoje";
  if (dias < 0) return dias === -1 ? "amanhã" : `daqui a ${-dias} dias`;
  if (dias === 1) return "ontem";
  if (dias < 31) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30.44);
  if (meses < 12) return `há ${meses} ${meses === 1 ? "mês" : "meses"}`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  return `há ${anos} ${anos === 1 ? "ano" : "anos"}${resto ? ` e ${resto} ${resto === 1 ? "mês" : "meses"}` : ""}`;
};

export default function DatasImportantes() {
  const [registros, setRegistros] = useState([]);
  const [form, setForm] = useState(formVazio);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const carregar = async () => setRegistros(await api.datasImportantes.listar());

  useEffect(() => {
    carregar().catch((err) => setError(err.message));
  }, []);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca).trim();
    if (!termo) return registros;
    return registros.filter((r) => normalizar(`${r.descricao} ${r.observacao || ""}`).includes(termo));
  }, [registros, busca]);

  const executar = async (acao, mensagem) => {
    setError("");
    setSuccess("");
    try {
      await acao();
      await carregar();
      setSuccess(mensagem);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const adicionar = async (event) => {
    event.preventDefault();
    if (await executar(() => api.datasImportantes.criar(form), "Data registrada.")) setForm(formVazio());
  };

  const salvarEdicao = (dados) => executar(() => api.datasImportantes.atualizar(editando.id, dados), "Registro atualizado.");

  const remover = (registro) => {
    if (!window.confirm(`Excluir "${registro.descricao}" de ${dateBR(registro.data)}?`)) return;
    executar(() => api.datasImportantes.remover(registro.id), "Registro excluído.");
  };

  return (
    <section>
      <PageTitle title="Datas importantes" />
      <Notice error={error} success={success} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
        <form className="panel h-fit space-y-3" onSubmit={adicionar}>
          <input className="field" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
          <input
            className="field"
            placeholder="Descrição (ex. troquei o filtro de água)"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            required
          />
          <input className="field" placeholder="Observação" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
          <button className="btn w-full" type="submit">
            <Plus size={16} />
            Registrar
          </button>
        </form>

        <div className="panel overflow-hidden p-0">
          <div className="border-b border-line p-3">
            <input className="field" type="search" placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>

          {filtrados.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-4 text-center text-muted">
              <CalendarHeart size={34} />
              <p className="text-sm">{registros.length ? "Nada encontrado na busca." : "Nenhuma data registrada ainda."}</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {filtrados.map((registro) => (
                <li key={registro.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-3">
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-semibold">{dateBR(registro.data)}</p>
                    <p className="text-[11px] text-muted">{haQuanto(registro.data)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{registro.descricao}</p>
                    {registro.observacao && <p className="text-xs text-muted">{registro.observacao}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button className="btn-secondary h-8 w-8 p-0" type="button" onClick={() => setEditando(registro)} title="Editar" aria-label="Editar">
                      <Pencil size={14} />
                    </button>
                    <button className="btn-danger h-8 w-8 p-0" type="button" onClick={() => remover(registro)} title="Excluir" aria-label="Excluir">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {editando && <EditarModal registro={editando} onSalvar={salvarEdicao} onFechar={() => setEditando(null)} />}
    </section>
  );
}

function EditarModal({ registro, onSalvar, onFechar }) {
  const [valores, setValores] = useState({
    data: dateInput(registro.data),
    descricao: registro.descricao,
    observacao: registro.observacao || ""
  });

  const submit = async (event) => {
    event.preventDefault();
    if (await onSalvar(valores)) onFechar();
  };

  return (
    <div className="overlay" onClick={onFechar}>
      <form className="panel max-h-full w-full max-w-lg space-y-3 overflow-y-auto" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">Editar data</h2>
          <button className="btn-secondary h-8 w-8 shrink-0 p-0" type="button" onClick={onFechar} title="Fechar" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        <input className="field" type="date" value={valores.data} onChange={(e) => setValores({ ...valores, data: e.target.value })} required />
        <input className="field" placeholder="Descrição" value={valores.descricao} onChange={(e) => setValores({ ...valores, descricao: e.target.value })} required />
        <input className="field" placeholder="Observação" value={valores.observacao} onChange={(e) => setValores({ ...valores, observacao: e.target.value })} />
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
