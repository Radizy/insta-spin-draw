# SISTEMA FILALAB - DOCUMENTAÇÃO COMPLETA

## 📋 VISÃO GERAL DO SISTEMA

**FilaLab** é uma plataforma completa de gestão de filas e entregas (roteirização) para franquias, focada em otimizar operações logísticas com motoboys. O sistema oferece controle centralizado para super administradores, gestão autônoma para franquias e interface dedicada para entregadores.

### Níveis de Acesso
- **Super Administrador**: Controle total do sistema, gestão de franquias, planos e módulos
- **Admin Franquia**: Gestão de suas unidades, usuários e configurações
- **Operador**: Acesso às telas operacionais (Roteirista, TV, Fila de Pagamento)
- **Motoboy**: Portal dedicado para check-in e visualização de status

### Gestão de Módulos (Toggles)
O sistema conta com restrição de funcionalidades por pacote comercial baseada em módulos.
Os 4 módulos primordiais são:
1. **WhatsApp Avançado (`whatsapp`)**: Controla abas de configuração da Evolution API e envio de disparo de mensagens do motoboy de retorno e chamado automático.
2. **TV Premium (`tv_avancada`)**: Destrava customizações exclusivas como upload de fundo e sons da TV de chamada.
3. **Integração Planilha (`planilha`)**: Habilita o webhook do Google Sheets no painel de Histórico.
4. **Fila de Pagamento (`fila_pagamento`)**: Libera o uso da tela `/fila-pagamento` para o gerenciamento de senhas.
Esses módulos podem ser geridos livremente pelo painel Super Admin na visualização e edição de uma franquia.

---

## 🏗️ ARQUITETURA E TECNOLOGIAS

### Frontend
- **Framework**: React 18.3.1 com TypeScript
- **Roteamento**: React Router DOM v6.30.1
- **Páginas Principais**: 
  - `Landing Page / (Index)`: Apresentação comercial do sistema (Home, Módulos, Contato).
  - `/login`: Área restrita do sistema para franqueados e operadores.
- **Gerenciamento de Estado**: React Context API + TanStack Query v5.83.0
- **UI Components**: Shadcn/ui com Radix UI primitives
- **Estilização**: Tailwind CSS com design system customizado
- **Drag & Drop**: @hello-pangea/dnd v18.0.1

### Backend (Lovable Cloud/Supabase)
- **Banco de Dados**: PostgreSQL com Row Level Security (RLS)
- **Autenticação**: Sistema customizado baseado em `system_users`
- **Storage**: Supabase Storage (`motoboy_voices` para voz TTS offline e `franquia_media` para Galeria isolada por Franquia contendo Imagens, Vídeos e Áudios em geral)
- **Edge Functions**: Deno runtime para lógica serverless
- **Tempo Real**: Supabase Realtime para atualizações instantâneas

### Integrações Externas
- **ElevenLabs**: Text-to-Speech para chamadas de motoboys na TV
- **WhatsApp (Evolution API)**: Envio de mensagens automáticas
- **Google Sheets**: Webhook para exportação de dados
- **Asaas**: Gateway de pagamento para cobranças recorrentes

---

## 📊 ESTRUTURA DO BANCO DE DADOS

### TABELA: franquias
Armazena informações principais das franquias cadastradas no sistema.

**Estrutura:**
```sql
CREATE TABLE franquias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_franquia TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cpf_cnpj TEXT,
  email TEXT,
  telefone TEXT,
  status_pagamento TEXT DEFAULT 'ativo',
  data_registro TIMESTAMP WITH TIME ZONE DEFAULT now(),
  data_vencimento DATE,
  dias_trial INTEGER DEFAULT 7,
  plano_limite_lojas INTEGER DEFAULT 1,
  horario_reset TIME WITHOUT TIME ZONE DEFAULT '03:00:00',
  desconto_tipo TEXT DEFAULT 'nenhum',
  desconto_valor NUMERIC DEFAULT 0,
  desconto_percentual NUMERIC DEFAULT 0,
  desconto_recorrente BOOLEAN DEFAULT false,
  config_pagamento JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Dados Cadastrados:**

1. **Dom Fiorentino** (Franquia Principal)
   - ID: `6d1fd941-2756-4b04-8ac3-8dfd22ee83fe`
   - CPF/CNPJ: `48526877810`
   - Slug: `dom-fiorentino`
   - Status: `ativo`
   - Vencimento: `2026-01-30`
   - Limite Lojas: `3`
   - Desconto: 100% recorrente (percentual)
   - Plano: Pacote Completo (ID: `404b30bf-f308-42e4-a263-60acec5cba29`)
   - Módulos Ativos: WhatsApp, Planilha, Fila Pagamento, TV Avançada
   - Config Pagamento:
     ```json
     {
       "customer_id": "cus_000154694569",
       "plano_id": "404b30bf-f308-42e4-a263-60acec5cba29",
       "modulos_ativos": ["whatsapp", "planilha", "fila_pagamento", "tv_avancada"],
       "whatsapp": {
         "api_key": "E7BCA4BB4535-4C3C-8C97-744315F4DECE",
         "instance": "pizzaria",
         "url": "https://dom-evolution-api.adhwpy.easypanel.host/"
       },
        "tv_tts": {
          "enabled": true,
          "voice_model": "elevenlabs",
          "volume": 100,
          "ringtone_id": "classic_short",
          "idle_time_seconds": 15
        }
     }
     ```

2. **teste** (Franquia de Teste)
   - ID: `688c5383-1cde-4345-a0b1-aee5b04cd071`
   - CPF/CNPJ: `99999999999`
   - Email: `teste@test.com`
   - Telefone: `99999999999`
   - Slug: `teste`
   - Status: `ativo`
   - Vencimento: `2026-01-08`
   - Limite Lojas: `1`
   - Plano: Pacote Completo
   - Valor Plano: `R$ 249,90`

**RLS Policies:**
```sql
CREATE POLICY "franquias_permissive_all" ON franquias FOR ALL USING (true) WITH CHECK (true);
```

---

### TABELA: unidades
Representa as lojas/unidades físicas de cada franquia.

**Estrutura:**
```sql
CREATE TABLE unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franquia_id UUID NOT NULL REFERENCES franquias(id) ON DELETE CASCADE,
  nome_loja TEXT NOT NULL,
  config_whatsapp JSONB,
  config_sheets_url TEXT,
  cidade_clima TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Dados Cadastrados:**

**Franquia Dom Fiorentino:**
1. **Itaquaquecetuba**
   - ID: `14bb566c-c8d0-4b96-8da7-8eecea2d6738`
   - Nome Loja: `Itaquaquecetuba`
   
2. **Poá**
   - ID: `82a71bed-9c87-48a4-8eaa-cb13ed2f3514`
   - Nome Loja: `Poá`
   
3. **Suzano**
   - ID: `f84d6f35-cf8f-48fd-965d-1d6d2fe0a204`
   - Nome Loja: `Suzano`

**Franquia teste:**
1. **testeloja**
   - ID: `a87f8cb1-10ce-4da1-a672-66a8bbf75595`
   - Nome Loja: `testeloja`

