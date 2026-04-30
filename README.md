# arena084-financeiro-frontend

Frontend do sistema financeiro Arena084, desenvolvido para consumir a API do backend e oferecer uma interface web para controle de receitas, despesas, categorias, lançamentos recorrentes e resumo financeiro.

A aplicação permite autenticar usuários, cadastrar movimentações financeiras, acompanhar o saldo por mês, visualizar gráficos anuais e gerenciar registros recorrentes de forma integrada ao backend Node.js.

## Tecnologias utilizadas

- React
- Vite
- JavaScript
- Tailwind CSS
- Recharts
- Lucide React
- Fetch API
- LocalStorage

## Funcionalidades principais

- Login e cadastro de usuários
- Persistência de sessão com token JWT no `localStorage`
- Logout local e limpeza automática da sessão em respostas `401`
- Dashboard financeiro com gráfico de receitas, despesas, pendências e saldo
- Consulta de movimentação mensal
- CRUD de categorias financeiras
- Cadastro de lançamentos manuais
- Importação de lançamentos por mensagem no formato simplificado, como `-50 mercado`
- Listagem de lançamentos por mês e ano
- Alternância de status entre `PAGO` e `PENDENTE`
- Edição de observação do lançamento
- Remoção de lançamentos não simulados
- Cadastro, edição, ativação, pausa e remoção de lançamentos recorrentes
- Materialização de recorrentes simulados ao alterar status ou observação

## Estrutura de pastas

