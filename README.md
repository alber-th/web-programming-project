# Cloud Key

E-commerce de chaves (keys) de jogos digitais, inspirado na Nuuvem. Projeto acadêmico
da disciplina de **Programação para Web** (1º Semestre de 2026).

**Integrantes:** Alberth Cavalcanti, Filipe Andrade, Ivo Pinheiro e Lívia Fernandes.

## Funcionalidades

Cobertura completa dos requisitos do Projeto 2 mais um fluxo de compra completo (carrinho, checkout, pagamento simulado, cancelamento):

1. **Cadastro de usuário** — `/register` com validação de campos, e-mail único e senha armazenada como hash bcrypt.
2. **Login / Logout** — sessão via `express-session`, cookie `httpOnly`, flash de boas-vindas e suporte a `returnTo`.
3. **Cadastro de produto** — `/products/new`, restrito a `ADMIN`.
4. **Listagem de produtos** — `/products` e Home (vitrine com carrossel de destaques), pública.
5. **Edição de produto** — `/products/:id/edit`, `ADMIN`.
6. **Exclusão de produto** — `DELETE /products/:id`, `ADMIN`. Bloqueia exclusão de produto com transações vinculadas.
7. **Carrinho de compras** — `req.session.cart` server-side (sem localStorage). Subtotal, taxas (10%) e total recalculados a cada request. Validação de estoque em add/update.
8. **Checkout com pagamento simulado** — form com máscara de cartão; serviço de pagamento mock (delay 1.5–2s) com outcome 80/15/5 (APPROVED/DECLINED/NETWORK_ERROR). Cria `Transaction` em `sequelize.transaction()` com `LOCK.UPDATE` + decremento atômico de estoque.
9. **Ciclo de vida do pedido** — status ENUM `PENDING → PROCESSING → COMPLETED | CANCELLED | FAILED`. Em falha de pagamento, estoque restaurado atomicamente.
10. **Cancelamento** — disponível para `PENDING`/`PROCESSING`. Modal CSS de confirmação; restaura estoque por item; grava motivo e timestamp.
11. **Histórico** — `/transactions` (próprias para CLIENTE, todas para ADMIN) + `/transactions/:id` com detalhes do pedido.

## Stack

- **Node.js** + **Express** (backend, padrão MVC)
- **EJS** (view engine / templates)
- **Sequelize** + **PostgreSQL** (ORM + banco relacional)
- **bcrypt** — hash de senhas
- **express-session** + **connect-flash** — autenticação por sessão e mensagens flash
- **method-override** — suporte a `PUT`/`DELETE` em forms HTML
- **dotenv** — variáveis de ambiente
- **nodemon** (dev) — auto-reload

## Arquitetura

Padrão **MVC** com camada de serviço para isolar regras de domínio (SRP / GRASP):

```
HTTP ──▶ routes/ ──▶ middlewares/ ──▶ controllers/ ──▶ services/ ──▶ models/ ──▶ DB
                    (auth, role)      (valida HTTP)    (regras)      (Sequelize)
```

- **Controllers** só lidam com HTTP: validam input, escolhem render/redirect, traduzem erros de domínio em UX.
- **Services** encapsulam regras de negócio (hash, cálculo de `totalPrice`, busca por e-mail) e desconhecem `req`/`res`.
- **Models** mantêm constraints estruturais (`UNIQUE`, `NOT NULL`, `ENUM`, validações Sequelize).
- **Middlewares** declaram política nas rotas (`isAuthenticated`, `requireRole('ADMIN')`) — controllers não conhecem roles.

## Domínio

```
User (1) ──< Transaction >── (1) Product
 id                            id
 name                          name
 email (unique)                platform
 passwordHash                  price (DECIMAL)
 role (CLIENTE | ADMIN)        stock
                              
Transaction
 id, userId, productId, quantity, totalPrice
```

Foreign keys com `ON DELETE RESTRICT` para preservar histórico de compras.

## Estrutura de pastas