**RLS Policies:**
```sql
CREATE POLICY "unidades_permissive_all" ON unidades FOR ALL USING (true) WITH CHECK (true);
```

---

### TABELA: system_users
Usuários do sistema com controle de acesso e vinculação às unidades.

**Estrutura:**
```sql
CREATE TABLE system_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'user', -- ENUM: 'admin' ou 'user'
  unidade TEXT NOT NULL DEFAULT 'ITAQUA',
  franquia_id UUID REFERENCES franquias(id),
  unidade_id UUID REFERENCES unidades(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Lógica de Papéis:**
- `role = 'admin'` + `franquia_id IS NULL` → **Super Admin** (acesso total)
- `role = 'admin'` + `franquia_id NOT NULL` → **Admin Franquia** (acesso às suas unidades)
- `role = 'user'` → **Operador** (vinculado a uma unidade específica)

**Dados Cadastrados:**

1. **Radizy** (Super Admin)
   - ID: `29d6ecc8-94f6-4c22-bc78-e4b08eba5403`
   - Username: `Radizy`
   - Password: `1324`
   - Role: `admin`
   - Unidade: `ITAQUA`
   - Franquia: `NULL` (sem vinculação = super admin)

2. **fiscalisaque** (Admin Franquia - Dom Fiorentino)
   - ID: `1f7c46a5-cb5a-44b0-a557-f3b9be52ca6f`
   - Username: `fiscalisaque`
   - Password: `1324`
   - Role: `admin`
   - Franquia: `6d1fd941-2756-4b04-8ac3-8dfd22ee83fe` (Dom Fiorentino)
   - Acesso às 3 unidades (Itaqua, Poá, Suzano)

3. **expitaqua** (Operador - Itaquaquecetuba)
   - ID: `3f10c5f3-0b8c-4068-a284-a1323e328984`
   - Username: `expitaqua`
   - Password: `1324`
   - Role: `user`
   - Unidade: `ITAQUA`
   - Unidade ID: `14bb566c-c8d0-4b96-8da7-8eecea2d6738`

4. **expsuzano** (Operador - Suzano)
   - ID: `93d32a97-d63c-420c-93d8-9d764765ed81`
   - Username: `expsuzano`
   - Password: `123`
   - Role: `user`
   - Unidade: `SUZANO`
   - Unidade ID: `f84d6f35-cf8f-48fd-965d-1d6d2fe0a204`

5. **exppoa** (Operador - Poá)
   - ID: `19c77d8c-a5f0-46ba-948c-046922fd6acb`
   - Username: `exppoa`
   - Password: `1324`
   - Role: `user`
   - Unidade: `POA`
   - Unidade ID: `82a71bed-9c87-48a4-8eaa-cb13ed2f3514`

6. **teste** (Admin Franquia - teste)
   - ID: `d81f5cec-e8b9-436d-bd2c-70e1332ad394`
   - Username: `teste`
   - Password: `teste1`
   - Role: `admin`
   - Franquia: `688c5383-1cde-4345-a0b1-aee5b04cd071`

**RLS Policies:**
```sql
CREATE POLICY "system_users_permissive_all" ON system_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "system_users_select_for_login" ON system_users FOR SELECT USING (true);
```

---

### TABELA: user_unidades
Relacionamento muitos-para-muitos entre usuários e unidades (permite admin de franquia acessar múltiplas lojas).

**Estrutura:**
```sql
CREATE TABLE user_unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, unidade_id)
);
```

**Dados Cadastrados:**

| User | Unidade | Criado em |
|------|---------|-----------|
| expitaqua | Itaquaquecetuba | 2025-12-29 10:02:44 |
| expsuzano | Suzano | 2025-12-29 10:03:03 |
| fiscalisaque | Itaquaquecetuba | 2025-12-31 21:18:52 |
| fiscalisaque | Poá | 2025-12-31 21:18:52 |
| fiscalisaque | Suzano | 2025-12-31 21:18:52 |
| teste | testeloja | 2026-01-01 21:38:12 |

**RLS Policies:**
```sql
CREATE POLICY "Anyone can manage user_unidades" ON user_unidades FOR ALL USING (true) WITH CHECK (true);
```

---

### TABELA: entregadores
Cadastro de motoboys com informações de turnos, disponibilidade e tipo de bag.

**Estrutura:**
```sql
CREATE TABLE entregadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  unidade TEXT NOT NULL,
  unidade_id UUID REFERENCES unidades(id),
  franquia_id UUID REFERENCES franquias(id),
  status TEXT NOT NULL DEFAULT 'disponivel', -- disponivel, em_entrega, ausente
  tipo_bag TEXT DEFAULT 'normal',
  ativo BOOLEAN NOT NULL DEFAULT true,
  turno_inicio TIME WITHOUT TIME ZONE DEFAULT '16:00:00',
  turno_fim TIME WITHOUT TIME ZONE DEFAULT '02:00:00',
  usar_turno_padrao BOOLEAN DEFAULT true,
  dias_trabalho JSONB DEFAULT '{"seg":true,"ter":true,"qua":true,"qui":true,"sex":true,"sab":true,"dom":true}',
  fila_posicao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  hora_saida TIMESTAMP WITH TIME ZONE,
  tts_voice_path TEXT, -- Caminho do arquivo de voz no storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Exemplos de Motoboys Cadastrados (Unidade ITAQUA):**

| Nome | Telefone | Status | Tipo Bag | Ativo | Turno Padrão |
|------|----------|--------|----------|-------|--------------|
| Quilili | 11958397908 | disponivel | normal | false | 16h-02h |
| Isaque teste | 11992450059 | disponivel | normal | false | 16h-02h |
| Diogo | 11987705428 | disponivel | normal | false | 16h-02h |
| Juninho | 11985890285 | disponivel | normal | false | 16h-02h |
| Gustavo | 11987620341 | disponivel | normal | false | 16h-02h |
| Carlos | 11981000676 | disponivel | normal | false | 16h-02h |
| Robson | 11951097385 | disponivel | normal | false | 16h-02h |
| Deivison | 11982670285 | disponivel | normal | false | 16h-02h |
| Ciro | 11977468757 | disponivel | normal | false | 16h-02h |
| Renan | 11948592393 | disponivel | normal | false | 16h-02h |

**Nota:** Total de 50+ motoboys cadastrados. Campos `franquia_id` e `unidade_id` são `NULL` nos dados antigos (sistema legado), mas novas inserções devem preenchê-los.

**RLS Policies:**
```sql
CREATE POLICY "Anyone can create entregadores" ON entregadores FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view entregadores" ON entregadores FOR SELECT USING (true);
CREATE POLICY "Anyone can update entregadores" ON entregadores FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete entregadores" ON entregadores FOR DELETE USING (true);
```

---

### TABELA: historico_entregas
Registro de todas as entregas realizadas (saída e retorno).

