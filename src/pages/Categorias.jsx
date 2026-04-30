import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api.js";
import Notice from "../components/Notice.jsx";
import PageTitle from "../components/PageTitle.jsx";

export default function Categorias() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ nome: "", tipo: "DESPESA" });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const carregar = async () => setItems(await api.categorias.listar());

  useEffect(() => {
    carregar().catch((err) => setError(err.message));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (editing) {
        await api.categorias.atualizar(editing, form);
        setSuccess("Categoria atualizada.");
      } else {
        await api.categorias.criar(form);
        setSuccess("Categoria criada.");
      }
      setForm({ nome: "", tipo: "DESPESA" });
      setEditing(null);
      await carregar();
    } catch (err) {
      setError(err.message);
    }
  };

  const editar = (item) => {
    setEditing(item.id);
    setForm({ nome: item.nome, tipo: item.tipo });
  };

  const remover = async (id) => {
    setError("");
    await api.categorias.remover(id);
    await carregar();
  };

  return (
    <section>
      <PageTitle title="Categorias" />
      <Notice error={error} success={success} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
        <form className="panel space-y-3" onSubmit={submit}>
          <input className="field" placeholder="Nome" value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} />
          <select className="field" value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value })}>
            <option value="DESPESA">Despesa</option>
            <option value="RECEITA">Receita</option>
          </select>
          <button className="btn w-full" type="submit">
            {editing ? <Save size={16} /> : <Plus size={16} />}
            {editing ? "Salvar" : "Adicionar"}
          </button>
        </form>

        <div className="panel overflow-x-auto p-0">
          <table className="w-full min-w-[520px] border-collapse">
            <thead className="bg-black/20">
              <tr>
                <th className="table-cell">Nome</th>
                <th className="table-cell">Tipo</th>
                <th className="table-cell w-40"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="table-cell">{item.nome}</td>
                  <td className="table-cell">{item.tipo}</td>
                  <td className="table-cell">
                    <div className="flex justify-end gap-2">
                      <button className="btn-secondary h-8" type="button" onClick={() => editar(item)}>
                        Editar
                      </button>
                      <button className="btn-danger h-8 w-8 p-0" type="button" onClick={() => remover(item.id)} title="Remover">
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
    </section>
  );
}