```text
frontend/
├── dist/
├── node_modules/
├── src/
│   ├── components/
│   │   ├── ErrorBoundary.jsx
│   │   ├── Notice.jsx
│   │   └── PageTitle.jsx
│   ├── pages/
│   │   ├── Categorias.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Lancamentos.jsx
│   │   ├── Login.jsx
│   │   ├── MovimentacaoMes.jsx
│   │   └── Recorrentes.jsx
│   ├── api.js
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── .env
├── index.html
├── netlify.toml
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

### Principais responsabilidades

- `src/main.jsx`: ponto de entrada da aplicação React.
- `src/App.jsx`: controle da sessão, navegação principal e renderização das telas autenticadas.
- `src/api.js`: cliente HTTP centralizado para comunicação com o backend.
- `src/pages`: telas principais da aplicação.
- `src/components`: componentes reutilizáveis de interface.
- `src/styles.css`: estilos globais e classes utilitárias aplicadas com Tailwind CSS.
- `tailwind.config.js`: configuração de tema, cores e arquivos monitorados pelo Tailwind.
- `vite.config.js`: configuração do Vite e da porta local de desenvolvimento.
- `netlify.toml`: configuração de build e fallback para deploy na Netlify.

## Como rodar o projeto localmente

### 1. Acessar a pasta do frontend

```bash
cd frontend
```

### 2. Instalar as dependências

```bash
npm install
```

### 3. Configurar as variáveis de ambiente

Crie ou ajuste o arquivo `.env` na raiz do frontend:

```env
VITE_API_URL="http://localhost:3000"
```

Essa URL deve apontar para o backend da aplicação.

### 4. Rodar o backend

Antes de iniciar o frontend, mantenha a API em execução.

Exemplo na pasta do backend:

```bash
npm run dev
```

### 5. Rodar o frontend

```bash
npm run dev
```

Por padrão, o Vite inicia a aplicação em:

```text
http://localhost:5173
```

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---:|---|
| `VITE_API_URL` | Sim | URL base da API consumida pelo frontend |

Exemplo para ambiente local:

```env
VITE_API_URL="http://localhost:3000"
```

Exemplo para produção:

```env
VITE_API_URL="https://api.seu-dominio.com"
```

## Scripts disponíveis

```bash
npm run dev
```

Inicia o servidor de desenvolvimento com Vite, expondo em `0.0.0.0`.

```bash
npm run build
```

Gera a versão de produção da aplicação na pasta `dist`.

```bash
npm run preview
```

Executa um servidor local para visualizar o build gerado em `dist`.

## Integração com a API

O frontend consome o backend por meio do arquivo `src/api.js`.

A URL base é definida pela variável:

```env
VITE_API_URL
```

As chamadas são feitas usando `fetch`, sempre enviando `Content-Type: application/json`.

Quando existe token salvo no navegador, o cliente HTTP adiciona automaticamente o header:

```http
Authorization: Bearer <token>
```

Em caso de resposta `401`, a aplicação remove os dados locais da sessão e redireciona o usuário para a tela de login.

## Principais telas

### Login

Tela de autenticação e cadastro inicial de usuário.

Recursos disponíveis:

- Login com e-mail e senha
- Cadastro com nome, e-mail e senha
- Armazenamento do token JWT
- Alternância entre modo login e cadastro

### Dashboard

Tela de visão geral financeira.

Recursos disponíveis:

- Seleção de ano e mês limite
- Indicadores de receitas, despesas, pendências e saldo
- Gráfico de barras com dados consolidados
- Tabela de itens cadastrados no mês selecionado

### Movimentação Mês

Tela de consulta mensal.

Recursos disponíveis:

- Seleção de mês
- Resumo de receitas confirmadas
- Resumo de despesas confirmadas
- Total pendente
- Saldo confirmado
- Tabela detalhada dos lançamentos do mês

### Lançamentos

Tela de gerenciamento de receitas e despesas.

Recursos disponíveis:

- Cadastro manual de lançamento
- Seleção de tipo, status, categoria e data
- Campo de observação
- Importação por mensagem simplificada
- Listagem por mês e ano
- Alteração de status
- Edição de observação
- Remoção de lançamentos

Formato aceito para importação por mensagem:

```text
+2000 salario
-50 mercado
-120,90 energia
+350 pix cliente
```

### Recorrentes

Tela de gerenciamento de lançamentos recorrentes.

Recursos disponíveis:

- Cadastro de recorrentes
- Definição de data inicial e data final
- Ativação e pausa de recorrentes
- Edição com aplicação a partir de uma data específica
- Remoção de recorrentes

### Categorias

Tela de gerenciamento das categorias financeiras.

Recursos disponíveis:

- Cadastro de categoria
- Edição de categoria
- Remoção de categoria
- Separação por tipo: `RECEITA` ou `DESPESA`

## Rotas consumidas do backend

O frontend utiliza o prefixo `/api` nas chamadas HTTP.

| Recurso | Rotas consumidas |
|---|---|
| Autenticação | `POST /api/session` |
| Usuários | `POST /api/users`, `GET /api/me` |
| Categorias | `GET /api/categorias`, `POST /api/categorias`, `PUT /api/categorias/:id`, `DELETE /api/categorias/:id` |
| Lançamentos | `GET /api/lancamentos`, `POST /api/lancamentos`, `PUT /api/lancamentos/:id`, `DELETE /api/lancamentos/:id` |
| Recorrentes | `GET /api/recorrentes`, `POST /api/recorrentes`, `PUT /api/recorrentes/:id`, `DELETE /api/recorrentes/:id` |
| Resumo | `GET /api/resumo` |

## Build e deploy

Para gerar a versão de produção:

```bash
npm run build
```

O resultado será gerado na pasta:

```text
dist/
```

O arquivo `netlify.toml` já define:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Essa configuração permite publicar a aplicação como SPA na Netlify, redirecionando as rotas para o `index.html`.

## Boas práticas aplicadas

- Separação entre páginas, componentes e cliente de API
- Cliente HTTP centralizado em `src/api.js`
- Controle de autenticação baseado em token JWT
- Limpeza automática de sessão expirada
- Uso de componentes reutilizáveis para título, mensagens e tratamento de erro
- Interface organizada por módulos de negócio
- Formatação monetária com `Intl.NumberFormat`
- Uso de Vite para desenvolvimento e build
- Estilização centralizada com Tailwind CSS
- Configuração preparada para deploy como SPA

## Possíveis melhorias futuras

- Adicionar roteamento com React Router
- Criar testes automatizados para páginas e componentes
- Melhorar validação dos formulários no frontend
- Adicionar máscaras para moeda e datas
- Implementar paginação e filtros avançados nas tabelas
- Criar tela de perfil do usuário
- Adicionar tema claro/escuro
- Melhorar feedback visual de carregamento em todas as ações
- Adicionar confirmação antes de exclusões
- Criar integração real com WhatsApp via webhook no backend
- Adicionar documentação visual dos fluxos principais

## Autor

Suélio Santos