**Estrutura:**
```sql
CREATE TABLE historico_entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entregador_id UUID NOT NULL REFERENCES entregadores(id) ON DELETE CASCADE,
  unidade TEXT NOT NULL,
  unidade_id UUID REFERENCES unidades(id),
  franquia_id UUID REFERENCES franquias(id),
  tipo_bag TEXT DEFAULT 'normal',
  hora_saida TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  hora_retorno TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

**Funcionalidades:**
- Registra check-in (hora_saida) e check-out (hora_retorno) dos motoboys
- Permite cálculo de tempo médio de entrega
- Histórico exportável para análises

**RLS Policies:**
```sql
CREATE POLICY "Anyone can create historico_entregas" ON historico_entregas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view historico_entregas" ON historico_entregas FOR SELECT USING (true);
CREATE POLICY "Anyone can update historico_entregas" ON historico_entregas FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete historico_entregas" ON historico_entregas FOR DELETE USING (true);
```

---

### TABELA: planos
Definição dos planos de assinatura disponíveis.

**Estrutura:**
```sql
CREATE TABLE planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL, -- mensal, trimestral, anual
  descricao TEXT,
  valor_base NUMERIC NOT NULL,
  forma_cobranca TEXT DEFAULT 'mensal',
  duracao_meses INTEGER NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT true,
  permite_trial BOOLEAN DEFAULT true,
  dias_trial INTEGER DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

**Dados Cadastrados:**

| Nome | Tipo | Valor Base | Duração | Trial | Descrição |
|------|------|------------|---------|-------|-----------|
| Pacote Básico | mensal | R$ 199,90 | 1 mês | 7 dias | Pacote básico mensal |
| Pacote Planilha + WhatsApp | mensal | R$ 249,90 | 1 mês | 7 dias | Pacote com integração de planilha e WhatsApp |
| Pacote Completo | mensal | R$ 299,90 | 1 mês | 7 dias | Pacote com todos os módulos ativos |

**RLS Policies:**
```sql
CREATE POLICY "Anyone can manage planos" ON planos FOR ALL USING (true) WITH CHECK (true);
```

---

### TABELA: modulos
Módulos opcionais que podem ser ativados nas unidades.

**Estrutura:**
```sql
CREATE TABLE modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_mensal NUMERIC DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Dados Cadastrados:**

| Código | Nome | Descrição | Preço Mensal | Ativo |
|--------|------|-----------|--------------|-------|
| whatsapp | WhatsApp Avançado | Templates personalizados e mensagens automáticas | R$ 0,00 | true |
| planilha | Integração Planilha | Webhook Google Sheets automático | R$ 0,00 | true |
| fila_pagamento | Fila de Pagamento | Sistema de senhas para pagamento | R$ 0,00 | true |
| tv_avancada | TV Premium | Animações exclusivas na tela da TV | R$ 0,00 | true |

**Nota:** Preço R$ 0,00 indica que os módulos estão inclusos nos pacotes comerciais.

**RLS Policies:**
```sql
CREATE POLICY "Anyone can manage modulos" ON modulos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read modulos" ON modulos FOR SELECT USING (true);
```

---

### TABELA: pacotes_comerciais
Pacotes comerciais pré-configurados com módulos inclusos.

**Estrutura:**
```sql
CREATE TABLE pacotes_comerciais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  plano_id UUID REFERENCES planos(id),
  preco_total NUMERIC NOT NULL,
  desconto_percent NUMERIC DEFAULT 0,
  modulos_inclusos JSONB DEFAULT '[]',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Dados Cadastrados:**

| Código | Nome | Preço | Módulos Inclusos | Plano Base |
|--------|------|-------|------------------|------------|
| basico | Pacote Básico | R$ 149,90 | [] | Pacote Básico |
| planilha_whatsapp | Pacote Planilha + WhatsApp | R$ 199,90 | [planilha, whatsapp] | Pacote Planilha + WhatsApp |
| completo | Pacote Completo | R$ 249,90 | [planilha, whatsapp, fila_pagamento, tv_avancada] | Pacote Completo |

**RLS Policies:**
```sql
CREATE POLICY "Anyone can manage pacotes_comerciais" ON pacotes_comerciais FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read pacotes_comerciais" ON pacotes_comerciais FOR SELECT USING (true);
```

---

### TABELA: unidade_modulos
Relacionamento entre unidades e módulos ativos.

**Estrutura:**
```sql
CREATE TABLE unidade_modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  modulo_codigo TEXT NOT NULL REFERENCES modulos(codigo),
  ativo BOOLEAN DEFAULT true,
  data_ativacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  data_expiracao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Nota:** Atualmente sem dados (módulos gerenciados via `franquias.config_pagamento.modulos_ativos`).

**RLS Policies:**
```sql
CREATE POLICY "Anyone can manage unidade_modulos" ON unidade_modulos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read unidade_modulos" ON unidade_modulos FOR SELECT USING (true);
```

---

### TABELA: tv_playlist
Armazena a fila de exibição (Screensaver) do módulo de TV Premium de cada unidade ociosa.

**Estrutura:**
```sql
CREATE TABLE tv_playlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'imagem', 'video', 'youtube', 'clima'
  url TEXT,
  duracao INTEGER NOT NULL DEFAULT 15,
  volume INTEGER DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Funcionalidades:**
- Suporta playlists e vídeos independentes de YouTube
- Executa nativamente sem sobrecarregar servidor
- Conta com controle de volume deslizante e tempo por mídia

**RLS Policies:**
```sql
CREATE POLICY "tv_playlist_permissive_all" ON tv_playlist FOR ALL USING (true) WITH CHECK (true);
```

---

### TABELA: franquia_cobrancas
Registro de cobranças geradas para cada franquia (integração com Asaas).

