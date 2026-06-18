# Aderência ao Documento de Arquitetura

Análise da compatibilidade da implementação atual do Cloud Key com o **Documento de Arquitetura de Software (DAS)** do projeto.

| Campo | Valor |
|---|---|
| Documento de referência | `docs/Cloud Key - Documento Arquitetura.pdf` |
| Branch / versão analisada | `main` @ `ec6d215` |
| Data desta análise | 2026-06-18 |
| Aderência global ponderada | **~50%** |
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
9. [Gaps prioritários](#9-gaps-prioritários)
10. [Roadmap recomendado](#10-roadmap-recomendado)
11. [Histórico de revisões](#11-histórico-de-revisões)

---

## 1. Sumário executivo

A implementação atual cumpre fielmente as decisões **estruturais** do DAS — stack tecnológica, padrão MVC com camada de serviço, autenticação por e-mail/senha com hash bcrypt, autorização por role (CLIENTE/ADMIN) e organização do código em pacotes.

As lacunas se concentram em três frentes:

1. **Modelo de domínio incompleto**: das 5 entidades previstas no MER do DAS, apenas 2 estão implementadas como descritas (Usuário e parcialmente Jogo). **Key** e **ItemPedido** não existem; **Pedido** foi colapsado em `Transaction` sem composição.
2. **Caso de uso central (CU004 — Comprar key) muito simplificado**: a implementação atual é "compra de um clique" que apenas registra uma `Transaction`. O DAS prevê carrinho, checkout, validação de estoque de keys, integração com gateway de pagamento, reserva de chave e envio por e-mail.
3. **Integrações externas e atributos não-funcionais**: gateway de pagamento, serviço de e-mail, cache, paginação, escalabilidade horizontal, HTTPS — todos ausentes.

### Matriz de aderência

| Dimensão | Aderência | Status |
|---|---|---|
| Stack e organização MVC | **95%** | ✅ Alta |
| Casos de uso (7 previstos) | **57%** | ⚠️ 2 ausentes, 3 parciais |
| Modelo de domínio (5 entidades) | **40%** | ❌ Faltam Key e ItemPedido |
| CU004 (Comprar key) — caso central | **20%** | ❌ Implementação muito simplificada |
| QoS (8 atributos) | **38%** | ⚠️ Manutenibilidade/usabilidade OK; resto não |
| Integrações externas | **0%** | ❌ Gateway e e-mail ausentes |
| Visão de Implantação | **30%** | ⚠️ Só ambiente dev local |

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
| Gateway de pagamento isolado em service | `PagamentoService` não existe | ❌ Gap |

---

## 3. Casos de uso

Referência: DAS §4 — Visão de Casos de Uso. Status: ⚠️ **57% conforme** (4 OK, 1 parcial, 2 ausentes/críticos).

| Código | Caso de uso | Previsto pelo DAS | Implementação | Status |
|---|---|---|---|---|
| **CU001** | Cadastrar cliente | Validação + hash | `/register` com bcrypt + UNIQUE | ✅ |
| **CU002** | Autenticar (login/logout) | Sessão + rotas protegidas | `/login`, `/logout`, middleware | ✅ |
| **CU003** | Visualizar catálogo | Maior volume de acesso | Home vitrine + `/products` | ✅ |
| **CU004** | **Comprar key** | Carrinho → checkout → pagamento → key | One-click POST `/transactions`, sem carrinho/pagamento/key | ⚠️ Crítico — ver §5 |
| **CU005** | Gerenciar catálogo (CRUD jogos/keys) | Admin | CRUD de **jogos** ✅; CRUD de **keys** ❌ | ⚠️ Parcial |
| **CU006** | Gerenciar usuários | Admin | Sem UI; promoção a ADMIN via SQL manual | ❌ |
| **CU007** | Consultar histórico + visualizar chave | Cliente | Histórico ✅; chave entregue ❌ | ⚠️ Parcial |

---

## 4. Modelo de domínio (MER)

Referência: DAS §5 e Figura 3 — Modelo Entidade-Relacionamento. Status: ❌ **40% conforme** (incompleto).

### 4.1 Entidades

| Entidade DAS | Atributos previstos | Implementação | Aderência |
|---|---|---|---|
| **Usuário** | `id, nome, email, senha_hash, tipo, data_cadastro` | `User` com `id, name, email, passwordHash, role, createdAt, updatedAt` | ✅ Conforme (apenas renomeação `tipo → role`) |
| **Jogo** | `id, titulo, descricao, plataforma, genero, preco, ativo` | `Product` com `id, name, platform, price, stock, imageUrl, category` | ⚠️ Faltam `descricao` e `ativo`; extras: `stock`, `imageUrl` |
| **Key** | `id, codigo_key, id_jogo FK, status` | — | ❌ **Entidade não existe** |
| **Pedido** | `id, id_usuario FK, data_pedido, valor_total, status` | `Transaction` com `id, userId, productId, quantity, totalPrice` | ⚠️ Sem `status`; mistura Pedido + ItemPedido em uma só tabela |
| **ItemPedido** | `id, id_pedido FK, id_jogo FK, quantidade, preco_unitario` | — | ❌ **Entidade não existe** — Transaction colapsa o conceito |

### 4.2 Relacionamentos previstos vs implementados

| Relacionamento DAS | Implementação |
|---|---|
| Usuário 1:N Pedido | ✅ User 1:N Transaction |
| Pedido 1:N ItemPedido | ❌ Não há ItemPedido |
| ItemPedido N:1 Jogo | ❌ |
| Jogo 1:N Key | ❌ |
| ItemPedido 1:1 Key (no momento da venda) | ❌ |

### 4.3 Consequências

- Sem `Key`, o sistema não tem como **entregar a chave** ao cliente após a compra (parte essencial de CU004 e CU007).
- Sem `ItemPedido`, não há suporte a **múltiplos jogos em um único pedido** (carrinho com vários itens é impossível sem refator).
- Sem `status` em `Transaction`, não há como representar **pedido pendente / aprovado / cancelado** — todos são instantaneamente "concluídos".

---

## 5. CU004 — Comprar key (caso central)

Referência: DAS §6.1 — Visão de Implementação do CU004 (4 páginas, diagrama de classes e de sequência). Status: ❌ **~20% conforme** (apenas validação de sessão e cálculo de total).

O DAS dedica a maior parte da Visão de Implementação a este caso de uso por ser o que "melhor sintetiza as preocupações arquiteturais do Cloud Key, pois percorre praticamente todas as camadas e mecanismos do sistema". A implementação atual é uma redução agressiva desse fluxo.

### 5.1 Fluxo previsto pelo DAS

```
Cliente → Carrinho → Finalizar → Auth middleware → PedidoController
  → PedidoService:
     - validarCarrinho()
     - JogoRepository.buscarPorId() (preços)
     - KeyRepository.buscarDisponiveis() (estoque de keys)
     - calcularTotal()
     - PagamentoService.autorizarPagamento(Gateway)
     - [transação SQL] PedidoRepository.salvar(Pedido + ItemPedido)
     - KeyService.reservarKey() + marcarComoVendida()
     - atualizar Pedido.status = "concluído"
     - [opcional] EmailService.enviarConfirmacao(chave)
  → PedidoController renderiza tela de confirmação com chave
```

### 5.2 Comparativo etapa a etapa

| Etapa prevista | Status na implementação |
|---|---|
| Tela de carrinho/checkout | ❌ Inexistente |
| Middleware autentica sessão | ✅ `isAuthenticated` |
| `PedidoController` recebe finalização | ⚠️ `transactionController.createForCurrentUser` (sem carrinho) |
| `PedidoService` valida carrinho | ❌ |
| Consulta de disponibilidade no `KeyRepository` | ❌ Sem Key |
| Cálculo de `valor_total` | ✅ `totalPrice` server-side |
| `PagamentoService → Gateway` (autorização) | ❌ |
| Persistência transacional de Pedido + ItemPedido | ⚠️ Só `Transaction.create` direto (sem `sequelize.transaction()`) |
| `KeyService.reservarKey` + marcar como vendida | ❌ |
| Status do pedido vira "concluído" | ❌ Sem campo `status` |
| Envio de e-mail de confirmação + chave | ❌ |
| View de confirmação com chave entregue | ❌ Só `req.flash` + redirect |

---

## 6. Visão Lógica — camadas

Referência: DAS §5 e Figura 2 — Diagrama de Pacotes. Status: ✅ **Quase conforme** (com uma divergência aceitável).

| Camada DAS | Conteúdo previsto | Implementação | Status |
|---|---|---|---|
| **Apresentação** | Views/EJS + recursos estáticos | `src/views/` + `public/` | ✅ |
| **Aplicação/Controle** | Controllers + Routes + Middlewares de auth | `src/controllers/`, `src/routes/`, `src/middlewares/` | ✅ |
| **Domínio/Negócio** | Entidades + `PedidoService`, `PagamentoService`, `KeyService` | `src/services/user|product|transaction` | ⚠️ Faltam `PagamentoService` e `KeyService` |
| **Persistência/Infraestrutura** | Repositories (`JogoRepository`, `PedidoRepository`, `KeyRepository`) + adaptadores externos | `src/models/` (Sequelize direto, sem Repository) | ⚠️ Aceitável — services consomem models direto |

### 6.1 Sobre a camada de Repository

O DAS prevê uma camada de Repository explícita entre Services e Models. A implementação consome `Product.findByPk(...)` direto no Service. Pragmaticamente isso é aceitável (o próprio Sequelize age como Repository), mas diverge da arquitetura desenhada. Em projeto maior, separar Repository ajudaria a:

- testar Services com mocks de Repository sem precisar do banco;
- trocar de ORM sem refatorar regras de negócio;
- centralizar queries complexas em vez de espalhá-las nos services.

### 6.2 Nomenclatura: pt-BR vs en

O DAS define classes em pt-BR (`Jogo`, `Pedido`, `JogoController`, `PedidoService`); a implementação usa en (`Product`, `Transaction`, `productController`, `transactionService`). Tecnicamente aceitável, mas inconsistente com o artefato de referência.

---

## 7. Atributos de qualidade (QoS)

Referência: DAS §9 — Tabela 5. Status: ⚠️ **~38% conforme**.

| Atributo | Decisão prevista no DAS | Implementação | Aderência |
|---|---|---|---|
| **Disponibilidade** | Implantação redundante + monitoramento + alerta automático | Single-instance local | ❌ |
| **Escalabilidade** | Stateless + cache + balanceador | Sessão em memória do processo (não escalável horizontal) | ❌ |
| **Segurança** | Hash ✅, HTTPS ❌, autorização por perfil ✅, antifraude ❌ | Parcial | ⚠️ 50% |
| **Confiabilidade** | Persistência transacional + estoque de keys + estados | Sem `sequelize.transaction`, sem entidade Key | ❌ |
| **Manutenibilidade** | MVC + baixo acoplamento + adaptadores | MVC + services ✅; sem adaptadores externos | ✅ |
| **Usabilidade** | Responsiva + mensagens de erro + telas Figma | Responsivo (768/480px) + flash messages | ✅ |
| **Desempenho** | Cache + paginação + índices | Sem cache, sem paginação; índices só em `transactions` | ❌ |
| **Portabilidade** | Containers + config externalizada | `.env` ✅; Dockerfile ❌ | ⚠️ |

---

## 8. Visão de Implantação

Referência: DAS §7 e Figura 6 — Diagrama de Implantação. Status: ⚠️ **Só ambiente de desenvolvimento exercitado**.

| Componente DAS | Implementação |
|---|---|
| Três ambientes (dev, homol, prod) | `database.js` diferencia ambientes; só **dev** foi exercitado |
| Nó cliente (browser) | ✅ |
| Nó de aplicação (Node.js atrás de proxy/HTTPS) | ⚠️ Express direto, sem proxy reverso |
| Nó de banco dedicado | ⚠️ Postgres local na mesma máquina (não isolado) |
| Gateway de pagamento (externo via HTTPS) | ❌ |
| Serviço de e-mail (externo via HTTPS) | ❌ |
| TLS terminado no proxy reverso | ❌ Sem HTTPS |
| Balanceador para escalabilidade horizontal | ❌ |

---

## 9. Gaps prioritários

### 🔴 Alta — divergem do caso de uso central

1. **Criar entidades `Key` e `ItemPedido`** com migrations e models — base para tudo abaixo.
2. **Refatorar `Transaction` → `Pedido` + `ItemPedido`** com campo `status` (pendente/concluído/cancelado) e composição.
3. **Implementar carrinho** (sessão ou tabela) com telas `GET /cart`, `POST /cart/add`, `POST /cart/remove`, `GET /checkout`.
4. **Criar `KeyService`** para reserva e marcação de chaves; criar fluxo de "entrega da chave" pós-confirmação.

### 🟡 Média — completam o DAS

5. **`PagamentoService` + adapter de Gateway** (pode ser mock que sempre aprova, para fechar o fluxo arquitetural).
6. **CU006 — UI de gerenciamento de usuários** (listar, alterar role, desativar).
7. **Adicionar `descricao` e `ativo` em Product** — alinha com DAS e habilita soft delete.
8. **Envolver criação de pedido em `sequelize.transaction()`** — atomicidade prevista no DAS para Pedido+ItemPedido+Key.

### 🟢 Baixa — QoS / produção

9. **Paginação em `/products`** — DAS prevê 500–2.000 títulos no catálogo.
10. **Session store persistente** (ex: `connect-pg-simple`) — habilita escalabilidade horizontal.
11. **Dockerfile + docker-compose** — portabilidade prevista no DAS.
12. **CSRF + rate limiting** em `/login` e `/register`.
13. **HTTPS via proxy reverso** + headers de segurança em produção.

---

## 10. Roadmap recomendado

Sugestão de ordem de execução, agrupando os gaps em fases:

### Fase 1 — Domínio (alta prioridade, semana 1)
- Migration: criar `keys` (id, codigo, jogo_id, status)
- Migration: criar `order_items` (id, order_id, jogo_id, key_id, quantidade, preco_unitario)
- Migration: renomear `transactions` → `orders` + adicionar `status`, `data_pedido`, remover `productId`/`quantity`/`totalPrice` (ou recalcular)
- Models + associações

### Fase 2 — Carrinho e CU004 completo (semana 2)
- `cartService` (sessão como armazenamento simples)
- Views `/cart` e `/checkout`
- `PedidoService.criarPedido()` envolvendo `sequelize.transaction()`
- `KeyService.reservarKey()`
- View de confirmação com chave entregue

### Fase 3 — Integrações mock (semana 3)
- `PagamentoService` com adapter de Gateway mock (sempre aprova)
- `EmailService` com adapter mock (loga em console)
- Tela de confirmação com botão "Reenviar e-mail"

### Fase 4 — Gestão e QoS (semana 4)
- UI de gerenciamento de usuários (CU006)
- Paginação em `/products`
- Session store persistente
- Dockerfile + docker-compose

---

## 11. Histórico de revisões

| Data | Versão | Autor | Notas |
|---|---|---|---|
| 2026-06-18 | 1.0 | Equipe Cloud Key | Análise inicial pós-merge do `feat/home-storefront` |

---

**Fim do documento.**