```
.
├── app.js                       # Entry point (Express, session, flash, method-override, rotas)
├── package.json
├── .env.example
├── .sequelizerc                 # Aponta sequelize-cli para src/
├── public/                      # Arquivos estáticos
│   ├── css/style.css
│   ├── js/
│   └── images/
└── src/
    ├── config/
    │   └── database.js          # Config Sequelize por ambiente (NODE_ENV)
    ├── controllers/
    │   ├── homeController.js
    │   ├── userController.js    # register, login, logout
    │   ├── productController.js # CRUD completo
    │   └── transactionController.js
    ├── middlewares/
    │   └── auth.js              # isAuthenticated, requireRole(...roles)
    ├── migrations/
    │   ├── 20260617120000-create-users.js
    │   ├── 20260617120001-create-products.js
    │   └── 20260617120002-create-transactions.js
    ├── models/
    │   ├── index.js             # Ponto único: instancia Sequelize e auto-importa models
    │   ├── User.js
    │   ├── Product.js
    │   └── Transaction.js
    ├── routes/
    │   ├── index.js             # /
    │   ├── auth.js              # /register, /login, /logout
    │   ├── products.js          # /products (CRUD)
    │   └── transactions.js      # /transactions
    ├── services/
    │   ├── userService.js       # findByEmail, registerUser, verifyCredentials
    │   ├── productService.js    # create, list, findById, update, delete
    │   └── transactionService.js # createTransaction, listByUser, listAll
    ├── seeders/
    └── views/                   # Templates EJS
        ├── home.ejs
        ├── partials/            # head, header, footer, flash
        ├── auth/                # register.ejs, login.ejs
        ├── products/            # index.ejs, new.ejs, edit.ejs
        └── transactions/        # index.ejs
```

## Rotas e autorização

| Método | Rota                  | Acesso             | Descrição                                  |
| ------ | --------------------- | ------------------ | ------------------------------------------ |
| GET    | `/`                   | Público            | Home                                       |
| GET    | `/register`           | Público            | Form de cadastro                           |
| POST   | `/register`           | Público            | Cria usuário (role `CLIENTE` por padrão)   |
| GET    | `/login`              | Público            | Form de login                              |
| POST   | `/login`              | Público            | Autentica e cria sessão                    |
| POST   | `/logout`             | Logado             | Destrói sessão                             |
| GET    | `/products`           | Público            | Lista produtos                             |
| GET    | `/products/new`       | `ADMIN`            | Form de criação de produto                 |
| POST   | `/products`           | `ADMIN`            | Cria produto                               |
| GET    | `/products/:id/edit`  | `ADMIN`            | Form de edição                             |
| PUT    | `/products/:id`       | `ADMIN`            | Atualiza produto                           |
| DELETE | `/products/:id`       | `ADMIN`            | Exclui produto (bloqueia se tem transação) |
| GET    | `/cart`               | Público            | Lista itens do carrinho em sessão          |
| POST   | `/cart`               | Público            | Adiciona produto                           |
| POST   | `/cart/update`        | Público            | Atualiza quantidade (valida estoque)       |
| POST   | `/cart/remove`        | Público            | Remove item                                |
| POST   | `/cart/clear`         | Público            | Esvazia                                    |
| GET    | `/checkout`           | Logado             | Form de pagamento                          |
| POST   | `/checkout`           | Logado             | Cria Transaction + processa pagamento mock |
| GET    | `/transactions`       | Logado             | Próprias (CLIENTE) ou todas (ADMIN)        |
| GET    | `/transactions/:id`   | Logado             | Detalhe do pedido com itens e status       |
| POST   | `/transactions/:id/cancel` | Logado        | Cancela (PENDING/PROCESSING) + restaura estoque |

`PUT` e `DELETE` chegam via `method-override` lendo `?_method=PUT/DELETE` em forms POST.

## Como rodar localmente

### Pré-requisitos

- Node.js 18+ e npm
- PostgreSQL 14+ rodando localmente (ou via Docker)

### Passos