**Estrutura:**
```sql
CREATE TABLE franquia_cobrancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franquia_id UUID NOT NULL REFERENCES franquias(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL, -- ID da cobrança no gateway (Asaas)
  gateway TEXT NOT NULL, -- asaas, stripe, etc
  status TEXT NOT NULL, -- pending, paid, overdue, canceled
  valor NUMERIC NOT NULL,
  vencimento TIMESTAMP WITH TIME ZONE,
  payload JSONB, -- Dados completos retornados pelo gateway
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

**RLS Policies:**
```sql
CREATE POLICY "franquia_cobrancas_permissive_all" ON franquia_cobrancas FOR ALL USING (true) WITH CHECK (true);
```

---

### TABELA: senhas_pagamento
Sistema de senhas para fila de pagamento (módulo fila_pagamento).

**Estrutura:**
```sql
CREATE TABLE senhas_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franquia_id UUID NOT NULL REFERENCES franquias(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  entregador_id UUID REFERENCES entregadores(id) ON DELETE SET NULL,
  entregador_nome TEXT,
  numero_senha TEXT NOT NULL,
  status TEXT DEFAULT 'aguardando', -- aguardando, chamado, atendido, cancelado
  chamado_em TIMESTAMP WITH TIME ZONE,
  atendido_em TIMESTAMP WITH TIME ZONE,
  expira_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**RLS Policies:**
```sql
CREATE POLICY "Anyone can manage senhas_pagamento" ON senhas_pagamento FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read senhas_pagamento" ON senhas_pagamento FOR SELECT USING (true);
```

---

### TABELA: franquia_bag_tipos
Tipos de bags customizados por franquia (Normal, Metro, etc).

**Estrutura:**
```sql
CREATE TABLE franquia_bag_tipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franquia_id UUID NOT NULL REFERENCES franquias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  audio_url TEXT, -- Áudio amarrado da galeria de mídia (opcional bypass ao motoboy_voices)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

**Dados Cadastrados (Franquia Dom Fiorentino):**

| Nome | Descrição | Ativo |
|------|-----------|-------|
| Normau | - | true |
| Metro | - | true |

**RLS Policies:**
```sql
CREATE POLICY "franquia_bag_tipos_permissive_all" ON franquia_bag_tipos FOR ALL USING (true) WITH CHECK (true);
```

---

### TABELA: unidade_bag_tipos
Relacionamento entre unidades e tipos de bags disponíveis.

**Estrutura:**
```sql
CREATE TABLE unidade_bag_tipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  bag_tipo_id UUID NOT NULL REFERENCES franquia_bag_tipos(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

**RLS Policies:**
```sql
CREATE POLICY "unidade_bag_tipos_permissive_all" ON unidade_bag_tipos FOR ALL USING (true) WITH CHECK (true);
```

---

### TABELAS AUXILIARES

#### global_config
Configurações globais do sistema (chave-valor).
```sql
CREATE TABLE global_config (
  id UUID PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

#### system_config
Configurações por unidade (nome da loja, webhook URL).
```sql
CREATE TABLE system_config (
  id UUID PRIMARY KEY,
  unidade TEXT NOT NULL,
  nome_loja TEXT,
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

#### logs_auditoria
Registro de ações importantes no sistema.
```sql
CREATE TABLE logs_auditoria (
  id UUID PRIMARY KEY,
  franquia_id UUID,
  usuario_email TEXT,
  acao TEXT,
  detalhes JSONB,
  created_at TIMESTAMP WITH TIME ZONE
);
```

#### whatsapp_templates
Templates de mensagens WhatsApp personalizáveis por unidade.
```sql
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY,
  unidade_id UUID NOT NULL,
  codigo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

#### whatsapp_historico
Histórico de mensagens enviadas via WhatsApp.
```sql
CREATE TABLE whatsapp_historico (
  id UUID PRIMARY KEY,
  unidade_id UUID NOT NULL,
  entregador_id UUID,
  telefone TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT,
  enviado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
);
```

#### api_keys
Chaves de API para integrações externas.
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  owner_type TEXT NOT NULL, -- franquia, unidade
  owner_id UUID NOT NULL,
  api_key_hash TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
);
```

#### unidade_payment_config
Configurações de gateways de pagamento por unidade.
```sql
CREATE TABLE unidade_payment_config (
  id UUID PRIMARY KEY,
  unidade_id UUID NOT NULL,
  gateway TEXT NOT NULL, -- asaas, mercadopago, etc
  config JSONB NOT NULL DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

#### unidade_planos
Planos associados às unidades (para cálculos de faturamento).
```sql
CREATE TABLE unidade_planos (
  id UUID PRIMARY KEY,
  unidade_id UUID NOT NULL,
  plano_id UUID NOT NULL,
  valor NUMERIC NOT NULL,
  desconto_percent NUMERIC DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE
);
```

---

## 🔐 POLÍTICAS DE ROW LEVEL SECURITY (RLS)

### Visão Geral
O sistema utiliza RLS permissivo (`USING (true)` e `WITH CHECK (true)`) em todas as tabelas. Isso significa que:

- ✅ **Qualquer usuário autenticado pode realizar qualquer operação**
- ⚠️ **A segurança é gerenciada na camada de aplicação** (AuthContext)
- 🔒 **Não há isolamento automático de dados por usuário/franquia no banco**

### Implementação Atual
```sql
-- Padrão aplicado em todas as tabelas principais
CREATE POLICY "nome_tabela_permissive_all" 
  ON nome_tabela 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
```

### ⚠️ RECOMENDAÇÕES DE SEGURANÇA

Para ambientes de produção, considere implementar RLS mais restritivo:

```sql
-- Exemplo: Isolar entregadores por franquia
CREATE POLICY "users_can_view_own_franchise_entregadores"
  ON entregadores
  FOR SELECT
  USING (
    franquia_id IN (
      SELECT franquia_id 
      FROM system_users 
      WHERE id = auth.uid()
    )
  );

-- Exemplo: Impedir modificação de franquias por não-admins
CREATE POLICY "only_admins_can_modify_franquias"
  ON franquias
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE id = auth.uid()
      AND role = 'admin'
      AND franquia_id IS NULL
    )
  );
```

---

## 🛠️ EDGE FUNCTIONS (SUPABASE)

### 1. elevenlabs-tts
**Rota:** `POST /elevenlabs-tts`  
**Descrição:** Gera áudio TTS usando ElevenLabs e salva no storage.  
**Input:**
```json
{
  "text": "Carlos",
  "voice_id": "opcional",
  "model_id": "opcional",
  "filename": "carlos.mp3"
}
```
**Output:** URL pública do arquivo de áudio gerado.

---

### 2. send-whatsapp
**Rota:** `POST /send-whatsapp`  
**Descrição:** Envia mensagem via Evolution API WhatsApp.  
**Input:**
```json
{
  "unidade_id": "uuid",
  "telefone": "11999999999",
  "mensagem": "Sua entrega está pronta!"
}
```
**Output:** Status do envio.

---

### 3. send-webhook
**Rota:** `POST /send-webhook`  
**Descrição:** Envia dados de entregas para webhook configurado (ex: Google Sheets).  
**Input:**
```json
{
  "unidade": "ITAQUA",
  "data": { "entregador": "Carlos", "hora_saida": "..." }
}
```

---

### 4. reset-daily
**Rota:** `POST /reset-daily`  
**Descrição:** Reseta status de motoboys diariamente (chamada via cron).  
**Ações:**
- Define todos motoboys como `disponivel`
- Limpa `hora_saida`
- Reseta `fila_posicao`

---

### 5. cleanup-old-data
**Rota:** `POST /cleanup-old-data`  
**Descrição:** Remove dados antigos do histórico de entregas (>90 dias).

---

### 6. criar-cobranca-franquia
**Rota:** `POST /criar-cobranca-franquia`  
**Descrição:** Cria cobrança no Asaas para franquia.  
**Input:**
```json
{
  "franquia_id": "uuid",
  "valor": 249.90,
  "vencimento": "2026-02-01"
}
```

---

### 7. webhook-asaas
**Rota:** `POST /webhook-asaas`  
**Descrição:** Recebe notificações de pagamento do Asaas e atualiza status.

---

### 8. sync-payment-status
**Rota:** `POST /sync-payment-status`  
**Descrição:** Sincroniza status de pagamento com Asaas manualmente.

---

### 9. update-franquias-status
**Rota:** `POST /update-franquias-status`  
**Descrição:** Atualiza status de pagamento das franquias baseado nas cobranças.

---

### 10. delete-expired-franchises
**Rota:** `POST /delete-expired-franchises`  
**Descrição:** Remove franquias de teste expiradas (trial + 30 dias).

---

### 11. clear-motoboy-voices
**Rota:** `POST /clear-motoboy-voices`  
**Descrição:** Remove arquivos de voz do storage para uma franquia.

---

### 12. api-payments-create
**Rota:** `POST /api-payments-create`  
**Descrição:** API pública para criar cobranças via API key.

---

### 13. api-store-status
**Rota:** `GET /api-store-status`  
**Descrição:** Retorna status público da loja (se está aberta/fechada baseado no turno).

---

### 14. webhooks-payments
**Rota:** `POST /webhooks-payments`  
**Descrição:** Endpoint genérico para receber webhooks de múltiplos gateways.

---

### 15. register-franchise
**Rota:** `POST /register-franchise`  
**Descrição:** Registra nova franquia com período de teste.  
**Input:**
```json
{
  "nome_franquia": "Pizzaria ABC",
  "cpf_cnpj": "12345678900",
  "email": "contato@abc.com",
  "telefone": "11999999999",
  "nome_loja": "Loja Centro",
  "plano_id": "uuid",
  "username": "admin_abc",
  "password": "senha123"
}
```
**Ações:**
1. Cria registro em `franquias`
2. Cria `unidades` (primeira loja)
3. Cria usuário admin em `system_users`
4. Vincula usuário à unidade em `user_unidades`
5. Associa plano em `unidade_planos` (se aplicável)

---

## 🎨 FUNCIONALIDADES PRINCIPAIS

### 1. Roteirista (/roteirista)
**Tela principal para gestão de entregas.**

**Funcionalidades:**
- **Drag & Drop:** Arraste motoboys entre "Na Fila" e "Em Entrega"
- **Check-in:** Registra saída do motoboy com tipo de bag
- **Check-out:** Registra retorno do motoboy
- **Não Apareceu:** Marca motoboy como ausente
- **Retornar à Fila:** Devolve motoboy de "Em Entrega" para "Na Fila"
- **Filtros:** Status (disponível, em entrega, ausente) e turno (manhã, tarde, noite)
- **Tempo Real:** Exibe tempo decorrido desde a saída
- **Tipos de Bag:** Customizável por franquia (Normal, Metro, etc)

**Fluxo:**
1. Motoboy aparece na coluna "Na Fila"
2. Operador arrasta para "Em Entrega" ou clica em "Check-in"
3. Sistema registra hora de saída em `historico_entregas`
4. Atualiza `entregadores.status = 'em_entrega'`
5. Ao retornar, operador clica em "Check-out"
6. Sistema registra `hora_retorno` e volta status para `disponivel`

**Integrações:**
- **WhatsApp:** Envia mensagem automática ao motoboy na saída (se módulo ativo)
- **Google Sheets:** Exporta dados da entrega via webhook (se configurado)
- **TV:** Atualiza tela de chamadas em tempo real

---

### 2. TV (/tv)
**Tela pública para chamar motoboys (exibida em TVs na loja).**

**Funcionalidades:**
- **Chamadas Visuais:** Animações exclusivas com nome do motoboy
- **TTS (Text-to-Speech):** Voz sintetizada via ElevenLabs
- **Toques Configuráveis:** 6 opções de ringtone
- **Volume Ajustável:** 0-100%
- **Modos de Voz:**
  - ElevenLabs (vozes customizadas por motoboy)
  - Browser TTS (fallback nativo)
- **Check-in Direto:** Modal para check-in sem sair da tela
- **Histórico de Chamadas:** Últimas 5 chamadas exibidas no rodapé

**Fluxo:**
1. Operador chama motoboy no Roteirista
2. Sistema dispara evento via Realtime Supabase
3. TV detecta evento e inicia animação
4. Reproduz toque + voz do nome do motoboy
5. Exibe animação por 10 segundos
6. Retorna ao estado de espera

**Configuração (franquia.config_pagamento.tv_tts):**
```json
{
  "enabled": true,
  "voice_model": "elevenlabs",
  "volume": 100,
  "ringtone_id": "classic_short",
  "eleven_voice_id": "opcional"
}
```

**Modo Ocioso (Screensaver & Widget Clima):**
1. O tempo mínimo inerte para ativar o modo ocioso é um Custom Slider definido na aba Config > TV de cada loja (entre 5 e 60 segundos, default: 15s).
2. Se o tempo da variável estourar sem uso de botões e sem novas chamadas de entrega, a TV recua.
3. Aciona nativamente o `play` nas listas do banco de dados `tv_playlist` (imagens, videos da Galeria `franquia_media` e YouTube iframe sync).
4. Se houver Clima, puxará dados abertos da "OpenWeatherMap" buscando a temperatura e ícone da `cidade_clima` cadastrada na configuração local da Unidade.
5. Qualquer movimento de mouse via operador muta, esconde e cessa a Playlist com repasse inteligente de posição temporal.

**Integração Galeria de Mídia (Storage `franquia_media`):**
- Os Franqueados possuem um gerenciador modal UI visual contendo abas nativas de (Fotos, Vídeos e Áudios).
- A API restringe e alimenta os uploads baseados no RLS vinculado ao próprio `franquia_id` do enviador para que lixos de outras lojas não colidam.
- Esses botões da Galeria e URLs estão dispostos na **Formulação da Playlist da TV**, na aba de **Configurações de Bags** para vozes e em **Edição de TtS do Motoboy** (como Bypass do sistema ElevenLabs convencional).

---

### 3. Meu Lugar (/meu-lugar)
**Portal para motoboys verificarem seu status.**

**Funcionalidades:**
- **Busca por Telefone:** Motoboy insere seu número
- **Visualização de Status:**
  - 🟢 Disponível: "Você está na fila!"
  - 🔴 Em Entrega: "Você está em entrega desde [hora]"
  - ⚫ Ausente: "Você está marcado como ausente"
- **Histórico Pessoal:** Últimas 10 entregas realizadas
- **Tempo Médio:** Cálculo automático do tempo de entrega

---

### 4. Fila de Pagamento (/fila-pagamento)
**Sistema de senhas para organizar pagamentos de motoboys.**

**Funcionalidades:**
- **Geração de Senhas:** Cria senha automática (formato: #001, #002...)
- **Chamada de Senhas:** Botão para chamar próxima senha
- **Status de Senhas:**
  - 🟡 Aguardando
  - 🔵 Chamada
  - 🟢 Atendida
  - 🔴 Cancelada
- **Expiração:** Senhas expiram após 24h
- **Histórico:** Visualização de senhas do dia

**Módulo:** Requer `fila_pagamento` ativo.

---

### 5. Configuração (/config)
**Painel de configuração da unidade.**

**Abas:**

#### 5.1 Motoboys
- Cadastro, edição e exclusão de motoboys
- Configuração de turnos personalizados
- Dias de trabalho da semana
- Geração de voz TTS individual
- Importação em lote via XLSX

#### 5.2 Usuários
- Gestão de operadores e admins da franquia
- Vinculação de usuários a múltiplas unidades
- Alteração de senha
- Controle de permissões

#### 5.3 Módulos
- Ativação/desativação de módulos opcionais
- Visualização de módulos inclusos no plano

#### 5.4 Webhook
- Configuração de URL do webhook (Google Sheets)
- Templates de mensagens WhatsApp
- Teste de envio

#### 5.5 Financeiro (Admin Franquia)
- Visualização do plano atual
- Status de pagamento
- Dias até vencimento
- Histórico de cobranças
- Botão "Pagar com PIX"
- Sincronização de status com Asaas

---

### 6. Super Admin (/admin)
**Dashboard administrativo global (acesso restrito ao Super Admin).**

**Abas:**

#### 6.1 Dashboard
- **Cards de Resumo:**
  - Faturamento Mensal Bruto
  - Faturamento Mensal Estimado (com descontos)
  - Total de Franquias Ativas
  - Novas Franquias (últimos 30 dias)
- **Tabela de Franquias:**
  - Nome, slug, status pagamento, vencimento
  - Faturamento mensal individual
  - Botões de ação (editar, descontos)

#### 6.2 Planos
- Cadastro de novos planos (mensal, trimestral, anual)
- Edição de valores e descrições
- Configuração de trial
- Ativação/desativação

#### 6.3 Módulos
- Cadastro de módulos opcionais
- Código único, nome, descrição
- Preço mensal
- Status ativo/inativo

#### 6.4 Pacotes
- Criação de pacotes comerciais
- Associação de plano base + módulos
- Definição de desconto percentual
- Preço total

#### 6.5 Descontos
- Atribuição de descontos por franquia
- **Tipos:**
  - Percentual (ex: 20% off)
  - Valor Fixo (ex: R$ 50 off)
- **Opções:**
  - Pontual (apenas próxima cobrança)
  - Recorrente (todas as cobranças futuras)
- **Visualização:** Desconto ativo exibido abaixo do botão
- **Remoção:** Botão "Remover desconto" quando aplicável

#### 6.6 Financeiro
- Visão consolidada de todas as franquias
- Faturamento mensal/trimestral/anual
- Franquias inadimplentes
- Cálculos consideram descontos ativos

---

### 7. Histórico (/historico)
**Consulta de entregas passadas.**

**Funcionalidades:**
- Filtros por data, unidade, entregador
- Exportação para Excel
- Cálculo de tempo médio de entrega
- Deleção de registros (admins)

---

### 8. Cadastro de Franquias (/register)
**Página pública para registro de novas franquias.**

**Campos:**
- Nome da franquia
- CPF/CNPJ
- Email e telefone
- Nome da primeira loja
- Seleção de plano
- Criação de usuário admin

**Processo:**
1. Usuário preenche formulário
2. Sistema chama edge function `register-franchise`
3. Cria franquia com status `trial`
4. Define `data_vencimento` = hoje + `dias_trial`
5. Cria unidade inicial
6. Cria usuário admin
7. Redireciona para login

**Trial:** 7 dias grátis por padrão.

---

## 🔄 FLUXOS PRINCIPAIS

### Fluxo 1: Check-in de Motoboy

```
Operador clica em "Check-in" no Roteirista
    ↓
Sistema abre modal para seleção de tipo de bag
    ↓
Operador confirma
    ↓
Sistema cria registro em historico_entregas:
  - entregador_id
  - hora_saida = NOW()
  - tipo_bag
  - unidade, unidade_id, franquia_id
    ↓
Atualiza entregadores:
  - status = 'em_entrega'
  - hora_saida = NOW()
    ↓
[Módulo WhatsApp] Envia mensagem ao motoboy (se ativo)
    ↓
[Módulo Planilha] Envia dados via webhook (se configurado)
    ↓
Tela TV é notificada via Realtime e exibe animação + voz
```

---

### Fluxo 2: Check-out de Motoboy

```
Motoboy retorna à loja
    ↓
Operador clica em "Check-out" no card do motoboy
    ↓
Sistema atualiza historico_entregas:
  - hora_retorno = NOW()
    ↓
Atualiza entregadores:
  - status = 'disponivel'
  - hora_saida = NULL
  - fila_posicao = NOW() (volta ao final da fila)
    ↓
[Opcional] Calcula tempo de entrega e exibe toast
```

---

### Fluxo 3: Cobrança Mensal Automática

```
Cronjob dispara edge function update-franquias-status
    ↓
Para cada franquia:
  - Verifica data_vencimento
  - Se vencido e sem pagamento:
    - status_pagamento = 'bloqueado'
    ↓
    - Bloqueia acesso ao Roteirista e TV
    - Permite acesso à aba Financeiro em Config
    ↓
Admin de franquia acessa /config?tab=financeiro
    ↓
Clica em "Pagar com PIX"
    ↓
Sistema chama criar-cobranca-franquia:
  - Calcula valor (plano + módulos - descontos)
  - Cria cobrança no Asaas
  - Salva em franquia_cobrancas
  - Retorna checkout_url
    ↓
Admin é redirecionado para página de pagamento Asaas
    ↓
Após pagamento, Asaas envia webhook para webhook-asaas
    ↓
Sistema atualiza:
  - franquia_cobrancas.status = 'paid'
  - franquias.status_pagamento = 'ativo'
  - franquias.data_vencimento = hoje + 30 dias
    ↓
Acesso ao sistema é liberado
```

---

### Fluxo 4: Aplicação de Desconto Recorrente

```
Super Admin acessa /admin → aba Descontos
    ↓
Seleciona franquia
    ↓
Preenche formulário:
  - Tipo: Percentual (ex: 20%)
  - Aplicar em: Imediatamente
  - Recorrente: SIM
    ↓
Clica em "Aplicar Desconto"
    ↓
Sistema atualiza franquias:
  - desconto_tipo = 'percentual'
  - desconto_percentual = 20
  - desconto_recorrente = true
    ↓
Próxima cobrança criada via criar-cobranca-franquia:
  - valor_base = plano + módulos
  - valor_final = valor_base * (1 - 0.20)
  - Exemplo: R$ 249,90 → R$ 199,92
    ↓
Desconto é exibido:
  - Na aba Financeiro da franquia
  - No dashboard Super Admin
  - Na modal de edição da franquia
    ↓
Para remover:
  - Super Admin clica em "Remover desconto"
  - Sistema seta desconto_tipo = 'nenhum'
```

---

## 🎯 REGRAS DE NEGÓCIO

### 1. Controle de Acesso
- **Super Admin:** Acesso total sem restrições
- **Admin Franquia:** 
  - Acesso às suas unidades
  - Gestão de usuários da franquia
  - Configurações de webhook/WhatsApp
  - Visualização financeira
  - **Bloqueio se inadimplente:** Não acessa Roteirista/TV, apenas Config (aba Financeiro)
- **Operador:**
  - Acesso apenas à unidade vinculada
  - Roteirista, TV, Fila de Pagamento, Histórico
  - **Bloqueio se inadimplente:** Deslogado automaticamente com aviso

### 2. Reset Diário (03:00)
- Executado via cron → edge function `reset-daily`
- Ações:
  - Todos motoboys voltam a `status = 'disponivel'`
  - `hora_saida = NULL`
  - `fila_posicao` reorganizada
- Registros antigos em `historico_entregas` (>90 dias) são deletados

### 3. Trial e Vencimento
- Nova franquia recebe 7 dias de trial gratuito
- `data_vencimento = data_registro + dias_trial`
- Após vencimento:
  - `status_pagamento = 'bloqueado'`
  - Bloqueia funcionalidades operacionais
  - Notificação enviada ao admin da franquia
- Se sem pagamento por 30 dias após trial, franquia é deletada (edge function `delete-expired-franchises`)

### 4. Fila de Motoboys
- Ordem determinada por `fila_posicao` (timestamp)
- Ao fazer check-out, motoboy vai para o final da fila (`fila_posicao = NOW()`)
- Drag & Drop no Roteirista não altera `fila_posicao` (apenas UI temporária)

### 5. Tipos de Bag
- Customizável por franquia em `franquia_bag_tipos`
- Associado às unidades via `unidade_bag_tipos`
- Registrado em `historico_entregas.tipo_bag`
- Usado para análises (ex: tempo médio por tipo de bag)

### 6. Módulos Opcionais
- Verificados no frontend via `franquias.config_pagamento.modulos_ativos`
- Renderização condicional de features:
  - `whatsapp`: Aba "Webhook" em Config
  - `planilha`: Campo URL do webhook
  - `fila_pagamento`: Rota /fila-pagamento
  - `tv_avancada`: Animações exclusivas na TV
- Desativação de módulo esconde funcionalidade (não deleta dados)

### 7. Cálculo de Faturamento
```javascript
// Super Admin → Dashboard
faturamentoBruto = Σ(plano_base de cada franquia)
faturamentoEstimado = Σ(
  plano_base - (desconto_percentual * plano_base / 100) - desconto_valor
)

// Exemplo:
// Franquia A: R$ 249,90 com 20% off → R$ 199,92
// Franquia B: R$ 199,90 sem desconto → R$ 199,90
// Total Bruto: R$ 449,80
// Total Estimado: R$ 399,82
```

### 8. Segurança de Senha
- **Armazenamento:** Texto plano em `system_users.password_hash` (⚠️ nome incorreto)
- **Validação:** Comparação direta na função `login()` do `AuthContext`
- **Sessão:** LocalStorage com expiração no reset diário (05:00)
- **⚠️ IMPORTANTE:** Em produção, implementar bcrypt ou argon2 para hash real

### 9. Turnos de Trabalho
- **Padrão:** 16:00 - 02:00 (turno noite)
- **Personalizado:** Cada motoboy pode ter turno diferente
- **Dias da Semana:** JSONB `dias_trabalho` controla disponibilidade
- **Filtros no Roteirista:** Exibe apenas motoboys no turno atual

### 10. Webhooks
- **Google Sheets:** Envia dados de entrega para planilha via POST
- **WhatsApp:** Notifica motoboy na saída
- **Asaas:** Recebe notificações de pagamento
- **Personalizado:** Franquias podem configurar URL própria em `system_config.webhook_url`

---

## 🔌 INTEGRAÇÕES

### ElevenLabs (Text-to-Speech)
**API Key:** Armazenada em `ELEVENLABS_API_KEY` (secret)  
**Uso:**
- Geração de voz para chamadas na TV
- Áudios salvos no bucket `motoboy_voices`
- Path: `{franquia_id}/{entregador_id}.mp3`

**Configuração:**
```javascript
// franquias.config_pagamento.tv_tts
{
  "enabled": true,
  "voice_model": "elevenlabs",
  "eleven_voice_id": "opcional",
  "eleven_api_key": "override_api_key_opcional",
  "volume": 100,
  "ringtone_id": "classic_short"
}
```

---

### Evolution API (WhatsApp)
**Configuração por Franquia:**
```javascript
// franquias.config_pagamento.whatsapp
{
  "url": "https://dom-evolution-api.adhwpy.easypanel.host/",
  "instance": "pizzaria",
  "api_key": "E7BCA4BB4535-4C3C-8C97-744315F4DECE"
}
```

**Templates:** Personalizáveis em `whatsapp_templates` por unidade.  
**Exemplo:**
```
Olá {nome}! 
Você está saindo para entrega. 
Boa viagem! 🏍️
```

**Envio:** Edge function `send-whatsapp` chamada ao fazer check-in.

---

### Asaas (Pagamentos)
**Configuração:** `franquias.config_pagamento.customer_id`  
**Fluxo:**
1. Sistema cria cobrança via API Asaas
2. Retorna `checkout_url` e `external_id`
3. Salva em `franquia_cobrancas`
4. Asaas notifica via webhook `webhook-asaas`
5. Sistema atualiza status do pagamento

**Webhook URL:** `https://[project].supabase.co/functions/v1/webhook-asaas`

---

### Google Sheets (Webhook)
**Configuração:** `unidades.config_sheets_url`  
**Payload Enviado:**
```json
{
  "entregador": "Carlos",
  "telefone": "11981000676",
  "unidade": "ITAQUA",
  "hora_saida": "2026-01-02T18:30:00Z",
  "tipo_bag": "normal"
}
```

**Método:** POST para URL configurada.

---

## 📱 ROTAS E NAVEGAÇÃO

```
/ (Index)
  ├── /login (Login Administrativo)
  ├── /register (Cadastro de Franquias)
  - `/meu-lugar`: Portal "Sou Motoboy" para check-in por senha pessoal com **exigência obrigatória de GPS**
  
  - `[Protegido - Operacional]`
  - `/roteirista`: Gestão da Fila e Mapa de Motoboys em Tempo Real
  ├── /tv (Tela de Chamadas)
  ├── /fila-pagamento (Sistema de Senhas)
  ├── /historico (Consulta de Entregas)
  │
  ├── [Protegido - Administrativo]
  ├── /config (Configurações da Unidade)
  │   ├── ?tab=motoboys
  │   ├── ?tab=usuarios
  │   ├── ?tab=modulos
  │   ├── ?tab=webhook
  │   └── ?tab=financeiro&bloqueio=1
  │
  └── /admin (Super Admin Dashboard)
      ├── ?tab=dashboard
      ├── ?tab=planos
      ├── ?tab=modulos
      ├── ?tab=pacotes
      ├── ?tab=descontos
      └── ?tab=financeiro
```

---

## 🎨 DESIGN SYSTEM

### Cores Semânticas (index.css)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --muted: 210 40% 96.1%;
  --destructive: 0 84.2% 60.2%;
  --border: 214.3 31.8% 91.4%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

### Componentes Shadcn/ui
- Button (variants: default, destructive, outline, secondary, ghost, link)
- Card, Dialog, Tabs, Select, Input, Textarea
- Toast (Sonner), Badge, Avatar, Dropdown Menu
- Drag & Drop (@hello-pangea/dnd)

### Responsividade
- Mobile-first com Tailwind breakpoints
- Ajustes específicos em SuperAdmin, Roteirista e Config
- Layout adaptativo para tablets e desktops

---

## 🚀 DEPLOY E AMBIENTES

### Desenvolvimento
- **URL:** `http://localhost:5173`
- **Vite Dev Server:** Hot reload ativo
- **Supabase Local:** Opcional via Supabase CLI

### Produção
- **Frontend:** Deploy automático via Lovable
- **Edge Functions:** Deploy automático no Lovable Cloud
- **Banco de Dados:** Supabase (PostgreSQL hospedado)
- **Storage:** Supabase Storage (S3-compatible)

### Variáveis de Ambiente (.env)
```
VITE_SUPABASE_URL=https://wekdrdcvwecaoafnrwhl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_SUPABASE_PROJECT_ID=wekdrdcvwecaoafnrwhl
```

### Secrets (Supabase)
- `ELEVENLABS_API_KEY`: API key ElevenLabs
- `SUPABASE_SERVICE_ROLE_KEY`: Chave admin Supabase
- `SUPABASE_DB_URL`: Connection string PostgreSQL

---

## 📊 MÉTRICAS E ANALYTICS

### Dashboard Financeiro (Super Admin)
- Faturamento mensal bruto e estimado
- Crescimento MoM (Month over Month)
- Taxa de conversão de trial para pago
- Churn rate
- Franquias ativas vs. bloqueadas

### Relatórios de Entregas
- Tempo médio de entrega por unidade
- Entregas por motoboy
- Picos de movimento (horas/dias)
- Taxa de "não apareceu"

---

## 🔧 MANUTENÇÃO E SUPORTE

### Logs de Auditoria
- Ações administrativas registradas em `logs_auditoria`
- Campos: franquia_id, usuario_email, acao, detalhes (JSONB)

### Cleanup Automático
- **Histórico:** Registros >90 dias deletados diariamente
- **Senhas:** Senhas expiradas (>24h) removidas automaticamente
- **Franquias Trial:** Deletadas após 30 dias sem pagamento

### Backup
- **Banco de Dados:** Backup automático Supabase (point-in-time recovery)
- **Storage:** Replicação S3 habilitada

---

## 🛡️ SEGURANÇA - CHECKLIST

### ✅ Implementado
- HTTPS obrigatório (Supabase)
- CORS configurado em edge functions
- Validação de entrada em forms (React Hook Form + Zod)
- Proteção de rotas via `ProtectedRoute`
- Segredos gerenciados via Supabase Secrets

### ⚠️ Melhorias Recomendadas
- [ ] Implementar hash de senha (bcrypt/argon2)
- [ ] RLS mais restritivo (isolar dados por franquia)
- [ ] Rate limiting em edge functions
- [ ] Autenticação via Supabase Auth (OAuth, MFA)
- [ ] Criptografia de dados sensíveis em JSONB
- [ ] Logs de acesso e atividade suspeita
- [ ] Sanitização de HTML em mensagens WhatsApp

---

## 📚 DOCUMENTAÇÃO TÉCNICA ADICIONAL

### Como Adicionar Nova Franquia Manualmente
```sql
-- 1. Criar franquia
INSERT INTO franquias (nome_franquia, slug, cpf_cnpj, status_pagamento, data_vencimento, config_pagamento)
VALUES ('Nova Pizzaria', 'nova-pizzaria', '12345678900', 'ativo', '2026-02-01', 
  '{"plano_id":"404b30bf-f308-42e4-a263-60acec5cba29","modulos_ativos":["whatsapp","planilha"]}'::jsonb);

-- 2. Criar unidade
INSERT INTO unidades (franquia_id, nome_loja)
VALUES ((SELECT id FROM franquias WHERE slug = 'nova-pizzaria'), 'Loja Centro');

-- 3. Criar usuário admin
INSERT INTO system_users (username, password_hash, role, unidade, franquia_id)
VALUES ('admin_nova', 'senha123', 'admin', 'CENTRO', 
  (SELECT id FROM franquias WHERE slug = 'nova-pizzaria'));

-- 4. Vincular usuário à unidade
INSERT INTO user_unidades (user_id, unidade_id)
SELECT 
  (SELECT id FROM system_users WHERE username = 'admin_nova'),
  (SELECT id FROM unidades WHERE nome_loja = 'Loja Centro');
```

### Como Debugar Problema de Chamada na TV
1. Verificar se motoboy está ativo (`entregadores.ativo = true`)
2. Confirmar `franquias.config_pagamento.tv_tts.enabled = true`
3. Checar se arquivo de voz existe no storage (`motoboy_voices/{franquia_id}/{entregador_id}.mp3`)
4. Inspecionar logs do edge function `elevenlabs-tts`
5. Testar manualmente: `POST /elevenlabs-tts` com payload:
   ```json
   {
     "text": "Carlos",
     "filename": "test.mp3"
   }
   ```

### Como Exportar Dados para Análise
```sql
-- Entregas por motoboy (últimos 30 dias)
SELECT 
  e.nome,
  COUNT(*) as total_entregas,
  AVG(EXTRACT(EPOCH FROM (h.hora_retorno - h.hora_saida))/60)::int as tempo_medio_minutos
FROM historico_entregas h
JOIN entregadores e ON h.entregador_id = e.id
WHERE h.hora_saida > NOW() - INTERVAL '30 days'
AND h.hora_retorno IS NOT NULL
GROUP BY e.nome
ORDER BY total_entregas DESC;

-- Faturamento por franquia
SELECT 
  f.nome_franquia,
  p.valor_base as plano_valor,
  f.desconto_percentual,
  f.desconto_valor,
  (p.valor_base - (p.valor_base * f.desconto_percentual / 100) - f.desconto_valor) as valor_final
FROM franquias f
JOIN planos p ON (f.config_pagamento->>'plano_id')::uuid = p.id
WHERE f.status_pagamento = 'ativo'
ORDER BY valor_final DESC;
```

---

## 📞 SUPORTE E CONTATO

**Sistema:** FilaLab  
**Versão:** 1.0.0  
**Última Atualização:** 2026-01-02  
**Tecnologia:** React + Supabase (Lovable Cloud)  

**Dados de Produção:**
- Project ID: `wekdrdcvwecaoafnrwhl`
- Storage Bucket: `motoboy_voices` (público)
- Edge Functions: 15 ativas

---

## 📝 CHANGELOG

### v1.1.0 (2026-02-23)
- ✅ **Mapa de Entregadores:** Implementado painel Mapa no Roteirista para visualização em tempo real.
- ✅ **Obrigatoriedade GPS:** Adicionada permissão silenciosa de GPS à página `/meu-lugar` para motoboys operacionais. Se descer sem habilitar, ele toma Erro 503.
- ✅ **WhatsApp em Lote:** Controles granulares por motoboy e Botão "Desligar/Ligar Todos" migrados da listagem para a Caixa do Módulo de Automações (`Config.tsx`). Esses só carregam na UI se o `whatsapp` estiver ativo para a respectiva loja logada.

### v1.0.0 (2026-01-02)
- ✅ Sistema de descontos recorrentes implementado
- ✅ Visualização de desconto ativo em SuperAdmin
- ✅ Botão "Remover desconto" adicionado
- ✅ Cálculo de faturamento considera descontos
- ✅ Responsividade mobile em SuperAdmin, Roteirista e Config
- ✅ Documentação completa do sistema gerada

### Próximas Features (Roadmap)
- [ ] Multi-tenant completo com RLS restritivo
- [ ] Dashboard de analytics para franquias
- [ ] App mobile nativo para motoboys
- [ ] Integração com Mercado Pago e PagSeguro
- [ ] Sistema de notificações push
- [ ] Chat interno entre operador e motoboy
- [ ] Geolocalização em tempo real
- [ ] Relatórios exportáveis em PDF

---

**FIM DA DOCUMENTAÇÃO**

*Este documento foi gerado automaticamente com base no estado atual do sistema em 2026-01-02.*  
*Todos os dados cadastrados, estruturas de tabelas, políticas RLS e funcionalidades foram extraídos diretamente do banco de dados e código-fonte.*