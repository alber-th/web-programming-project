# Cloud Key

E-commerce de chaves (keys) de jogos digitais, inspirado na Nuuvem. Projeto acadêmico
da disciplina de **Programação para Web** (1º Semestre de 2026).

**Integrantes:** Alberth Cavalcanti, Filipe Andrade, Ivo Pinheiro e Lívia Fernandes.

## Stack

- **Node.js** + **Express** (backend, padrão MVC)
- **EJS** (view engine / templates)
- **Sequelize** + **PostgreSQL** (ORM + banco relacional)
- **dotenv**, **express-session**, **bcrypt**, **method-override**, **connect-flash**

## Estrutura de pastas

```
.
├── app.js                    # Entry point do Express
├── package.json
├── .env.example
├── public/                   # Arquivos estáticos
│   ├── css/
│   ├── js/
│   └── images/
└── src/
    ├── config/               # Config de DB e Sequelize
    ├── controllers/          # Lógica das rotas
    ├── middlewares/          # Auth, validações, etc.
    ├── models/               # Modelos Sequelize
    ├── routes/               # Definição de rotas
    ├── services/             # Regras de negócio reutilizáveis
    └── views/                # Templates EJS
        └── partials/
```

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

   Edite o arquivo `.env` com as credenciais do seu PostgreSQL.

4. Crie o banco de dados:

   ```bash
   createdb cloud_key
   ```

5. Rode o servidor em modo desenvolvimento (com auto-reload):

   ```bash
   npm run dev
   ```

   Ou em modo produção:

   ```bash
   npm start
   ```

6. Acesse [http://localhost:3000](http://localhost:3000).

## Scripts npm

| Script           | Descrição                                  |
| ---------------- | ------------------------------------------ |
| `npm start`      | Inicia o servidor com Node                 |
| `npm run dev`    | Inicia o servidor com nodemon (auto-reload)|

## Roadmap

- [x] Base do projeto (Express + EJS + estrutura MVC)
- [ ] Conexão com PostgreSQL via Sequelize
- [ ] Cadastro de usuário
- [ ] Login / Logout
- [ ] CRUD de produtos (chaves de jogos)
- [ ] CRUD de transações