1. Clone o repositório:

   ```bash
   git clone https://github.com/alber-th/web-programming-project.git
   cd web-programming-project
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

   Edite o `.env` com as credenciais do PostgreSQL e um `SESSION_SECRET` qualquer.

4. Crie o banco e rode as migrations:

   ```bash
   createdb cloud_key
   npm run db:migrate
   ```

5. Rode o servidor:

   ```bash
   npm run dev        # com auto-reload via nodemon
   # ou
   npm start          # produção
   ```

6. Acesse [http://localhost:3000](http://localhost:3000).

### Criando um usuário ADMIN

A tela de cadastro sempre cria usuários com role `CLIENTE`. Para testar as funcionalidades de admin (criar/editar/excluir produtos, ver todas as transações), promova um usuário direto no banco:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'voce@exemplo.com';
```

Depois faça logout/login para a sessão pegar o novo role.

## Scripts npm

| Script                       | Descrição                                                 |
| ---------------------------- | --------------------------------------------------------- |
| `npm start`                  | Inicia o servidor com Node                                |
| `npm run dev`                | Inicia com nodemon (auto-reload)                          |
| `npm run db:migrate`         | Aplica migrations pendentes                               |
| `npm run db:migrate:undo`    | Reverte a última migration                                |
| `npm run db:migrate:undo:all`| Reverte todas as migrations                               |
| `npm run db:seed`            | Roda seeders (se existirem)                               |
| `npm run db:seed:undo`       | Reverte seeders                                           |

## Variáveis de ambiente

Veja `.env.example`. Resumo:

| Variável         | Padrão        | Descrição                                       |
| ---------------- | ------------- | ----------------------------------------------- |
| `NODE_ENV`       | `development` | Ambiente Node                                   |
| `PORT`           | `3000`        | Porta do servidor                               |
| `SESSION_SECRET` | —             | Secret para assinar o cookie de sessão          |
| `DB_DIALECT`     | `postgres`    | Driver Sequelize                                |
| `DB_HOST`        | `localhost`   | Host do Postgres                                |
| `DB_PORT`        | `5432`        | Porta do Postgres                               |
| `DB_NAME`        | `cloud_key`   | Nome do banco                                   |
| `DB_USER`        | `postgres`    | Usuário do Postgres                             |
| `DB_PASSWORD`    | `postgres`    | Senha do Postgres                               |

## Roadmap

- [x] Base do projeto (Express + EJS + estrutura MVC)
- [x] Conexão com PostgreSQL via Sequelize (models e migrations)
- [x] Cadastro de usuário com hash bcrypt
- [x] Login / Logout com sessão
- [x] Middleware de autenticação (`isAuthenticated`) e autorização por role (`requireRole`)
- [x] CRUD de produtos (chaves de jogos)
- [x] Registro de transações (compra do usuário logado)
- [x] Carrinho com múltiplos itens (TransactionItem)
- [x] Checkout com pagamento simulado e ciclo de vida do pedido
- [x] Decremento e restauração de estoque atômicos em `sequelize.transaction()`
- [x] Cancelamento de pedido com modal e motivo
- [ ] Entidade `Key` (chave digital única) + `KeyService.reservarKey`
- [ ] Envio de e-mail de confirmação com chave (mock)
- [ ] Gerenciamento de usuários (CRUD admin)
- [ ] Proteção CSRF nos forms
- [ ] Paginação na listagem de produtos e transações

## Histórico de entregas

Cada feature foi entregue em uma branch e PR independente:

1. `feat/sequelize-models` — Sequelize, models User e Product, migrations.
2. `feat/user-registration` — `/register` + UserService + bcrypt.
3. `feat/login-logout` — sessão, `isAuthenticated`, `/login` e `/logout`.
4. `feat/product-create` — `requireRole('ADMIN')`, `POST /products`.
5. `feat/product-crud` — listagem, edição, exclusão (`method-override`).
6. `feat/transactions` — model Transaction com FKs `RESTRICT`, botão Comprar, listagem por role.
7. `feat/home-storefront` — vitrine com carrossel de destaques (GTA 6 pré-venda) e CTA admin no hero.
8. `feat/cart-and-checkout` — carrinho em sessão, checkout com pagamento mockado, TransactionItem, ciclo de vida do pedido, cancelamento atômico.
