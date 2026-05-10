import { CheckCircle2, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, money } from "../api.js";
import Notice from "../components/Notice.jsx";
import PageTitle from "../components/PageTitle.jsx";

const initialForm = {
  descricao: "",
  preco: ""
};

export default function ListaCompras() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const carregar = async () => setItems(await api.listaCompras.listar());

  useEffect(() => {
    carregar().catch((err) => setError(err.message));
  }, []);

  const totais = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          const preco = Number(item.preco || 0);
          if (item.preco !== null && item.preco !== undefined) acc.previsto += preco;
          if (item.comprado && item.preco !== null && item.preco !== undefined) acc.comprado += preco;
          if (item.comprado) acc.itensComprados += 1;
          return acc;
        },
        { previsto: 0, comprado: 0, itensComprados: 0 }
      ),
    [items]
  );

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.listaCompras.criar({
        descricao: form.descricao,
        preco: form.preco === "" ? null : Number(form.preco)
      });
      setForm(initialForm);
      await carregar();
      setSuccess("Item adicionado.");
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleComprado = async (item) => {
    setError("");
    setSuccess("");
    try {
      await api.listaCompras.atualizar(item.id, { comprado: !item.comprado });
      await carregar();
    } catch (err) {
      setError(err.message);
    }
  };

  const remover = async (id) => {
    setError("");
    setSuccess("");
    try {
      await api.listaCompras.remover(id);
      await carregar();
    } catch (err) {
      setError(err.message);
    }
  };

  const realizar = async () => {
    if (!items.length) return;
    const confirmou = window.confirm("Limpar toda a lista de compras?");
    if (!confirmou) return;

    setError("");
    setSuccess("");
    try {
      await api.listaCompras.realizar();
      await carregar();
      setSuccess("Lista finalizada. Pronta para o proximo ciclo.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section>
      <PageTitle
        title="Lista de Compras"
        actions={
          <button className="btn-secondary" type="button" onClick={realizar} disabled={!items.length}>
            <CheckCircle2 size={16} />
            Realizado
          </button>
        }
      />
      <Notice error={error} success={success} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <form className="panel space-y-3" onSubmit={submit}>
            <input
              className="field"
              placeholder="Produto"
              value={form.descricao}
              onChange={(event) => setForm({ ...form, descricao: event.target.value })}
            />
            <input
              className="field"
              type="number"
              min="0"
              step="0.01"
              placeholder="Preco opcional"
              value={form.preco}
              onChange={(event) => setForm({ ...form, preco: event.target.value })}
            />
            <button className="btn w-full" type="submit">
              <Plus size={16} />
              Adicionar
            </button>
          </form>

          <div className="panel grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <Summary label="Itens" value={items.length} />
            <Summary label="Comprados" value={`${totais.itensComprados}/${items.length}`} />
            <Summary label="Previsto" value={money(totais.previsto)} />
          </div>
        </div>

        <div className="panel overflow-hidden p-0">
          <div className="grid gap-2 border-b border-line p-3 sm:grid-cols-2">
            <Summary label="Total previsto" value={money(totais.previsto)} />
            <Summary label="Ja comprado" value={money(totais.comprado)} />
          </div>

          {items.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-4 text-center text-muted">
              <ShoppingCart size={34} />
              <p className="text-sm">Sua lista esta vazia.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((item) => (
                <li key={item.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-3">
                  <input
                    className="h-5 w-5"
                    type="checkbox"
                    checked={item.comprado}
                    onChange={() => toggleComprado(item)}
                    title="Marcar como comprado"
                  />
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-medium ${item.comprado ? "text-muted line-through" : "text-ink"}`}>{item.descricao}</p>
                    <p className="text-xs text-muted">{item.preco === null || item.preco === undefined ? "Sem preco" : money(item.preco)}</p>
                  </div>
                  <button className="btn-danger h-8 w-8 p-0" type="button" onClick={() => remover(item.id)} title="Remover">
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function Summary({ label, value }) {
  return (
    <div>
      <span className="text-xs uppercase text-muted">{label}</span>
      <strong className="block text-lg">{value}</strong>
    </div>
  );
}
