const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function request(path, options = {}) {
  const token = localStorage.getItem("financeiro_token");
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401) {
      localStorage.removeItem("financeiro_token");
      localStorage.removeItem("financeiro_user");
      window.dispatchEvent(new Event("financeiro:logout"));
    }
    throw new Error(error.error || error.erro || "Erro na requisicao");
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  auth: {
    login: (data) => request("/api/session", { method: "POST", body: JSON.stringify(data) }),
    cadastro: (data) => request("/api/users", { method: "POST", body: JSON.stringify(data) }),
    me: () => request("/api/me")
  },
  categorias: {
    listar: () => request("/api/categorias"),
    criar: (data) => request("/api/categorias", { method: "POST", body: JSON.stringify(data) }),
    atualizar: (id, data) => request(`/api/categorias/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remover: (id) => request(`/api/categorias/${id}`, { method: "DELETE" })
  },
  lancamentos: {
    listar: (mes, ano) => request(`/api/lancamentos?mes=${mes}&ano=${ano}`),
    criar: (data) => request("/api/lancamentos", { method: "POST", body: JSON.stringify(data) }),
    materializarRecorrente: (data) => request("/api/lancamentos/recorrente-mensal", { method: "POST", body: JSON.stringify(data) }),
    atualizar: (id, data) => request(`/api/lancamentos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remover: (id) => request(`/api/lancamentos/${id}`, { method: "DELETE" })
  },
  recorrentes: {
    listar: () => request("/api/recorrentes"),
    criar: (data) => request("/api/recorrentes", { method: "POST", body: JSON.stringify(data) }),
    atualizar: (id, data) => request(`/api/recorrentes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remover: (id) => request(`/api/recorrentes/${id}`, { method: "DELETE" })
  },
  resumo: (ano, mes) => request(`/api/resumo?ano=${ano}${mes ? `&mes=${mes}` : ""}`)
};

export const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));

export const dateInput = (value) => new Date(value).toISOString().slice(0, 10);
