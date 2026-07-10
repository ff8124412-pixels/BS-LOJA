# BS Materiais de Construção - ERP System

## 1. Project Description
Sistema de Gestão Empresarial (ERP) completo e moderno para a BS Materiais de Construção. O sistema centraliza todos os processos operacionais, financeiros e fiscais da empresa, garantindo eficiência, escalabilidade e total controle administrativo. Desenvolvido para uso via navegador web, com suporte a operação híbrida (online/offline) e sincronização automática de dados.

**Criador:** Daniel  
**Empresa:** BS Materiais de Construção  
**Público-alvo:** Equipe interna (Administrador, Gerente, Vendedor, Caixa, Estoquista, Contador)

## 2. Page Structure

- `/` - Dashboard (visão geral com métricas e gráficos)
- `/inventory` - Gestão de Estoque
- `/sales` - Vendas & Pedidos
- `/finance` - Financeiro & Faturamento
- `/accounting` - Contabilidade & Relatórios (acesso restrito ao Contador)
- `/settings` - Configurações do Sistema
- `/login` - Tela de Login (com 2FA)
- `*` - Página 404

## 3. Core Features

### Segurança e Controle de Acesso
- [ ] Login seguro com criptografia de senhas (bcrypt)
- [ ] Autenticação em duas etapas (2FA)
- [ ] Recuperação e redefinição de senha por e-mail
- [ ] Controle de sessão com logout automático por inatividade
- [ ] Bloqueio de conta após múltiplas tentativas inválidas
- [ ] Controle de permissões por níveis (Admin, Gerente, Vendedor, Caixa, Estoquista, Contador)
- [ ] Registro completo de logs de auditoria
- [ ] Conformidade com LGPD
- [ ] Backups automáticos com restauração
- [ ] Proteção contra SQL Injection, XSS e CSRF

### Dashboard
- [ ] Cards de métricas (Vendas do Dia, Pedidos Pendentes, Estoque Crítico, Contas a Receber)
- [ ] Gráfico de faturamento mensal
- [ ] Top produtos mais vendidos
- [ ] Atividades recentes / log de ações

### Gestão de Estoque
- [ ] Cadastro e edição de produtos (nome, SKU, categoria, preço, quantidade)
- [ ] Alertas de estoque crítico
- [ ] Filtros avançados por categoria, status, faixa de preço
- [ ] Geração de pedidos de compra
- [ ] Histórico de movimentações

### Vendas & Pedidos
- [ ] Registro de vendas (PDV simplificado)
- [ ] Listagem e gestão de pedidos
- [ ] Status de pedidos (Pendente, Em andamento, Concluído, Cancelado)
- [ ] Histórico de vendas por período
- [ ] Emissão de NF-e e NFC-e

### Financeiro & Faturamento
- [ ] Contas a receber e a pagar
- [ ] Fluxo de caixa
- [ ] Emissão e gestão de notas fiscais
- [ ] Relatórios financeiros por período
- [ ] Exportação em PDF, Excel e CSV

### Contabilidade & Relatórios (Acesso Exclusivo Contador)
- [ ] Autenticação adicional para acesso
- [ ] Relatórios de faturamento bruto e líquido
- [ ] Apuração de impostos (DAS, ICMS, ISS)
- [ ] Relatórios compatíveis com Simples Nacional, SPED Fiscal e DRE
- [ ] Download de NF-e e NFC-e
- [ ] Exportação em PDF, Excel e CSV

### Configurações do Sistema
- [ ] Gestão de usuários e permissões
- [ ] Logs de auditoria completos
- [ ] Configuração de backups automáticos
- [ ] Configurações gerais da empresa
- [ ] Integrações com sistemas externos

## 4. Data Model Design
(Requer Supabase para persistência real)

### Table: users
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| name | text | Nome completo |
| email | text | E-mail único |
| role | enum | Admin/Gerente/Vendedor/Caixa/Estoquista/Contador |
| is_active | boolean | Status da conta |
| failed_attempts | int | Tentativas de login inválidas |
| created_at | timestamp | Data de criação |

### Table: products
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| sku | text | Código único do produto |
| name | text | Nome do produto |
| category | text | Categoria |
| price | decimal | Preço de venda |
| cost | decimal | Preço de custo |
| quantity | int | Quantidade em estoque |
| min_quantity | int | Estoque mínimo (alerta) |
| created_at | timestamp | Data de criação |

### Table: sales
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| customer_name | text | Nome do cliente |
| total | decimal | Valor total |
| status | enum | Pendente/Concluído/Cancelado |
| seller_id | uuid | FK para users |
| created_at | timestamp | Data da venda |

### Table: audit_logs
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK para users |
| action | text | Ação realizada |
| module | text | Módulo acessado |
| ip_address | text | IP de origem |
| created_at | timestamp | Data/hora |

## 5. Backend / Third-party Integration Plan
- **Supabase**: Necessário para autenticação real (Auth), banco de dados (PostgreSQL), armazenamento de arquivos (Storage) e funções de backend (Edge Functions). Essencial para operação em produção.
- **Shopify**: Não necessário
- **Stripe**: Não necessário
- **Outros**: Integração futura com sistemas de emissão de NF-e (SEFAZ)

## 6. Development Phase Plan

### Phase 1: Layout Base + Dashboard ✅ (Atual)
- Goal: Criar a estrutura visual completa do ERP com sidebar, header e Dashboard funcional
- Deliverable: Interface navegável com todas as seções acessíveis e Dashboard com dados mock

### Phase 2: Gestão de Estoque
- Goal: Módulo completo de controle de produtos e estoque
- Deliverable: CRUD de produtos, alertas de estoque, filtros e busca

### Phase 3: Vendas & Pedidos
- Goal: Módulo de registro e gestão de vendas
- Deliverable: PDV simplificado, listagem de pedidos, histórico de vendas

### Phase 4: Financeiro & Faturamento
- Goal: Módulo financeiro com contas e notas fiscais
- Deliverable: Contas a receber/pagar, fluxo de caixa, gestão de NF

### Phase 5: Contabilidade & Relatórios
- Goal: Área exclusiva do contador com relatórios fiscais
- Deliverable: Dashboard contábil, apuração de impostos, exportação de relatórios

### Phase 6: Configurações & Segurança
- Goal: Gestão de usuários, permissões e logs de auditoria
- Deliverable: CRUD de usuários, controle de acesso, logs completos

### Phase 7: Supabase Integration
- Goal: Conectar ao banco de dados real e autenticação
- Deliverable: Sistema funcional com dados reais, 2FA, backup automático
