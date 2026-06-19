# Aderência ao Documento de Arquitetura

Análise da compatibilidade da implementação atual do Cloud Key com o **Documento de Arquitetura de Software (DAS)** do projeto.

| Campo | Valor |
|---|---|
| Documento de referência | `docs/Cloud Key - Documento Arquitetura.pdf` |
| Branch / versão analisada | `main` (após `feat/cart-and-checkout`) |
| Data desta análise | 2026-06-19 |
| Aderência global ponderada | **~75%** (era ~50% em 2026-06-18) |
| Documento relacionado | [`cloud-key-auditoria-tecnica.md`](./cloud-key-auditoria-tecnica.md) |

---

## Sumário

1. [Sumário executivo](#1-sumário-executivo)
2. [Stack e padrões](#2-stack-e-padrões)
3. [Casos de uso](#3-casos-de-uso)
4. [Modelo de domínio (MER)](#4-modelo-de-domínio-mer)
5. [CU004 — Comprar key (caso central)](#5-cu004--comprar-key-caso-central)
6. [Visão Lógica — camadas](#6-visão-lógica--camadas)
7. [Atributos de qualidade (QoS)](#7-atributos-de-qualidade-qos)
8. [Visão de Implantação](#8-visão-de-implantação)
9. [Gaps restantes](#9-gaps-restantes)
10. [Roadmap restante](#10-roadmap-restante)
11. [Histórico de revisões](#11-histórico-de-revisões)

---

## 1. Sumário executivo

A implementação cumpre as decisões **estruturais** do DAS (stack, MVC, autenticação, autorização) e, com a entrega de **carrinho + checkout + simulador de pagamento + cancelamento atômico**, fechou a maior parte dos gaps das Fases 1 e 2 do roadmap.

**Lacunas ainda em aberto:**

1. **Entidade `Key`** (chave digital entregue ao cliente) — não implementada. Hoje a "entrega" é apenas o registro da compra; o DAS prevê uma chave única reservada por item.
2. **Serviço de e-mail** — confirmação e envio da chave por e-mail ainda mockados como ausentes.
3. **QoS não funcionais** — HTTPS, cache, paginação, escalabilidade horizontal: ainda não implementados.

### Matriz de aderência

| Dimensão | Aderência (antes) | Aderência (agora) | Status |
|---|---|---|---|
| Stack e organização MVC | 95% | **95%** | ✅ Alta |
| Casos de uso (7 previstos) | 57% | **75%** | ⚠️ CU007 ainda parcial (sem chave entregue) |
| Modelo de domínio (5 entidades) | 40% | **70%** | ⚠️ Falta `Key` |
| CU004 (Comprar key) — caso central | 20% | **85%** | ✅ Carrinho/checkout/pagamento/cancel feitos; falta entrega de Key |
| QoS (8 atributos) | 38% | **50%** | ⚠️ Confiabilidade melhorou (atômico + status); resto pendente |
| Integrações externas | 0% | **50%** | ✅ `PagamentoService` mockado; e-mail pendente |
| Visão de Implantação | 30% | **30%** | ⚠️ Ainda só dev local |

---

## 2. Stack e padrões

Referência: DAS §3 — Requisitos e restrições arquiteturais. Status: ✅ **Quase totalmente conforme**.

| DAS §3 | Implementação | Status |
|---|---|---|
| Node.js + Express | Express 4.19 | ✅ |
| EJS templates | EJS 3.1 | ✅ |
| MVC | + camada de Service (refinamento aceitável) | ✅ |
| ORM relacional (Sequelize OK) | Sequelize 6.37 | ✅ |
| PostgreSQL ou MySQL | PostgreSQL 16 | ✅ |
| Senhas como hash | bcrypt, 10 salt rounds | ✅ |
| Sessões em rotas restritas | `express-session` + `isAuthenticated` | ✅ |
| Autorização por tipo (cliente/admin) | `requireRole('ADMIN')` | ✅ |
| HTTPS / proxy reverso / TLS | Só HTTP em dev | ⚠️ Aceitável academicamente |
| Análise antifraude | Ausente | ❌ Fora do escopo prático |
| Gateway de pagamento isolado em service | `paymentService` mockado | ✅ Service isolado (gateway mockado por design) |

---

## 3. Casos de uso

Referência: DAS §4 — Visão de Casos de Uso. Status: ✅ **75% conforme** (5 OK, 1 parcial, 1 ausente).

| Código | Caso de uso | Previsto pelo DAS | Implementação | Status |
|---|---|---|---|---|
| **CU001** | Cadastrar cliente | Validação + hash | `/register` com bcrypt + UNIQUE | ✅ |
| **CU002** | Autenticar (login/logout) | Sessão + rotas protegidas | `/login`, `/logout`, middleware | ✅ |
| **CU003** | Visualizar catálogo | Maior volume de acesso | Home vitrine + `/products` | ✅ |
| **CU004** | **Comprar key** | Carrinho → checkout → pagamento → key | Carrinho ✅ + checkout ✅ + pagamento simulado ✅ + status lifecycle ✅. Sem entrega de Key. | ⚠️ 85% — falta entidade Key |
| **CU005** | Gerenciar catálogo (CRUD jogos/keys) | Admin | CRUD de **jogos** ✅; CRUD de **keys** ❌ | ⚠️ Parcial |
| **CU006** | Gerenciar usuários | Admin | Sem UI; promoção a ADMIN via SQL manual | ❌ |
| **CU007** | Consultar histórico + visualizar chave | Cliente | Histórico ✅ com status e detalhes; chave entregue ❌ | ⚠️ Parcial |

---

## 4. Modelo de domínio (MER)

Referência: DAS §5 e Figura 3 — Modelo Entidade-Relacionamento. Status: ⚠️ **70% conforme** (4 de 5 entidades, com Pedido completo).

### 4.1 Entidades

| Entidade DAS | Atributos previstos | Implementação | Aderência |
|---|---|---|---|
| **Usuário** | `id, nome, email, senha_hash, tipo, data_cadastro` | `User` com `id, name, email, passwordHash, role, createdAt, updatedAt` | ✅ Conforme |
| **Jogo** | `id, titulo, descricao, plataforma, genero, preco, ativo` | `Product` com `id, name, platform, price, stock, imageUrl, category` | ⚠️ Faltam `descricao` e `ativo` |
| **Key** | `id, codigo_key, id_jogo FK, status` | — | ❌ **Entidade ainda não existe** |
| **Pedido** | `id, id_usuario FK, data_pedido, valor_total, status` | `Transaction` com `id, userId, subtotal, taxes, totalPrice, status (ENUM), cardholderName, cardLastFour, cancellationReason, processingStartedAt, completedAt, cancelledAt, createdAt, updatedAt` | ✅ Conforme — status como ENUM cobrindo `PENDING/PROCESSING/COMPLETED/CANCELLED/FAILED` |
| **ItemPedido** | `id, id_pedido FK, id_jogo FK, quantidade, preco_unitario` | `TransactionItem` com `id, transactionId, productId, quantity, unitPrice, createdAt, updatedAt` | ✅ Conforme |

### 4.2 Relacionamentos previstos vs implementados

| Relacionamento DAS | Implementação |
|---|---|
| Usuário 1:N Pedido | ✅ `User` 1:N `Transaction` |
| Pedido 1:N ItemPedido | ✅ `Transaction.hasMany(TransactionItem)` |
| ItemPedido N:1 Jogo | ✅ `TransactionItem.belongsTo(Product)` |
| Jogo 1:N Key | ❌ Sem Key |
| ItemPedido 1:1 Key | ❌ Sem Key |

### 4.3 Consequências restantes

- Sem `Key`, **não há entrega de chave após COMPLETED**. O sistema sabe que a compra foi paga, mas não atribui código de ativação único.
- Pequena ambiguidade de nomenclatura: a entidade que persiste o Pedido se chama `Transaction` (en) em vez de `Pedido` (pt-BR do DAS). Aceitável (ver §6.2).

---

## 5. CU004 — Comprar key (caso central)

Referência: DAS §6.1 — Visão de Implementação do CU004. Status: ✅ **~85% conforme**.

### 5.1 Comparativo etapa a etapa (atualizado)

| Etapa prevista | Status |
|---|---|
| Tela de carrinho/checkout | ✅ `cart/index.ejs` e `checkout/index.ejs` |
| Auth middleware no checkout | ✅ `isAuthenticated` em `POST /checkout` |
| `PedidoController` recebe finalização | ✅ `checkoutController.submit` |
| Service valida carrinho | ✅ `transactionService.checkout` re-checa estoque e produtos |
| Consulta `KeyRepository` p/ disponibilidade | ❌ Sem Key |
| Cálculo de `valor_total` server-side | ✅ Inclui subtotal + taxes (10%) |
| `PagamentoService → Gateway` | ✅ Mock com distribuição 80/15/5 (APPROVED/DECLINED/NETWORK_ERROR) |
| Persistência transacional (Pedido + ItemPedido) | ✅ Em `sequelize.transaction()` com `LOCK.UPDATE` |
| `KeyService.reservarKey` | ❌ |
| `Pedido.status = 'concluído'` | ✅ ENUM transita para COMPLETED após APPROVED |
| Envio de e-mail com chave | ❌ |
| View de confirmação com chave entregue | ⚠️ Tela `/transactions/:id` mostra detalhes do pedido; chave ainda não |

### 5.2 Ciclo de vida do pedido (implementado)

```
[checkout submetido]
   ↓
PENDING (instantâneo) → PROCESSING (em sequelize.transaction + LOCK.UPDATE + decrement estoque)
   ↓
[paymentService.authorize delay 1.5–2s]
   ↓
   ├─ APPROVED → COMPLETED + completedAt
   ├─ DECLINED → FAILED + restaura estoque atomicamente + cancellationReason
   └─ NETWORK_ERROR → FAILED + restaura estoque + cancellationReason

[botão "Cancelar" disponível em PENDING ou PROCESSING]
   ↓
CANCELLED + restaura estoque + cancellationReason + cancelledAt
```

---

## 6. Visão Lógica — camadas

Referência: DAS §5 e Figura 2 — Diagrama de Pacotes. Status: ✅ **Quase conforme** (com divergências aceitáveis).

| Camada DAS | Conteúdo previsto | Implementação | Status |
|---|---|---|---|
| **Apresentação** | Views/EJS + recursos estáticos | `src/views/` + `public/` (com JS de checkout/modal vanilla) | ✅ |
| **Aplicação/Controle** | Controllers + Routes + Middlewares de auth | `src/controllers/`, `src/routes/`, `src/middlewares/` | ✅ |
| **Domínio/Negócio** | Entidades + `PedidoService`, `PagamentoService`, `KeyService` | `userService`, `productService`, `transactionService`, `cartService`, `paymentService` | ⚠️ Falta `KeyService` |
| **Persistência/Infraestrutura** | Repositories + adaptadores | `src/models/` (Sequelize direto, sem Repository explícito) | ⚠️ Aceitável |

### 6.1 Sobre a camada de Repository

Mantida observação anterior: aceitável academicamente; em projeto maior, separar Repository ajudaria testabilidade.

### 6.2 Nomenclatura: pt-BR vs en

Mantida: `Product` em vez de `Jogo`, `Transaction` em vez de `Pedido`, `TransactionItem` em vez de `ItemPedido`. Tecnicamente aceitável, inconsistente com o DAS.

---

## 7. Atributos de qualidade (QoS)

Referência: DAS §9 — Tabela 5. Status: ⚠️ **~50% conforme** (subiu de 38% — Confiabilidade subiu para conforme).

| Atributo | Decisão prevista no DAS | Implementação | Aderência |
|---|---|---|---|
| **Disponibilidade** | Implantação redundante + monitoramento + alerta | Single-instance local | ❌ |
| **Escalabilidade** | Stateless + cache + balanceador | Sessão em memória do processo | ❌ |
| **Segurança** | Hash ✅, HTTPS ❌, autorização ✅, antifraude ❌ | Parcial | ⚠️ |
| **Confiabilidade** | Persistência transacional + estoque + estados | ✅ `sequelize.transaction()` + `LOCK.UPDATE` + ENUM de status + restauração atômica de estoque | ✅ Conforme |
| **Manutenibilidade** | MVC + baixo acoplamento + adaptadores | MVC + services ✅ | ✅ |
| **Usabilidade** | Responsiva + mensagens de erro | Responsivo (768/480px) + flash + modal CSS | ✅ |
| **Desempenho** | Cache + paginação + índices | Sem cache, sem paginação; índices em FKs de items | ❌ |
| **Portabilidade** | Containers + config externalizada | `.env` ✅; Dockerfile ❌ | ⚠️ |

---

## 8. Visão de Implantação

Referência: DAS §7. Status: ⚠️ **Só dev local** (sem mudança).

| Componente DAS | Implementação |
|---|---|
| Três ambientes (dev, homol, prod) | Só **dev** exercitado |
| Nó cliente (browser) | ✅ |
| Nó de aplicação (Node atrás de proxy/HTTPS) | ⚠️ Express direto |
| Nó de banco dedicado | ⚠️ Postgres local na mesma máquina |
| Gateway de pagamento (externo via HTTPS) | ⚠️ Service mockado |
| Serviço de e-mail (externo via HTTPS) | ❌ |
| TLS terminado no proxy reverso | ❌ |
| Balanceador para escalabilidade horizontal | ❌ |

---

## 9. Gaps restantes

### 🔴 Alta — completam o CU004 do DAS

1. **Criar entidade `Key`** com `codigo_key, jogo_id, status (DISPONIVEL/VENDIDA/EXPIRADA)`.
2. **`KeyService.reservarKey()`** integrado ao fluxo de checkout — reserva e marca como vendida atomicamente.
3. **Exibir a chave entregue** na tela `/transactions/:id` após COMPLETED.

### 🟡 Média

4. **`EmailService` mockado** — adapter que loga no console; envio de confirmação + chave no COMPLETED.
5. **CU006 — UI de gerenciamento de usuários** (listar, alterar role, desativar).
6. **Adicionar `descricao` e `ativo` em Product**.
7. **Coluna "descrição" no catálogo** para mostrar.

### 🟢 Baixa — QoS / produção

8. **Paginação em `/products`** (DAS prevê 500–2.000 títulos).
9. **Session store persistente** (`connect-pg-simple`) — escalabilidade horizontal.
10. **Dockerfile + docker-compose**.
11. **CSRF + rate limiting** em `/login`, `/register`, `/checkout`.
12. **HTTPS via proxy reverso** em produção.
13. **Drop das colunas legadas** `productId/quantity` em `transactions` (mantidas como nullable após o refactor).

---

## 10. Roadmap restante

### Fase 3 — Domínio + integrações mock (1 semana)
- Migration: criar `keys` (id, codigo, jogo_id, status, transaction_item_id FK opcional)
- `KeyService.reservarKey()` no checkout
- View `/transactions/:id` mostra chave após COMPLETED
- `EmailService` com adapter mock (console.log)

### Fase 4 — Gestão e QoS (1 semana)
- UI de gerenciamento de usuários (CU006)
- Adicionar `descricao` e `ativo` em Product
- Paginação em `/products`
- Session store persistente
- Dockerfile + docker-compose

### Fase 5 — Hardening (a definir)
- CSRF
- Rate limiting
- HTTPS + proxy reverso

---

## 11. Histórico de revisões

| Data | Versão | Autor | Notas |
|---|---|---|---|
| 2026-06-18 | 1.0 | Equipe Cloud Key | Análise inicial pós-merge do `feat/home-storefront` |
| 2026-06-19 | 1.1 | Equipe Cloud Key | Pós `feat/cart-and-checkout`: aderência 50% → 75%. CU004 de 20% → 85%. Fechados ItemPedido, status de Pedido, carrinho, pagamento mockado, atomicidade. Gaps restantes consolidados em §9. |

---

**Fim do documento.**
