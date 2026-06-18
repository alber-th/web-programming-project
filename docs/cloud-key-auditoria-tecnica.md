# Cloud Key — Auditoria Técnica

**Documento de referência técnica do projeto Cloud Key.**

| Campo | Valor |
|---|---|
| Projeto | Cloud Key |
| Tipo | E-commerce de chaves (keys) de jogos digitais |
| Contexto | Disciplina de Programação para Web — 1º Semestre de 2026 |
| Repositório | https://github.com/alber-th/web-programming-project |
| Branch principal | `main` |
| Status | Projeto 2 entregue (6 funcionalidades + transações) |
| Última revisão | 2026-06-17 |

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Stack tecnológica](#2-stack-tecnológica)
3. [Arquitetura do sistema](#3-arquitetura-do-sistema)
4. [Modelo de domínio](#4-modelo-de-domínio)
5. [Estrutura do repositório](#5-estrutura-do-repositório)
6. [Principais funcionalidades](#6-principais-funcionalidades)
7. [Fluxos principais](#7-fluxos-principais)
8. [Rotas e autorização](#8-rotas-e-autorização)
9. [Decisões arquiteturais](#9-decisões-arquiteturais)
10. [Dependências externas](#10-dependências-externas)
11. [Configuração e execução](#11-configuração-e-execução)
12. [Riscos técnicos e melhorias futuras](#12-riscos-técnicos-e-melhorias-futuras)
13. [Observações de auditoria](#13-observações-de-auditoria)
14. [Apêndices](#14-apêndices)

---

## 1. Visão geral

### 1.1 Contexto

O **Cloud Key** é um projeto acadêmico desenvolvido como entrega do **Projeto 2** da disciplina de Programação para Web. A proposta é construir uma aplicação web full-stack que atenda aos seis requisitos funcionais da disciplina, aplicando padrões de engenharia de software (MVC, SOLID, GRASP, Clean Code) e demonstrando domínio sobre a stack Node.js + Express + ORM + banco relacional.

### 1.2 Domínio

A inspiração é a plataforma **Nuuvem** — um marketplace de chaves digitais de jogos. O sistema simula esse domínio em escala reduzida: usuários se cadastram, navegam um catálogo de produtos (chaves de jogos), e podem realizar compras. Administradores gerenciam o catálogo.

### 1.3 Objetivo

Entregar uma aplicação web persistente que demonstre, em código de qualidade industrial:

- Autenticação por e-mail e senha com hash bcrypt e sessão.
- CRUD completo de uma entidade de domínio (Produto).
- Controle de acesso por role (CLIENTE vs ADMIN).
- Persistência via ORM com migrations versionadas.
- Padrão arquitetural MVC com camada de serviço.

### 1.4 Escopo do Projeto 2

| Requisito | Status |
|---|---|
| 1. Cadastro de usuário | Implementado |
| 2. Login / Logout | Implementado |
| 3. Cadastro de produto/transação | Implementado (Produto) |
| 4. Listagem de produtos/transações | Implementado |
| 5. Edição de produto/transação | Implementado (Produto) |
| 6. Exclusão de produto/transação | Implementado (Produto) |
| **Extra**: Registro de Transações (compras) | Implementado |

### 1.5 Equipe

Alberth Cavalcanti, Filipe Andrade, Ivo Pinheiro, Lívia Fernandes.

---

## 2. Stack tecnológica

### 2.1 Runtime e linguagem

- **Node.js 18+** (testado em v24.14.0)
- **JavaScript** (ECMAScript moderno, CommonJS modules)

### 2.2 Backend

- **Express 4.19** — framework HTTP minimalista; padrão para roteamento e middleware.
- **EJS 3.1** — template engine server-side com sintaxe próxima ao HTML.
- **Sequelize 6.37** — ORM relacional, suporta migrations versionadas via `sequelize-cli`.
- **PostgreSQL 14+** (testado em v16.14) — banco relacional, dialeto `pg` + `pg-hstore`.

### 2.3 Autenticação e sessão

- **express-session 1.18** — sessões server-side com cookie assinado.
- **connect-flash 0.1** — mensagens transitórias entre redirects.
- **bcrypt 5.1** — hash de senhas (10 salt rounds).

### 2.4 Utilitários

- **method-override 3.0** — habilita `PUT`/`DELETE` em forms HTML via `_method`.
- **dotenv 16.4** — leitura de variáveis de ambiente do `.env`.

### 2.5 Tooling de desenvolvimento

- **nodemon 3.1** — auto-reload do servidor durante o desenvolvimento.
- **sequelize-cli 6.6** — gera e executa migrations, seeders.

---

## 3. Arquitetura do sistema

### 3.1 Estilo arquitetural

Aplicação web monolítica em padrão **MVC com camada de serviço explícita**, organizada em camadas com responsabilidades estritamente delimitadas (Single Responsibility Principle, GRASP — *High Cohesion / Low Coupling*).

### 3.2 Pipeline de uma requisição HTTP

```
┌─────────┐    ┌────────────────┐    ┌────────────────┐    ┌────────────┐
│ Browser │───▶│  Express + MW  │───▶│  Routes        │───▶│ Middlewares│
└─────────┘    │  (session,     │    │  (URL → ctrl)  │    │ (auth,role)│
               │   flash,       │    └────────────────┘    └─────┬──────┘
               │   bodyparser,  │                                │
               │   methodOvr)   │                                ▼
               └────────────────┘                       ┌────────────────┐
                                                        │  Controllers   │
                                                        │  (HTTP, valida │
                                                        │   input)       │
                                                        └───────┬────────┘
                                                                ▼
                                                       ┌────────────────┐
                                                       │  Services      │
                                                       │  (regras de    │
                                                       │   negócio)     │
                                                       └───────┬────────┘
                                                               ▼
                                                       ┌────────────────┐
                                                       │  Models        │
                                                       │  (Sequelize)   │
                                                       └───────┬────────┘
                                                               ▼
                                                       ┌────────────────┐
                                                       │  PostgreSQL    │
                                                       └────────────────┘
```

### 3.3 Responsabilidades por camada

| Camada | Responsabilidade | O que **não** faz |
|---|---|---|
| **Routes** | Mapeia URL + verbo HTTP para o controller correto; declara middlewares aplicáveis. | Lógica de negócio. Conhecimento do banco. |
| **Middlewares** | Política transversal (autenticação, autorização, parsing, sessão). | Decisões de domínio. |
| **Controllers** | Traduz HTTP em chamadas de serviço; valida formato do input; decide render/redirect/flash. | Persistência direta. Regra de negócio. |
| **Services** | Encapsula regras de negócio (hash de senha, cálculo de `totalPrice`, busca por e-mail). | Conhece `req`/`res`. Renderiza views. |
| **Models** | Define schema, validações estruturais (UNIQUE, NOT NULL, ENUM, ranges). Associações. | Lógica de domínio complexa. |
| **Views (EJS)** | Renderiza HTML a partir do contexto fornecido pelo controller. | Lógica de negócio. Acesso a banco. |

### 3.4 Princípios aplicados

- **SRP (SOLID)**: cada módulo tem um motivo único para mudar.
- **OCP (SOLID)**: `requireRole(...roles)` aberto para extensão (novas roles), fechado para modificação.
- **DIP (SOLID)**: controllers dependem da abstração do service, não do model diretamente.
- **High Cohesion (GRASP)**: arquivos agrupados por responsabilidade, não por entidade.
- **Information Expert (GRASP)**: `models/index.js` sabe como instanciar o Sequelize e carregar models; controllers não precisam saber.
- **Polymorphism / Indirection (GRASP)**: `validateProductInput` reaproveitado entre `create` e `update` no `ProductController`.

---

## 4. Modelo de domínio

### 4.1 Entidades

```
┌──────────────────┐         ┌──────────────────────┐         ┌──────────────────┐
│      User        │         │     Transaction      │         │     Product      │
├──────────────────┤         ├──────────────────────┤         ├──────────────────┤
│ id    PK         │1       N│ id    PK             │N       1│ id    PK         │
│ name             │─────────│ user_id    FK ───────│─────────│ name             │
│ email  UNIQUE    │         │ product_id FK        │         │ platform         │
│ password_hash    │         │ quantity (≥1)        │         │ price  DECIMAL   │
│ role  ENUM       │         │ total_price DECIMAL  │         │ stock  INT (≥0)  │
│ created_at       │         │ created_at           │         │ created_at       │
│ updated_at       │         │ updated_at           │         │ updated_at       │
└──────────────────┘         └──────────────────────┘         └──────────────────┘
```

### 4.2 User

| Campo | Tipo | Constraints | Observações |
|---|---|---|---|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `name` | STRING | NOT NULL, notEmpty | |
| `email` | STRING | NOT NULL, UNIQUE, validação `isEmail` | Normalizado para lowercase no service |
| `password_hash` | STRING | NOT NULL | Bcrypt, 10 salt rounds |
| `role` | ENUM | NOT NULL, default `CLIENTE` | Valores: `CLIENTE`, `ADMIN` |
| `created_at` | TIMESTAMP | NOT NULL | Auto-gerenciado pelo Sequelize |
| `updated_at` | TIMESTAMP | NOT NULL | Auto-gerenciado pelo Sequelize |

### 4.3 Product

| Campo | Tipo | Constraints | Observações |
|---|---|---|---|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `name` | STRING | NOT NULL, notEmpty | |
| `platform` | STRING | NOT NULL, notEmpty | Steam, PSN, Xbox, etc. |
| `price` | DECIMAL(10,2) | NOT NULL, default 0, ≥ 0 | Validação no controller exige > 0 |
| `stock` | INTEGER | NOT NULL, default 0, ≥ 0 | Decremento de estoque não implementado |

### 4.4 Transaction

| Campo | Tipo | Constraints | Observações |
|---|---|---|---|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `user_id` | INTEGER | FK → `users.id`, NOT NULL, `ON DELETE RESTRICT` | Índice |
| `product_id` | INTEGER | FK → `products.id`, NOT NULL, `ON DELETE RESTRICT` | Índice |
| `quantity` | INTEGER | NOT NULL, default 1, ≥ 1 | |
| `total_price` | DECIMAL(10,2) | NOT NULL, ≥ 0 | Calculado server-side: `product.price × quantity` |

### 4.5 Associações Sequelize

```js
Transaction.belongsTo(User,    { foreignKey: 'userId',    as: 'user' });
Transaction.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
```

As associações inversas (`User.hasMany(Transaction)`, `Product.hasMany(Transaction)`) estão deliberadamente comentadas — não são necessárias para os queries atuais. Estão sinalizadas como ponto de extensão futuro.

### 4.6 Política de integridade referencial

`ON DELETE RESTRICT` em ambas as FKs. **Decisão deliberada**: histórico de compras é dado contábil e jamais deve ser perdido por exclusão acidental de usuário ou produto. Tentativas de exclusão de produto com transações vinculadas são tratadas graciosamente no `productController.delete`, exibindo mensagem ao admin (não retorna 500).

---

## 5. Estrutura do repositório

```
web-programming-project/
├── app.js                       # Entry point: Express + middlewares + rotas
├── package.json                 # Dependências e scripts npm
├── .env.example                 # Template de variáveis de ambiente
├── .sequelizerc                 # Configura sequelize-cli para src/
├── .gitignore
├── README.md                    # Documentação para devs
│
├── docs/                        # Documentação técnica (este arquivo)
│
├── public/                      # Assets estáticos servidos pelo Express
│   ├── css/style.css
│   ├── js/
│   └── images/
│
└── src/
    ├── config/
    │   └── database.js          # Config do Sequelize por NODE_ENV
    │
    ├── controllers/             # Camada HTTP
    │   ├── homeController.js
    │   ├── userController.js
    │   ├── productController.js
    │   └── transactionController.js
    │
    ├── middlewares/
    │   └── auth.js              # isAuthenticated, requireRole
    │
    ├── migrations/              # Schema versionado
    │   ├── 20260617120000-create-users.js
    │   ├── 20260617120001-create-products.js
    │   └── 20260617120002-create-transactions.js
    │
    ├── models/                  # Sequelize models
    │   ├── index.js             # Auto-loader de todos os models
    │   ├── User.js
    │   ├── Product.js
    │   └── Transaction.js
    │
    ├── routes/                  # Routers Express por área
    │   ├── index.js             # /
    │   ├── auth.js              # /register, /login, /logout
    │   ├── products.js          # /products (CRUD)
    │   └── transactions.js      # /transactions
    │
    ├── services/                # Regras de negócio
    │   ├── userService.js
    │   ├── productService.js
    │   └── transactionService.js
    │
    ├── seeders/                 # Reservado para seeds futuros
    │
    └── views/                   # Templates EJS
        ├── home.ejs
        ├── partials/            # Componentes reutilizáveis
        │   ├── head.ejs
        │   ├── header.ejs
        │   ├── footer.ejs
        │   └── flash.ejs
        ├── auth/
        │   ├── register.ejs
        │   └── login.ejs
        ├── products/
        │   ├── index.ejs
        │   ├── new.ejs
        │   └── edit.ejs
        └── transactions/
            └── index.ejs
```

### 5.1 Convenções de nomenclatura

- **Arquivos JavaScript**: camelCase para módulos (`userController.js`), PascalCase para models (`User.js`).
- **Tabelas SQL**: plural snake_case (`users`, `products`, `transactions`).
- **Colunas SQL**: snake_case (`password_hash`, `created_at`) — Sequelize converte automaticamente via `underscored: true`.
- **Atributos JS dos models**: camelCase (`passwordHash`, `createdAt`).
- **Branches Git**: `feat/<feature-name>` em kebab-case.

---

## 6. Principais funcionalidades

### 6.1 Cadastro de usuário (`POST /register`)

Permite criar conta com nome, e-mail e senha. Validações:

- Nome obrigatório.
- E-mail no formato `name@domain.tld`.
- Senha com no mínimo 6 caracteres.
- Confirmação de senha deve coincidir.
- E-mail único — duplicidade tratada na camada de aplicação e na constraint do banco (defesa em profundidade).

Senha persistida apenas como `password_hash` via bcrypt. Role atribuído como `CLIENTE` por padrão; promoção a `ADMIN` é manual (via SQL).

### 6.2 Login (`POST /login`)

Autentica com e-mail e senha. Comparação via `bcrypt.compare`. Em sucesso:

- Sessão criada com `{ id, name, email, role }` (sem hash).
- `req.session.returnTo` (se presente) é usado para retornar à rota interceptada pelo middleware.
- Flash de boas-vindas + redirect.

Em falha, mensagem genérica ("E-mail ou senha inválidos") com status 401 — não distingue entre usuário inexistente e senha errada, mitigando user enumeration.

### 6.3 Logout (`POST /logout`)

`req.session.destroy()` + `res.clearCookie('connect.sid')` + redirect para home. Logout é POST (não GET) para impedir ativação inadvertida via link.

### 6.4 CRUD de Produto

| Operação | Rota | Acesso |
|---|---|---|
| Listar | `GET /products` | Público |
| Criar (form) | `GET /products/new` | ADMIN |
| Criar | `POST /products` | ADMIN |
| Editar (form) | `GET /products/:id/edit` | ADMIN |
| Atualizar | `PUT /products/:id` | ADMIN |
| Excluir | `DELETE /products/:id` | ADMIN |

A listagem é pública (catálogo navegável). Todas as mutações são restritas a `ADMIN` via middleware composto `[isAuthenticated, requireRole('ADMIN')]`.

A listagem renderiza ações condicionalmente:

- **Usuário anônimo**: apenas a tabela.
- **CLIENTE logado**: botão "Comprar" por linha.
- **ADMIN**: "Comprar" + "Editar" + "Excluir".

### 6.5 Transações (compras)

Registra a compra de um produto pelo usuário logado.

- `POST /transactions` recebe `productId` e `quantity` (default 1).
- O `totalPrice` é **calculado no servidor** a partir do `Product.price` no momento da compra. O cliente nunca envia o preço.
- `GET /transactions` mostra:
  - **CLIENTE**: apenas as próprias compras (filtro `WHERE user_id = currentUser.id` cravado no service).
  - **ADMIN**: todas as compras, com a coluna `Usuário`.

A view tolera produto removido (`(produto removido)`) — embora o `RESTRICT` impeça isso atualmente.

---

## 7. Fluxos principais

### 7.1 Cadastro de usuário

```
Browser  →  POST /register {name, email, password, passwordConfirmation}
         │
         ▼
Express  →  app.use(urlencoded) → body parseado
         │
         ▼
Router (routes/auth.js)  →  userController.register
         │
         ▼
Controller
  1. validateRegisterInput → erros estruturais (campos, formatos)
  2. Se há erros: re-render auth/register.ejs (status 400) com formData/errors
  3. Normaliza email (trim + lowercase)
  4. userService.findByEmail → se existe: re-render com erro "email já cadastrado"
  5. userService.registerUser → bcrypt.hash + User.create
  6. Catch SequelizeUniqueConstraintError (race): mesmo erro de duplicado
         │
         ▼ (sucesso)
req.flash('success', 'Cadastro realizado…') + redirect /login (PRG pattern)
```

### 7.2 Login

```
Browser → POST /login {email, password}
         │
         ▼
Controller
  1. Validação mínima (presença de campos)
  2. userService.verifyCredentials(email, password)
     - findByEmail → user
     - bcrypt.compare(password, user.passwordHash)
     - Retorna user OU null (não distingue erros)
  3. Se null: re-render com erro global, status 401
  4. Se ok:
     - req.session.user = {id, name, email, role}
     - Lê e remove returnTo da sessão
     - Flash boas-vindas + redirect (returnTo || '/')
```

### 7.3 Compra de produto

```
Browser → POST /transactions {productId, quantity=1}
         │
         ▼
Middleware isAuthenticated  →  redireciona /login se não logado
         │
         ▼
Controller
  1. Coage productId e quantity para Number, valida inteiros positivos
  2. transactionService.createTransaction({userId, productId, quantity})
     - Product.findByPk(productId)
     - Se null: throw ProductNotFoundError
     - totalPrice = Number(product.price) * quantity
     - Transaction.create({...})
  3. Catch ProductNotFoundError: flash + redirect /products
  4. Sucesso: flash + redirect /transactions
```

### 7.4 Exclusão de produto

```
ADMIN clica "Excluir" → form POST /products/:id?_method=DELETE
         │
         ▼
methodOverride lê _method  →  rota DELETE acionada
         │
         ▼
[isAuthenticated, requireRole('ADMIN')]  →  passa
         │
         ▼
Controller
  1. productService.deleteProduct(id)
     - Product.findByPk(id) → se null, retorna false
     - product.destroy() → tenta excluir
  2. Se SequelizeForeignKeyConstraintError (produto vinculado a transação):
     flash "possui transações vinculadas e não pode ser excluído"
  3. Se false: flash "produto não encontrado"
  4. Sucesso: flash "excluído com sucesso"
  5. Redirect /products
```

---

## 8. Rotas e autorização

### 8.1 Matriz de rotas

| Método | Rota | Acesso | Controller | Descrição |
|---|---|---|---|---|
| GET | `/` | Público | `homeController.index` | Home |
| GET | `/register` | Público | `userController.showRegisterForm` | Form de cadastro |
| POST | `/register` | Público | `userController.register` | Cria usuário |
| GET | `/login` | Público | `userController.showLoginForm` | Form de login |
| POST | `/login` | Público | `userController.login` | Autentica e abre sessão |
| POST | `/logout` | Logado* | `userController.logout` | Encerra sessão |
| GET | `/products` | Público | `productController.index` | Lista produtos |
| GET | `/products/new` | ADMIN | `productController.showCreateForm` | Form criar produto |
| POST | `/products` | ADMIN | `productController.create` | Cria produto |
| GET | `/products/:id(\d+)/edit` | ADMIN | `productController.showEditForm` | Form editar |
| PUT | `/products/:id(\d+)` | ADMIN | `productController.update` | Atualiza produto |
| DELETE | `/products/:id(\d+)` | ADMIN | `productController.delete` | Exclui produto |
| GET | `/transactions` | Logado | `transactionController.listForCurrentUser` | Lista (própria ou todas) |
| POST | `/transactions` | Logado | `transactionController.createForCurrentUser` | Registra compra |

\* Logout não tem middleware explícito porque o ato é idempotente.

### 8.2 Middlewares de autorização

#### `isAuthenticated`

```js
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) return next();
  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Você precisa estar logado para acessar essa página.');
  return res.redirect('/login');
}
```

- Salva a URL atual para retomar após login.
- Não bloqueia com 401; redireciona para o fluxo de login (UX-friendly).

#### `requireRole(...roles)`

```js
function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.session && req.session.user;
    if (!user) { /* redirect /login */ }
    if (!roles.includes(user.role)) {
      req.flash('error', 'Você não tem permissão...');
      return res.redirect('/');
    }
    return next();
  };
}
```

- Factory que devolve um middleware (Open/Closed para novas roles).
- Suporta lista de roles: `requireRole('ADMIN', 'MANAGER')`.

### 8.3 Restrição de IDs numéricos no roteador

```js
router.get('/products/:id(\\d+)/edit', ...);
router.put('/products/:id(\\d+)', ...);
router.delete('/products/:id(\\d+)', ...);
```

A regex `\d+` é avaliada pelo Express. IDs não-numéricos (`/products/abc/edit`) não casam com a rota — caem no handler de 404 sem nem chegar ao controller. Isso evita erros de cast no PostgreSQL e simplifica o controller.

---

## 9. Decisões arquiteturais

### 9.1 `models/index.js` como ponto único do Sequelize

Em vez de instanciar Sequelize em vários lugares, o arquivo `models/index.js` é a única fonte da instância e auto-importa todos os models do diretório. Vantagens:

- Garantia de que `associate()` é chamado após todos os models serem carregados.
- Controllers/services importam via `const { User, Product, sequelize } = require('../models')`.
- Eliminação de risco de instâncias duplicadas do Sequelize.

### 9.2 Convenção `underscored: true`

Configurado globalmente em `src/config/database.js`. Atributos JS em camelCase, colunas SQL em snake_case. Mantém ambos os mundos idiomáticos sem precisar mapear manualmente.

**Trade-off**: nas migrations o nome das colunas precisa ser escrito em snake_case manualmente — Sequelize não converte no `queryInterface.createTable`.

### 9.3 Padrão PRG (Post/Redirect/Get)

Após uma mutação bem-sucedida (`POST /register`, `POST /login`, `POST /products`, etc.), o controller responde com `302 Redirect`. Benefícios:

- Recarregar a página não reenvia o form.
- Histórico do browser não fica poluído com requests POST.
- Combina naturalmente com flash messages para feedback.

Em **caso de erro**, o controller faz `render` direto (não redirect), preservando o `formData` do usuário e atribuindo status 400/401. Evita serializar objetos complexos via flash (que só aceita strings).

### 9.4 `totalPrice` calculado server-side

No `transactionService.createTransaction`, o `totalPrice` é calculado a partir do `product.price` buscado do banco. O cliente envia apenas `productId` e `quantity`. Mesmo que o atacante manipule o HTML para enviar `totalPrice: 0`, o valor persistido é correto.

### 9.5 `method-override` para verbos REST

HTML não suporta `PUT`/`DELETE` em forms. A alternativa comum (usar `POST /products/:id/delete`) confunde a semântica REST. O `method-override` lê `?_method=PUT` ou `?_method=DELETE` em forms POST e expõe o verbo correto ao router. Mantém as rotas RESTful e abre caminho para uma API JSON reutilizar as mesmas rotas no futuro.

### 9.6 `ON DELETE RESTRICT` em vez de CASCADE

A escolha de RESTRICT impede que admins excluam acidentalmente produtos ou usuários com histórico de compras. O custo é uma UX adicional (mensagem amigável quando a exclusão é bloqueada), tratado no controller. CASCADE seria mais simples, mas perderia dados contábeis.

### 9.7 Defesa em profundidade na validação

`Product.price` é validado em três pontos:

1. **Controller**: re-renderiza o form com erro se `price ≤ 0`.
2. **Model**: `validate: { min: 0 }` impede que um service descuidado persista valor negativo.
3. **Banco**: `NOT NULL DEFAULT 0` impede escritas por fora da aplicação (script SQL direto).

Cada camada tem um motivo diferente para validar. Redundância intencional.

### 9.8 Autorização declarativa nas rotas

A política de acesso é declarada na rota:

```js
router.post('/products', isAuthenticated, requireRole('ADMIN'), productController.create);
```

O controller **não conhece** a role exigida. Trocar a política (ex.: liberar criação para `MANAGER`) é mudança de uma linha. SRP intacto.

### 9.9 Service não conhece `req`/`res`

Services recebem dados via parâmetros, retornam dados via valores ou exceções tipadas (`ProductNotFoundError`). Isso permite:

- Reutilizar services em rotas, jobs cronados, testes unitários.
- Testar services sem mock de Express.

### 9.10 Sessão minimalista

Apenas `{ id, name, email, role }` é serializado na sessão. **Nunca** o `passwordHash`. Idealmente, apenas `id` seria salvo e os demais campos buscados a cada request — para projeto acadêmico, manter os campos extras na sessão é um trade-off razoável de simplicidade vs. consistência.

### 9.11 Validação no controller, parsing antes da validação

O `parsePrice` aceita `"29,99"` (BR) e `"29.99"` (US), tratando vírgula como separador decimal antes de coagir para `Number`. A validação acontece sobre o número já parseado, não sobre a string crua. Isso isola formatação de input da regra de negócio.

---

## 10. Dependências externas

### 10.1 Dependências runtime (`dependencies`)

| Pacote | Versão | Função |
|---|---|---|
| `express` | ^4.19.2 | Framework HTTP |
| `ejs` | ^3.1.10 | Template engine |
| `sequelize` | ^6.37.3 | ORM relacional |
| `pg` | ^8.12.0 | Driver PostgreSQL |
| `pg-hstore` | ^2.3.4 | Serialização HSTORE (dep do `pg` no Sequelize) |
| `bcrypt` | ^5.1.1 | Hash de senha |
| `express-session` | ^1.18.0 | Sessões server-side |
| `connect-flash` | ^0.1.1 | Mensagens flash |
| `method-override` | ^3.0.0 | Suporte a PUT/DELETE em forms HTML |
| `dotenv` | ^16.4.5 | Carregamento de `.env` |

### 10.2 Dependências de desenvolvimento (`devDependencies`)

| Pacote | Versão | Função |
|---|---|---|
| `nodemon` | ^3.1.4 | Auto-reload no dev |
| `sequelize-cli` | ^6.6.2 | Migrations/seeders |

### 10.3 Infraestrutura externa

- **PostgreSQL 14+** — banco relacional.
- **Node.js 18+** — runtime.

### 10.4 Auditoria de vulnerabilidades

`npm audit` reporta 4 vulnerabilidades (2 moderate, 2 high) em dependências transitivas no momento desta auditoria. Recomenda-se executar `npm audit` periodicamente e atualizar dependências (ver §12).

---

## 11. Configuração e execução

### 11.1 Variáveis de ambiente

Arquivo `.env` (template em `.env.example`):

| Variável | Padrão | Descrição |
|---|---|---|
| `NODE_ENV` | `development` | Ambiente Node |
| `PORT` | `3000` | Porta do servidor |
| `SESSION_SECRET` | — | Secret para assinar cookie de sessão |
| `DB_DIALECT` | `postgres` | Driver Sequelize |
| `DB_HOST` | `localhost` | Host do Postgres |
| `DB_PORT` | `5432` | Porta do Postgres |
| `DB_NAME` | `cloud_key` | Nome do banco |
| `DB_USER` | `postgres` | Usuário do Postgres |
| `DB_PASSWORD` | `postgres` | Senha do Postgres |

### 11.2 Setup local (passo a passo)

```bash
# 1. Clonar
git clone https://github.com/alber-th/web-programming-project.git
cd web-programming-project

# 2. Instalar dependências
npm install

# 3. Configurar ambiente
cp .env.example .env
# editar .env conforme seu Postgres

# 4. Criar banco
createdb cloud_key

# 5. Rodar migrations
npm run db:migrate

# 6. Subir o servidor
npm run dev
```

### 11.3 Scripts npm disponíveis

| Script | Descrição |
|---|---|
| `npm start` | Inicia o servidor em modo produção (`node app.js`) |
| `npm run dev` | Inicia com nodemon (auto-reload) |
| `npm run db:migrate` | Aplica migrations pendentes |
| `npm run db:migrate:undo` | Reverte a última migration |
| `npm run db:migrate:undo:all` | Reverte todas as migrations |
| `npm run db:seed` | Roda seeders |
| `npm run db:seed:undo` | Reverte seeders |

### 11.4 Promoção de usuário a ADMIN

A UI sempre cria usuários como `CLIENTE`. Para testar funcionalidades restritas:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'voce@exemplo.com';
```

Após promover, é necessário **logout/login** para a sessão pegar o novo role.

---

## 12. Riscos técnicos e melhorias futuras

### 12.1 Riscos de segurança identificados

| Risco | Severidade | Descrição | Mitigação proposta |
|---|---|---|---|
| **Sem proteção CSRF** | Alta | Forms POST não têm token CSRF. Atacante pode forjar requests de outras origens. | Adicionar `csurf` ou `lusca` como middleware. |
| **Senha mínima de 6 caracteres** | Média | Política fraca para padrões modernos (recomendação OWASP é 12+). | Aumentar para 8-12, exigir mix de caracteres. |
| **Sem rate limiting** | Média | Login pode ser alvo de brute force. | Adicionar `express-rate-limit` no `/login` e `/register`. |
| **Cookie de sessão sem `Secure`** | Média | Em desenvolvimento OK, mas precisa de `secure: true` em produção (HTTPS). | Configurar via `NODE_ENV === 'production'`. |
| **Session secret no `.env` versionado como template** | Baixa | `.env.example` mostra "troque-este-valor"; risco se for esquecido em prod. | Documentação clara + checklist de deploy. |
| **Promoção a ADMIN via SQL manual** | Média | Sem trilha de auditoria de quem promoveu quem. | Implementar interface de gestão de roles com log. |
| **Vulnerabilidades em deps transitivas** | A avaliar | `npm audit` reporta 4 issues. | `npm audit fix` e revisão. |

### 12.2 Limitações funcionais

| Limitação | Descrição | Sugestão |
|---|---|---|
| **Sem decremento de estoque** | Comprar não atualiza `Product.stock`. Estoque pode ficar "infinito" no modelo de dados. | Em `createTransaction`, envolver `Transaction.create` + `product.decrement('stock', { by: quantity })` em `sequelize.transaction()` para atomicidade. |
| **Sem verificação de estoque na compra** | Possível comprar produto sem estoque. | Validar `product.stock >= quantity` antes de criar a transação. |
| **Carrinho ausente** | Compra é one-shot, um produto por transação. | Modelar `Order` + `OrderItem` para carrinho com múltiplos itens. |
| **Sem paginação** | Listagens carregam todos os registros. | Adicionar `LIMIT/OFFSET` + UI de páginas. |
| **Sem busca/filtros** | Catálogo não tem filtro por plataforma, preço, etc. | Query params em `GET /products`. |
| **Sem soft delete** | `destroy()` é hard delete. | `paranoid: true` no model + coluna `deleted_at`. |
| **Edição de transação não existe** | Apenas Produto tem CRUD completo. | Decisão de design (transações são imutáveis), mas pode ser revisitada. |

### 12.3 Riscos de operação

| Risco | Descrição | Mitigação |
|---|---|---|
| **Sem testes automatizados** | Refatorações dependem de teste manual. | Adicionar Jest + supertest. Priorizar services (mais lógica). |
| **Sem CI/CD** | Sem garantia de que `main` compila e roda. | GitHub Actions com `npm install && npm run db:migrate && npm test`. |
| **Sem logging estruturado** | `console.log` apenas no boot. Falhas em produção são opacas. | Adicionar `winston` ou `pino`. |
| **Sem monitoramento de erros** | Erros 500 vão pro stderr e somem. | Sentry ou similar. |
| **Migrations não testadas em rollback** | `down()` escrito mas não exercitado regularmente. | Testar `db:migrate:undo:all && db:migrate` em CI. |

### 12.4 Débitos técnicos menores

- **`SESSION_SECRET` cai para fallback `'cloud-key-dev-secret'`** se ausente — em produção deveria falhar o boot.
- **`req.session.user` nunca é re-sincronizado com o banco** — se o role muda no DB, a sessão fica stale até novo login.
- **`bcrypt` é nativo** — em ambientes Docker exige recompilação; considerar `bcryptjs` (puro JS) se for dor.
- **DEPRECATION warnings** no boot vindos de deps internas (`url.parse` no `method-override`, `util.isArray` no `pg`). Não bloqueiam, mas vão quebrar em versões futuras do Node.

---

## 13. Observações de auditoria

### 13.1 Pontos fortes

- **Separação de camadas consistente**: nenhum controller importa diretamente do Sequelize; nenhum service conhece `req`/`res`.
- **Defesa em profundidade**: validação em controller, model e banco.
- **Convenções padronizadas**: helpers `renderForm(res, opts)` repetidos entre `register`/`login`/`product` com mesma assinatura (`formData`, `errors`, `status`).
- **Autorização declarativa**: política exposta nas rotas, não escondida em controllers.
- **Hash de senha desde o primeiro commit da feature**: não há janela onde senhas em claro estariam no banco.
- **Commits atômicos com mensagens descritivas**: cada commit conta uma história clara (`feat(auth): cadastro de usuário com hash de senha`).
- **Estratégia de branching limpa**: 1 feature por branch, PRs encadeados para review incremental.

### 13.2 Padrões de erro

A aplicação não tem um error handler global registrado em `app.js`. Erros chegam via `next(err)` e são tratados pelo handler padrão do Express, que retorna HTML cru. **Sugestão**: adicionar `app.use((err, req, res, next) => { ... })` antes do `listen` para renderizar uma view de erro consistente.

### 13.3 Tratamento de erros de domínio

`transactionService` introduz `ProductNotFoundError` como classe — controller usa `err instanceof ProductNotFoundError` em vez de string match. **Padrão recomendado para expansão**: criar erros tipados também para outros services (`UserNotFoundError`, `InsufficientStockError` quando implementado).

### 13.4 Auditoria de segurança express

- Cookie de sessão configurado com `httpOnly: true` ✓
- `saveUninitialized: false` evita cookies para visitantes anônimos ✓
- Senha nunca volta para a view (apenas `formData = {name, email}`) ✓
- Logout via POST (não GET) ✓
- Erros de credencial não distinguem usuário inexistente de senha errada ✓

### 13.5 Acessibilidade e UX

- Forms com `<label for=...>` corretos ✓
- `autocomplete="email"`, `"new-password"`, `"current-password"` apropriados ✓
- Confirmação de exclusão via `confirm()` inline ✓
- Cores de alerta com contraste razoável (escuro com texto claro) ✓
- **Melhoria**: usar `<dialog>` nativo ou modal customizado em vez de `confirm()` (mais flexível, melhor a11y).

### 13.6 Estratégia de Git

Cada uma das 6 funcionalidades foi entregue em branch própria, com PR independente e merge encadeado em ordem cronológica:

```
main
 ├─ feat/sequelize-models       (PR #1)
 ├─ feat/user-registration      (PR #2)
 ├─ feat/login-logout           (PR #3)
 ├─ feat/product-create         (PR #4)
 ├─ feat/product-crud           (PR #5)
 └─ feat/transactions           (PR #6)
```

Todos os 6 PRs foram mergeados em `main` com `--merge` (merge commit), preservando os commits originais. Estratégia recomendada para projetos onde rastreabilidade da decomposição em features é importante.

---

## 14. Apêndices

### 14.1 Glossário

| Termo | Definição |
|---|---|
| **PRG** | Post/Redirect/Get — padrão de evitar re-submit de form após sucesso. |
| **CSRF** | Cross-Site Request Forgery — ataque onde um site malicioso induz o navegador da vítima a executar uma ação autenticada. |
| **GRASP** | General Responsibility Assignment Software Patterns — padrões de atribuição de responsabilidade. |
| **MVC** | Model-View-Controller — padrão arquitetural de separação entre dados, apresentação e controle. |
| **SRP** | Single Responsibility Principle — uma classe/módulo deve ter uma única razão para mudar. |
| **ORM** | Object-Relational Mapping — camada que traduz entre objetos do código e tabelas relacionais. |

### 14.2 Referências

- Express: https://expressjs.com/
- Sequelize: https://sequelize.org/
- EJS: https://ejs.co/
- OWASP Top 10: https://owasp.org/Top10/
- Documentação do repositório: `README.md`

### 14.3 Histórico de auditorias

| Data | Versão | Autor | Notas |
|---|---|---|---|
| 2026-06-17 | 1.0 | Equipe Cloud Key | Auditoria inicial pós-entrega do Projeto 2 |

---

**Fim do documento.**
