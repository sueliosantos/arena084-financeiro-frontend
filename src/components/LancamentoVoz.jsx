import { Check, Loader2, Mic, Square, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api.js";

export default function LancamentoVoz({ categorias, onSalvo }) {
  const [gravando, setGravando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => () => pararStream(recorderRef.current), []);

  const filteredCategorias = useMemo(() => (form ? categorias.filter((cat) => cat.tipo === form.tipo) : []), [categorias, form?.tipo]);

  const iniciar = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Este navegador não permite gravar áudio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        pararStream(recorder);
        interpretar(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
      };
      recorderRef.current = recorder;
      recorder.start();
      setGravando(true);
    } catch (err) {
      setError(err?.name === "NotAllowedError" ? "Permissão do microfone negada." : "Não foi possível acessar o microfone.");
    }
  };

  const parar = () => {
    setGravando(false);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const interpretar = async (audio) => {
    setError("");
    if (audio.size < 3000) {
      setError("A gravação ficou muito curta. Clique, fale a frase inteira e só depois clique em Parar.");
      return;
    }
    setProcessando(true);
    try {
      const dados = await api.lancamentos.interpretarVoz(audio);
      setResultado(dados);
      setForm({
        tipo: dados.tipo,
        descricao: dados.descricao || "",
        valor: dados.valor != null ? String(dados.valor) : "",
        categoriaId: dados.categoriaId ? String(dados.categoriaId) : "",
        data: dados.data,
        status: dados.status
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessando(false);
    }
  };

  const fechar = () => {
    setResultado(null);
    setForm(null);
    setError("");
  };

  const falarDeNovo = () => {
    fechar();
    iniciar();
  };

  const podeSalvar = form && form.categoriaId && Number(form.valor) > 0 && form.descricao.trim();

  const salvar = async (event) => {
    event.preventDefault();
    if (!podeSalvar) return;
    setSalvando(true);
    setError("");
    try {
      await api.lancamentos.criar({
        ...form,
        valor: Number(form.valor),
        categoriaId: Number(form.categoriaId),
        observacao: "",
        contabiliza: true
      });
      fechar();
      onSalvo?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <button
        className={`btn-secondary w-full ${gravando ? "!border-red-500 !text-red-400" : ""}`}
        type="button"
        onClick={gravando ? parar : iniciar}
        disabled={processando}
      >
        {processando ? <Loader2 size={16} className="animate-spin" /> : gravando ? <Square size={16} /> : <Mic size={16} />}
        {processando ? "Entendendo..." : gravando ? "Parar e enviar" : "Falar lançamento"}
      </button>
      {gravando && <p className="text-xs text-muted">Fale: descrição, valor, categoria — ex.: "restaurante 100 viagem". Diga "receita" no início para receitas.</p>}
      {error && !form && <p className="text-sm text-danger">{error}</p>}

      {form && createPortal(
        <div className="overlay">
          <form className="panel w-full max-w-lg space-y-4" onSubmit={salvar}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Entendi isso</h2>
                <p className="text-sm italic text-muted">"{resultado?.transcricao}"</p>
              </div>
              <button className="btn-secondary h-8 w-8 p-0" type="button" onClick={fechar} title="Fechar">
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-muted">
                Tipo
                <select className="field" value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value, categoriaId: "" })}>
                  <option value="DESPESA">Despesa</option>
                  <option value="RECEITA">Receita</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted">
                Status
                <select className="field" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  <option value="PAGO">Pago</option>
                  <option value="PENDENTE">Pendente</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted sm:col-span-2">
                Descrição
                <input className="field" value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} />
              </label>
              <label className="space-y-1 text-xs text-muted">
                Valor
                <input className={`field ${Number(form.valor) > 0 ? "" : "!border-red-500"}`} type="number" step="0.01" value={form.valor} onChange={(event) => setForm({ ...form, valor: event.target.value })} />
              </label>
              <label className="space-y-1 text-xs text-muted">
                Data
                <input className="field" type="date" value={form.data} onChange={(event) => setForm({ ...form, data: event.target.value })} />
              </label>
              <label className="space-y-1 text-xs text-muted sm:col-span-2">
                Categoria
                <select className={`field ${form.categoriaId ? "" : "!border-red-500"}`} value={form.categoriaId} onChange={(event) => setForm({ ...form, categoriaId: event.target.value })}>
                  <option value="">Escolha uma categoria</option>
                  {filteredCategorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="grid grid-cols-3 gap-2">
              <button className="btn-secondary" type="button" onClick={fechar}>
                Cancelar
              </button>
              <button className="btn-secondary" type="button" onClick={falarDeNovo}>
                <Mic size={16} />
                De novo
              </button>
              <button className="btn" type="submit" disabled={!podeSalvar || salvando}>
                {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                OK
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </>
  );
}

function pararStream(recorder) {
  recorder?.stream?.getTracks().forEach((track) => track.stop());
}
