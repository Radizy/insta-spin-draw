# SISTEMA FILALAB - DOCUMENTAÃ‡ÃƒO COMPLETA

## ðŸ“‹ VISÃƒO GERAL DO SISTEMA

**FilaLab** Ã© uma plataforma completa de gestÃ£o de filas e entregas (roteirizaÃ§Ã£o) para franquias, focada em otimizar operaÃ§Ãµes logÃ­sticas com motoboys. O sistema oferece controle centralizado para super administradores, gestÃ£o autÃ´noma para franquias e interface dedicada para entregadores.

### NÃ­veis de Acesso
- **Super Administrador**: Controle total do sistema, gestÃ£o de franquias, planos e mÃ³dulos
- **Admin Franquia**: GestÃ£o de suas unidades, usuÃ¡rios e configuraÃ§Ãµes
- **Operador**: Acesso Ã s telas operacionais (Roteirista, TV, Fila de Pagamento)
- **Motoboy**: Portal dedicado para check-in e visualizaÃ§Ã£o de status

### GestÃ£o de MÃ³dulos (Toggles)
O sistema conta com restriÃ§Ã£o de funcionalidades por pacote comercial baseada em mÃ³dulos.
Os 5 mÃ³dulos principais sÃ£o:
1. **WhatsApp AvanÃ§ado (`whatsapp`)**: Controla abas de configuraÃ§Ã£o da Evolution API e envio de disparo de mensagens diretas do sistema para o entregador.
2. **TV Premium (`tv_avancada`)**: Destrava customizaÃ§Ãµes exclusivas como upload de fundo e customizaÃ§Ã£o de toques e vozes de AI da tela de TV de espera. Inclui sistema de rediscagem automÃ¡tica de 10s e caminhos de Ã¡udio otimizados por franquia.
3. **IntegraÃ§Ã£o Planilha (`planilha`)**: Habilita o webhook do Google Sheets no painel de HistÃ³rico permitindo exportaÃ§Ã£o autÃ´noma de dados.
4. **Fila de Pagamento (`fila_pagamento`)**: Libera o uso da tela `/fila-pagamento` para o gerenciamento de senhas (cash-out financeiro dos motoqueiros).
5. **Controle de Maquininhas (`controle_maquininhas`)**: MÃ³dulo definitivo para gestÃ£o de estoque e atribuiÃ§Ã£o de mÃ¡quinas de cartÃ£o para motoboys.
6. **IntegraÃ§Ã£o SISFOOD (`sisfood_integration`)**: Habita o painel de tutorial na aba IntegraÃ§Ãµes, disparando webhooks do caixa para alimentar a Fila do Roteirista sem falhas. 
7. **Modo Treinamento (FilaLab Academy)**: Treinamento simulado em memÃ³ria local, guiado passo a passo para novos operadores (`isTrainingMode`).

Esses mÃ³dulos podem ser geridos livremente pelo painel Super Admin na visualizaÃ§Ã£o e ediÃ§Ã£o de uma franquia.

### VersÃ£o do Sistema
- **VersÃ£o Atual**: `2.9.1` (Junho 2026)
- **Ãšltimas ImplementaÃ§Ãµes**:
    - **CorreÃ§Ãµes de erros no Analytics Pro e no recarregamento (F5) de pÃ¡ginas**.
    - **Registro do horÃ¡rio de retorno e do tempo de rua do motoboy na planilha de controle**.
    - **Melhorias na visualizaÃ§Ã£o e relatÃ³rios no painel de HistÃ³rico**.
    - **TransmissÃ£o Automatizada e Telemetria de Desempenho (FPS Real & ResoluÃ§Ã£o) com Trava de 60 FPS**:
        - **SincronizaÃ§Ã£o AutomÃ¡tica & IdentificaÃ§Ã£o de Lojas**: Agora, ao iniciar uma transmissÃ£o de tela de qualquer unidade (ex: ItaquÃ¡), a plataforma busca todas as unidades da mesma franquia no Supabase e insere automaticamente a mÃ­dia de `tipo: 'transmissao'` na playlist de screensaver (`tv_playlist`) de cada uma delas (ItaquÃ¡, PoÃ¡, Suzano, etc.). O sinalizador WebRTC trafega nominalmente o nome da respectiva unidade (`lojaNome`), permitindo que o painel do transmissor exiba em tempo real uma lista dinÃ¢mica das lojas que estÃ£o assistindo Ã  transmissÃ£o (ex: "Lojas assistindo agora: ItaquÃ¡, PoÃ¡, Suzano"). Ao finalizar a transmissÃ£o (ou se a aba do transmissor for recarregada/fechada abruptamente), a mÃ­dia Ã© removida de todas as playlists, fazendo com que as TVs retornem Ã  rotatividade normal sem necessidade de intervenÃ§Ã£o manual.
        - **Isolamento Estrito por Franquia**: A comunicaÃ§Ã£o de sinalizaÃ§Ã£o WebRTC ocorre estritamente dentro de canais de broadcast isolados por franquia (`webrtc-${user.franquiaId}`). Isso impede totalmente qualquer conflito, vazamento ou queda de conexÃµes se lojas de franquias diferentes iniciarem transmissÃµes simultÃ¢neas, mantendo a integridade de cada cliente de forma isolada.
        - **Telemetria e Aspect Ratio Fiel no Preview**: Adicionado um HUD informativo e flutuante de diagnÃ³stico no Preview de transmissÃ£o local (`ScreenShareTransmitter.tsx`) que calcula e exibe em tempo real o **FPS Real** renderizado (via `requestVideoFrameCallback` com fallback para `requestAnimationFrame`) e a resoluÃ§Ã£o/FPS nominal. Para eliminar qualquer desalinhamento ou distorÃ§Ã£o na hora de selecionar a Ã¡rea de recorte, o container de preview agora ajusta dinamicamente a sua proporÃ§Ã£o de tela (`aspectRatio`) com base nos metadados da imagem do stream de vÃ­deo capturado (`loadedmetadata`), em vez de fixar em 16:9, alinhando perfeitamente a Ã¡rea visual de recorte com o que a TV vai exibir. A taxa mÃ¡xima estÃ¡ configurada em **60 FPS** (`frameRate: { ideal: 60, max: 60 }`), permitindo oscilaÃ§Ã£o automÃ¡tica conforme o desempenho.
        - **ResiliÃªncia Anti-Travamento (Handshake Seguro & Auto-Restart)**: Corrigido o bug onde a transmissÃ£o ficava presa em "Conectando..." (decorrente de loops de sinalizaÃ§Ã£o que atropelavam a negociaÃ§Ã£o ativa do WebRTC). O receptor da TV (`ScreenShareReceiver.tsx`) agora silencia pings de sinalizaÃ§Ã£o de forma inteligente durante a fase de negociaÃ§Ã£o de IPs (`connecting` ou `checking`). AlÃ©m disso, foi implementado um mecanismo de **Auto-Restart** que identifica quedas ou falhas na rota de mÃ­dia (`failed`/`disconnected`), fecha a conexÃ£o anterior de forma limpa e inicia automaticamente uma nova tentativa de handshake do zero.
        - **Melhoria de Usabilidade no Banner Flutuante**: O banner flutuante persistente de transmissÃ£o ativa (`ActiveShareBanner` no `App.tsx`) foi deslocado mais para a esquerda (`right-24`), desimpedindo totalmente o canto inferior direito e evitando que o banner sobreponha botÃµes operacionais cruciais como o "Controle de Maquininhas", chat do WhatsApp e o widget de changelog.
    - **Fila Sequencial AssÃ­ncrona para DevoculaÃ§Ã£o de Maquininhas (Segundo Plano)**: O processo de dar baixa de maquininhas no modal (`MaquininhaControlModal.tsx`) agora roda 100% em segundo plano em uma fila assÃ­ncrona sequencial (`queueRef`). O operador pode clicar para devolver as maquininhas de mÃºltiplos motoboys consecutivamente sem precisar aguardar a conclusÃ£o do processo no banco de dados e planilhas Google Sheets. Cada botÃ£o de "Dar Baixa" entra em estado de carregamento e o card correspondente permanece visÃ­vel atÃ© que a mutaÃ§Ã£o seja confirmada com sucesso pela API. A fila sequencial previne erros de concorrÃªncia e bloqueios simultÃ¢neos de gravaÃ§Ã£o na Evolution API / Google Apps Script.
    - **CorreÃ§Ã£o de Layout no Modal de Maquininhas**: Ajustada a especificaÃ§Ã£o de classes do componente `TabsContent` do Radix UI para usar `data-[state=active]:flex flex-col` em vez do comportamento padrÃ£o `display: block`. Isso permite que o modal expanda corretamente as listas internas de motoboys e maquininhas ocupando toda a altura do modal de forma flexÃ­vel e com scroll independente, sem quebras no rodapÃ©.
    - **CorreÃ§Ã£o dos Ã�cones Sumindo no Menu Lateral (PersistÃªncia)**: Implementado fallback automÃ¡tico com salvamento e recuperaÃ§Ã£o dos mÃ³dulos ativos da franquia no `localStorage` do navegador. Isso impede que itens de menu condicionados aos mÃ³dulos ativos (como o Ã­cone de "Controle de Maquininhas") desapareÃ§am temporariamente durante o carregamento de pÃ¡ginas pesadas de Analytics ou recarregamento manual do aplicativo.
    - **Screensaver de TransmissÃ£o via WebRTC (SaaS Screen Sharing)**: Novo tipo de mÃ­dia `transmissao` adicionado ao Screensaver da TV. CriaÃ§Ã£o dos componentes `ScreenShareReceiver.tsx`, `ScreenShareTransmitter.tsx` e do contexto `ScreenShareContext.tsx` utilizando Supabase como canal de Signaling em tempo real para os Peers WebRTC. Acompanha script de instalaÃ§Ã£o do coTURN (`install_coturn.sh`) e pÃ¡gina de teste local `/public/test-rtc.html`.
    - **SincronizaÃ§Ã£o de Check-in DiÃ¡rio na TV (`TV.tsx`)**: UnificaÃ§Ã£o e reset diÃ¡rio sincronizado dos campos `primeiro_checkin` (screensaver) e `checkin_diario` (auditoria administrativa) na entrada da fila.
    - **Vozes mais realistas com Google TTS**: Agora Ã© possÃ­vel gerar vozes mais realistas usando o Google TTS (temporariamente gratuito).
    - **GeraÃ§Ã£o de voz do motoboy inteligente**: O botÃ£o "Gerar Voz" no cadastro do motoboy agora detecta automaticamente se a franquia usa Google ou ElevenLabs.
    - **Self-Service de WhatsApp (Evolution API)**: Painel de IntegraÃ§Ãµes atualizado para permitir que o prÃ³prio Admin da Franquia conecte e gere o QR Code de seu dispositivo WhatsApp, utilizando credenciais padrÃ£o via variÃ¡veis de ambiente (`VITE_EVOLUTION_URL`), eliminando a necessidade de configuraÃ§Ã£o manual pelo Super Admin.
    - **Super Admin - CriaÃ§Ã£o Nativa de UsuÃ¡rios**: Modal "Nova Franquia" aprimorado para permitir a criaÃ§Ã£o automÃ¡tica de usuÃ¡rios administradores (`system_users`) vinculados Ã  nova loja no momento do registro.
    - **Dashboard Super Admin**: Interface "Geral" modernizada com atalhos de aÃ§Ãµes rÃ¡pidas e exibiÃ§Ã£o de dados reais das "Ãšltimas 5 Lojas Registradas".
    - **MigraÃ§Ã£o SaaS Multi-Tenant (UUID Strict)**: O sistema foi migrado de uma dependÃªncia baseada em nomes de lojas (strings) para o uso de **UUIDs (`unidade_id`)** como chave primÃ¡ria em todas as operaÃ§Ãµes. Isso garante que lojas com nomes iguais (ex: "ITAQUA") em franquias diferentes nunca misturem seus dados.
    - **Edge Function `auth-login` DinÃ¢mico**: Refatorada para permitir que `super_admin` carregue todas as unidades do sistema via `availableUnits`. Implementado um mapeador robuso que utiliza o UUID da unidade como fallback.
    - **PersistÃªncia Agnostica (`DadosDaLoja.tsx`)**: SubstituÃ­do o padrÃ£o `insert/update` por `upsert` com `onConflict: 'unidade_id'`, eliminando registros duplicados na tabela `system_config`.
    - **Webhook Saipos SaaS-Ready**: Refatorado para utilizar a funÃ§Ã£o `resolveStoreId`, que identifica a loja corretamente (via UUID ou nome normalizado) antes de processar pedidos ou GPS.
    - **VisualizaÃ§Ã£o de GeocodificaÃ§Ã£o no Roteirista**: A query de localizaÃ§Ã£o da loja no mapa agora utiliza `unidade_id`, garantindo que a "casinha" (marker da loja) apareÃ§a corretamente para todas as unidades.
    - **Strict Multi-Franquias (Vazamento de Lojas)**: O backend da API (`fetchEntregadores`) blindado contra string solta de `unidade`. A filtragem e inserÃ§Ã£o passa a ser obrigatoriamente exigida pelo `unidade_id` (UUID), isolando perfeitamente lojas 100% homÃ´nimas de franquias parceiras distintas.
    - **MÃ³dulo TV Screensaver - Radar**: TV Premium agora suporta mÃ­dia dinÃ¢mica `mapa` e `top_rank` em sua constraint de verificaÃ§Ã£o para exibir um radar de entregas ao vivo na tela de repouso dos roteiristas.
    - **IntegraÃ§Ã£o Push-Config Independente**: Tela Mestra "IntegraÃ§Ãµes" desbloqueada mesmo se o WhatsApp estiver desligado, impedindo a inabilitaÃ§Ã£o em cascata acidental do Sisfood e Saipos.
    - **IntegraÃ§Ã£o Expo Push (Motoboy App)**: Disparo de notificaÃ§Ãµes push nativas via backend.
    - **Fila de DisponÃ­veis e Entregando Refinadas**: BotÃ£o de retorno renomeado de `Finalizar` para `Deixar DisponÃ­vel`. Adicionado botÃ£o de atalho `Em Entrega` na Fila de DisponÃ­veis.
    - **OtimizaÃ§Ã£o de Network Polling**: ReduÃ§Ã£o do intervalo de busca para `saidas-hoje` (Roteirista) e `historico-rank` (TV) para cada 5 minutos, diminuindo a carga no banco de dados e melhorando a performance geral.
    - **OrganizaÃ§Ã£o de Scripts**: Todos os scripts SQL e scripts auxiliares (.js, .ps1) foram centralizados na pasta `/scripts` para um ambiente de desenvolvimento mais limpo.
    - **Kanban Board para AtualizaÃ§Ãµes**: O painel Super Admin agora conta com um layout Kanban (Drag & Drop) para gerir atualizaÃ§Ãµes do sistema.
    - **Termos de Uso e PolÃ­tica de Privacidade**: ImplementaÃ§Ã£o de modais dedicados no rodapÃ© da Landing Page.
    - **IntegraÃ§Ã£o SISFOOD v11.1 (Universal Anti-Zumbi)**: Script Tampermonkey unificado com disparo duplo e proteÃ§Ã£o contra comandos obsoletos.
    - **OtimizaÃ§Ã£o de Bateria (App Motoboy)**: Heartbeat de localizaÃ§Ã£o alterado para 5 minutos para preservaÃ§Ã£o de bateria e CPU.
    - **RefatoraÃ§Ã£o da Fila do Motoboy**: LÃ³gica de entrada na fila (check-in manual vs expediente) centralizada no backend via API, unificando a visÃ£o do Painel Roteirista e do Web App Meu Lugar.
    - **App Mobile Otimizado**: Identidade visual do aplicativo Expo atualizada para "Filalab - Motoboy" com nova logo.
    - **AtualizaÃ§Ã£o de SeguranÃ§a (Zero-Quebra)**: 
        - Hashing transparente via Trigger SQL (`pgcrypto`) na inserÃ§Ã£o de senhas em `system_users`.
        - ImplementaÃ§Ã£o RLS Estrita e progressiva (`franquias`, `system_users`, `unidades`) baseada no JWT e claims passados via Front-End `AuthContext.tsx`.
        - ValidaÃ§Ã£o forte (HMAC/Token) adicionada Ã s Edge Functions do Asaas (`webhook-asaas`) e Sisfood (`sisfood-webhook`). Tampermonkeys (v11.5+) agora trafegam token `x-api-key`.
    - **CorreÃ§Ã£o de AcÃºmulo de Dados no Ranking da TV**: Resolvida falha que causava a inflaÃ§Ã£o dos nÃºmeros no widget "Top Rank" (ex: motoboys com 296 saÃ­das). O problema foi identificado como uma atualizaÃ§Ã£o em massa acidental de registros histÃ³ricos "abertos" (zumbis).
    - **ProteÃ§Ã£o Anti-CorrupÃ§Ã£o de HistÃ³rico (`api.ts`)**: Implementado um filtro de seguranÃ§a de 24 horas nas funÃ§Ãµes `registrarRetornoEntrega` e `atualizarSaidaEntrega`. Agora, o sistema apenas permite atualizar registros criados no turno atual, impedindo que aÃ§Ãµes presentes modifiquem dados de dias passados.
    - **Limpeza de Dados Zumbis em Larga Escala**: Executada faxina no banco de dados para fechar registros sem hora de retorno e restaurar timestamps de saÃ­da corrompidos, normalizando os indicadores de performance em Suzano e outras unidades afetadas.
    - **CorreÃ§Ã£o de ExibiÃ§Ã£o para Lojas Novas**: O `auth-login` usava o UUID da unidade como `unidade_nome` para lojas nÃ£o mapeadas explicitamente (fallback). Corrigido para usar `nome_loja` diretamente, eliminando a exibiÃ§Ã£o do UUID no tÃ­tulo "Controle da fila de entregas" do Roteirista para franquias novas.

---

## ðŸ›¡ï¸� ANÃ�LISE DE SEGURANÃ‡A E TESTES PENDENTES (ROADMAP)

A configuraÃ§Ã£o atual mitigou as vulnerabilidades mais graves (acesso indevido a dados de pagamentos, vazamento de senhas, e falsificaÃ§Ã£o de webhooks de caixas), porÃ©m **hÃ¡ pontos essenciais a serem priorizados** na prÃ³xima fase arquitetural do sistema (preservamos por enquanto para evitar quebra no *App do Motoboy*).

### O que ainda falta ou estÃ¡ incorreto (Pontos CrÃ­ticos):
1. **Tabelas Operacionais (Motoboys e HistÃ³rico) estÃ£o ABERTAS no Banco**:
   - O RLS (`Row Level Security`) para tabelas como `entregadores`, `historico_entregas` e `senhas_pagamento` ainda segue a polÃ­tica `USING (true) WITH CHECK (true)`.
   - **Risco**: Qualquer um com o link/chave anÃ´nima do painel pode interagir com a fila de motoboys.
   - **SoluÃ§Ã£o Futura**: Trancar essas tabelas exigindo que o motoboy/tv tambÃ©m envie um Token JWT (ou uma validaÃ§Ã£o customizada baseada em Pin de unidade).
2. **"App do Motoboy" Autenticado na Base da ConfianÃ§a**:
   - Atualmente, o app Web/WebView do Motoboy se baseia muito no ID/Pin digitado no prÃ³prio celular e na ausÃªncia de validaÃ§Ã£o rÃ­gida de SessÃ£o via Supabase Auth.
   - **Risco**: Risco de spoofing (um ex-funcionÃ¡rio sabendo a rota ou PIN pode manipular dados fingindo estar logado).
3. **Canais de Realtime Expostos (Supabase Presence e Broadcast)**:
   - Se o Realtime estiver ouvindo tabelas operacionais abertas, agentes mal intencionados podem assinar o socket `/realtime` filtrando a fila de motoboys de qualquer franquia.
   - **SoluÃ§Ã£o Futura**: Vincular Policies RLS ao Realtime para que canais socket sÃ³ despachem eventos se o Token bater.
4. **Senhas Antigas ainda estÃ£o em Texto Plano**:
   - O novo Trigger faz o hash perfeito nas senhas que sÃ£o cadastradas ou atualizadas *a partir de agora*. Mas o banco antigo ainda contÃ©m as senhas de franqueados antigos salvas em texto limpo.
   - **SoluÃ§Ã£o Futura**: Rodar um script de MigraÃ§Ã£o Ãºnica no Banco `UPDATE system_users SET password_hash = crypt(password_hash, gen_salt('bf')) WHERE password_hash NOT LIKE '$2%'`. Note que isso desconectarÃ¡ imediatamente todos que estiverem usando sessÃµes antigas desatualizadas se houver concorrÃªncia de lÃ³gica e exigirÃ¡ que a Edge Function `auth-login` pareÃ§a tratar o legado x novo.

### SugestÃ£o de Testes a Serem Feitos por VocÃª Agora na OperaÃ§Ã£o:
1. **Teste o Login Normal:** Certifique-se de que os logins de Super Admin e Franquia continuam abrindo.
2. **Crie um UsuÃ¡rio Teste:** VÃ¡ no painel super admin > UsuÃ¡rios do Sistema, e crie um "Operador". Tente entrar com a conta criada e em seguida logue no seu banco de dados Supabase e verifique se o campo "password_hash" nÃ£o Ã© "123", mas sim um hash `$2a$...`.
3. **Pague uma Assinatura via Asaas Falso (Teste de Fraude):** Envie um POST via Postman para o `/webhook-asaas` com o corpo da loja, omitindo o `asaas-signature`. A funÃ§Ã£o deve rejeitar a requisiÃ§Ã£o na hora com `Status 403`.
4. **Acione o Tampermonkey V12.0 (Gerado Automaticamente):** Acesse ConfiguraÃ§Ãµes â†’ IntegraÃ§Ãµes com a conta da loja, ative o Sisfood, copie o script gerado e cole no Tampermonkey. Verifique no Network se o webhook retornou `{success: true}`. Comandas PENDENTE que ficarem sem motoboy correspondente devem ser marcadas como IGNORADO automaticamente.

## ðŸ“‚ ESTRUTURA DE PASTAS (Root Cleanup)

Para manter a manutenabilidade, o diretÃ³rio raiz foi limpo, restando apenas arquivos essenciais de configuraÃ§Ã£o e os cÃ³digos principais:

- **`/src`**: CÃ³digo fonte da aplicaÃ§Ã£o React (PÃ¡ginas, Componentes, Hooks).
- **`/scripts`**: Central de scripts SQL de migraÃ§Ã£o, scripts de banco de dados e utilitÃ¡rios.
- **`/supabase`**: ConfiguraÃ§Ãµes de Edge Functions e MigraÃ§Ãµes de banco.
- **`/public`**: Assets estÃ¡ticos e imagens.
- **`SISTEMA_COMPLETO_FILALAB.md`**: Esta documentaÃ§Ã£o mestra.
- **`tampermonkey_*.js`**: Scripts de integraÃ§Ã£o Sisfood por unidade.

---

## ðŸ�—ï¸� ARQUITETURA E TECNOLOGIAS

### Frontend
- **Framework**: React 18.3.1 com TypeScript
- **Roteamento**: React Router DOM v6.30.1
- **PÃ¡ginas Principais**: 
  - `Landing Page / (Index)`: ApresentaÃ§Ã£o comercial do sistema (Home, MÃ³dulos, Contato).
  - `/login`: Ã�rea restrita do sistema para franqueados e operadores.
- **Gerenciamento de Estado**: React Context API + TanStack Query v5.83.0
- **UI Components**: Shadcn/ui com Radix UI primitives
- **EstilizaÃ§Ã£o**: Tailwind CSS com design system customizado
- **Drag & Drop**: @hello-pangea/dnd v18.0.1

### Backend (Lovable Cloud/Supabase)
- **Banco de Dados**: PostgreSQL com Row Level Security (RLS)
- **AutenticaÃ§Ã£o**: Sistema customizado baseado em `system_users`
- **Storage**: Supabase Storage (`motoboy_voices` para voz TTS offline e `franquia_media` para Galeria isolada por Franquia contendo Imagens, VÃ­deos e Ã�udios em geral)
- **Edge Functions**: Deno runtime para lÃ³gica serverless
- **Tempo Real**: Supabase Realtime para atualizaÃ§Ãµes instantÃ¢neas

### IntegraÃ§Ãµes Externas
- **ElevenLabs / Google TTS**: Text-to-Speech para chamadas de motoboys na TV
- **WhatsApp (Evolution API)**: Envio de mensagens automÃ¡ticas
- **Google Sheets**: Webhook para exportaÃ§Ã£o de dados
- **Asaas**: Gateway de pagamento para cobranÃ§as recorrentes

---

## ðŸ“Š ESTRUTURA DO BANCO DE DADOS

### TABELA: franquias
Armazena informaÃ§Ãµes principais das franquias cadastradas no sistema.

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
   - MÃ³dulos Ativos: WhatsApp, Planilha, Fila Pagamento, TV AvanÃ§ada
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
Representa as lojas/unidades fÃ­sicas de cada franquia.

**Estrutura:**
```sql
CREATE TABLE unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franquia_id UUID NOT NULL REFERENCES franquias(id) ON DELETE CASCADE,
  nome_loja TEXT NOT NULL,
  endereco TEXT,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  config_whatsapp JSONB,
  config_sheets_url TEXT,
  cidade_clima TEXT,
  clima_cache JSONB,
  clima_updated_at TIMESTAMP WITH TIME ZONE,
  exibir_fila_tv BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Dados Cadastrados:**

**Franquia Dom Fiorentino:**
1. **Itaquaquecetuba**
   - ID: `14bb566c-c8d0-4b96-8da7-8eecea2d6738`
   - Nome Loja: `Itaquaquecetuba`
   
2. **PoÃ¡**
   - ID: `82a71bed-9c87-48a4-8eaa-cb13ed2f3514`
   - Nome Loja: `PoÃ¡`
   
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
UsuÃ¡rios do sistema com controle de acesso e vinculaÃ§Ã£o Ã s unidades.

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

**LÃ³gica de PapÃ©is:**
- `role = 'admin'` + `franquia_id IS NULL` â†’ **Super Admin** (acesso total)
- `role = 'admin'` + `franquia_id NOT NULL` â†’ **Admin Franquia** (acesso Ã s suas unidades)
- `role = 'user'` â†’ **Operador** (vinculado a uma unidade especÃ­fica)

**Dados Cadastrados:**

1. **Radizy** (Super Admin)
   - ID: `29d6ecc8-94f6-4c22-bc78-e4b08eba5403`
   - Username: `Radizy`
   - Password: `1324`
   - Role: `admin`
   - Unidade: `ITAQUA`
   - Franquia: `NULL` (sem vinculaÃ§Ã£o = super admin)

2. **fiscalisaque** (Admin Franquia - Dom Fiorentino)
   - ID: `1f7c46a5-cb5a-44b0-a557-f3b9be52ca6f`
   - Username: `fiscalisaque`
   - Password: `1324`
   - Role: `admin`
   - Franquia: `6d1fd941-2756-4b04-8ac3-8dfd22ee83fe` (Dom Fiorentino)
   - Acesso Ã s 3 unidades (Itaqua, PoÃ¡, Suzano)

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

5. **exppoa** (Operador - PoÃ¡)
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
Relacionamento muitos-para-muitos entre usuÃ¡rios e unidades (permite admin de franquia acessar mÃºltiplas lojas).

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
| fiscalisaque | PoÃ¡ | 2025-12-31 21:18:52 |
| fiscalisaque | Suzano | 2025-12-31 21:18:52 |
| teste | testeloja | 2026-01-01 21:38:12 |

**RLS Policies:**
```sql
CREATE POLICY "Anyone can manage user_unidades" ON user_unidades FOR ALL USING (true) WITH CHECK (true);
```

---

### TABELA: entregadores
Cadastro de motoboys com informaÃ§Ãµes de turnos, disponibilidade e tipo de bag.

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
  primeiro_checkin TEXT, -- Armazena o timestamp do primeiro checkin diÃ¡rio
  checkin_diario TIMESTAMP WITH TIME ZONE, -- Registra apenas uma vez no dia via trigger
  tts_voice_path TEXT,
  whatsapp_ativo BOOLEAN DEFAULT true,
  lat NUMERIC,
  lng NUMERIC,
  last_location_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Trigger: Checkin DiÃ¡rio Inteligente**
Tabela associada possui uma Trigger `func_log_checkin_diario()` para fixar apenas o *primeiro* registro. Limpeza de campo ocorre via Cloud Function Noturna (`/functions/reset-daily`).

**Exemplos de Motoboys Cadastrados (Unidade ITAQUA):**

| Nome | Telefone | Status | Tipo Bag | Ativo | Turno PadrÃ£o |
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

**Nota:** Total de 50+ motoboys cadastrados. Campos `franquia_id` e `unidade_id` sÃ£o `NULL` nos dados antigos (sistema legado), mas novas inserÃ§Ãµes devem preenchÃª-los.

**RLS Policies:**
```sql
CREATE POLICY "Anyone can create entregadores" ON entregadores FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view entregadores" ON entregadores FOR SELECT USING (true);
CREATE POLICY "Anyone can update entregadores" ON entregadores FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete entregadores" ON entregadores FOR DELETE USING (true);
```

---

### TABELA: historico_entregas
Registro de todas as entregas realizadas (saÃ­da e retorno).

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
- Permite cÃ¡lculo de tempo mÃ©dio de entrega
- HistÃ³rico exportÃ¡vel para anÃ¡lises
- **PreservaÃ§Ã£o ContÃ­nua:** Este histÃ³rico nÃ£o Ã© mais excluÃ­do atravÃ©s do botÃ£o da pÃ¡gina ConfiguraÃ§Ã£o de fechamento de expediente, permanecendo preservado para o Analytics.

**RLS Policies:**
```sql
CREATE POLICY "Anyone can create historico_entregas" ON historico_entregas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view historico_entregas" ON historico_entregas FOR SELECT USING (true);
CREATE POLICY "Anyone can update historico_entregas" ON historico_entregas FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete historico_entregas" ON historico_entregas FOR DELETE USING (true);
```

---

### TABELA: planos
DefiniÃ§Ã£o dos planos de assinatura disponÃ­veis.

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

| Nome | Tipo | Valor Base | DuraÃ§Ã£o | Trial | DescriÃ§Ã£o |
|------|------|------------|---------|-------|-----------|
| Pacote BÃ¡sico | mensal | R$ 199,90 | 1 mÃªs | 7 dias | Pacote bÃ¡sico mensal |
| Pacote Planilha + WhatsApp | mensal | R$ 249,90 | 1 mÃªs | 7 dias | Pacote com integraÃ§Ã£o de planilha e WhatsApp |
| Pacote Completo | mensal | R$ 299,90 | 1 mÃªs | 7 dias | Pacote com todos os mÃ³dulos ativos |

**RLS Policies:**
```sql
CREATE POLICY "Anyone can manage planos" ON planos FOR ALL USING (true) WITH CHECK (true);
```

---

### TABELA: modulos
MÃ³dulos opcionais que podem ser ativados nas unidades.

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

| CÃ³digo | Nome | DescriÃ§Ã£o | PreÃ§o Mensal | Ativo |
|--------|------|-----------|--------------|-------|
| whatsapp | WhatsApp AvanÃ§ado | Templates personalizados e mensagens automÃ¡ticas | R$ 0,00 | true |
| planilha | IntegraÃ§Ã£o Planilha | Webhook Google Sheets automÃ¡tico | R$ 0,00 | true |
| fila_pagamento | Fila de Pagamento | Sistema de senhas para pagamento | R$ 0,00 | true |
| tv_avancada | TV Premium | AnimaÃ§Ãµes exclusivas na tela da TV | R$ 0,00 | true |
| controle_maquininhas | Controle de Maquininhas | GestÃ£o de mÃ¡quinas de cartÃ£o e vÃ­nculos | R$ 0,00 | true |

**Nota:** PreÃ§o R$ 0,00 indica que os mÃ³dulos estÃ£o inclusos nos pacotes comerciais.

**RLS Policies:**
```sql
CREATE POLICY "Anyone can manage modulos" ON modulos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read modulos" ON modulos FOR SELECT USING (true);
```

---

### TABELA: pacotes_comerciais
Pacotes comerciais prÃ©-configurados com mÃ³dulos inclusos.

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

| CÃ³digo | Nome | PreÃ§o | MÃ³dulos Inclusos | Plano Base |
|--------|------|-------|------------------|------------|
| basico | Pacote BÃ¡sico | R$ 149,90 | [] | Pacote BÃ¡sico |
| planilha_whatsapp | Pacote Planilha + WhatsApp | R$ 199,90 | [planilha, whatsapp] | Pacote Planilha + WhatsApp |
| completo | Pacote Completo | R$ 249,90 | [planilha, whatsapp, fila_pagamento, tv_avancada] | Pacote Completo |

**RLS Policies:**
```sql
CREATE POLICY "Anyone can manage pacotes_comerciais" ON pacotes_comerciais FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read pacotes_comerciais" ON pacotes_comerciais FOR SELECT USING (true);
```

---

### TABELA: unidade_modulos
Relacionamento entre unidades e mÃ³dulos ativos.

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

**Nota:** Atualmente sem dados (mÃ³dulos gerenciados via `franquias.config_pagamento.modulos_ativos`).

**RLS Policies:**
```sql
CREATE POLICY "Anyone can manage unidade_modulos" ON unidade_modulos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read unidade_modulos" ON unidade_modulos FOR SELECT USING (true);
```

---

### TABELA: tv_playlist
Armazena a fila de exibiÃ§Ã£o (Screensaver) do mÃ³dulo de TV Premium de cada unidade ociosa.

**Estrutura:**
```sql
CREATE TABLE tv_playlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- Constraint ATUALIZADA ('imagem', 'video', 'youtube', 'mapa', 'aviso', 'noticia', 'clima', 'top_rank', 'transmissao')
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
- Suporta playlists e vÃ­deos independentes de YouTube.
- RenderizaÃ§Ã£o paralela da Fila (`QueueSidebarWidget`) habilitÃ¡vel em todas as mÃ­dias da playlist via DB (`unidades.exibir_fila_tv`).
- CÃ¡lculo preciso do "Ãšltimo Chamado" analisando a propriedade `hora_saida` (recente).
- Executa nativamente sem sobrecarregar servidor.
- Conta com controle de volume deslizante e tempo por mÃ­dia.

**RLS Policies:**
```sql
CREATE POLICY "tv_playlist_permissive_all" ON tv_playlist FOR ALL USING (true) WITH CHECK (true);
```

---

### TABELA: franquia_cobrancas
Registro de cobranÃ§as geradas para cada franquia (integraÃ§Ã£o com Asaas).

**Estrutura:**
```sql
CREATE TABLE franquia_cobrancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franquia_id UUID NOT NULL REFERENCES franquias(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL, -- ID da cobranÃ§a no gateway (Asaas)
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
Sistema de senhas para fila de pagamento (mÃ³dulo fila_pagamento).

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

### TABELA: maquininhas
Estoque de mÃ¡quinas de cartÃ£o da unidade.

**Estrutura:**
```sql
CREATE TABLE maquininhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  numero_serie TEXT,
  unidade_id UUID REFERENCES unidades(id),
  franquia_id UUID REFERENCES franquias(id),
  status TEXT DEFAULT 'livre', -- livre, em_uso
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

### TABELA: maquininha_vinculos
Registro histÃ³rico e ativo de qual motoboy estÃ¡ com qual mÃ¡quina.

**Estrutura:**
```sql
CREATE TABLE maquininha_vinculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motoboy_id UUID REFERENCES entregadores(id),
  maquininha_id UUID REFERENCES maquininhas(id),
  unidade_id UUID REFERENCES unidades(id),
  franquia_id UUID REFERENCES franquias(id),
  horario_checkin TIMESTAMP WITH TIME ZONE,
  horario_retirada TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  horario_devolucao TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'em_uso', -- em_uso, devolvida
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
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
  audio_url TEXT, -- Ã�udio amarrado da galeria de mÃ­dia (opcional bypass ao motoboy_voices)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

**Dados Cadastrados (Franquia Dom Fiorentino):**

| Nome | DescriÃ§Ã£o | Ativo |
|------|-----------|-------|
| Normau | - | true |
| Metro | - | true |

**RLS Policies:**
```sql
CREATE POLICY "franquia_bag_tipos_permissive_all" ON franquia_bag_tipos FOR ALL USING (true) WITH CHECK (true);
```

---

### TABELA: unidade_bag_tipos
Relacionamento entre unidades e tipos de bags disponÃ­veis.

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
ConfiguraÃ§Ãµes globais do sistema (chave-valor).
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
ConfiguraÃ§Ãµes por unidade (nome da loja, webhook URL). Centralizada no uso de `unidade_id` para persistÃªncia SaaS.
```sql
CREATE TABLE system_config (
  id UUID PRIMARY KEY,
  unidade TEXT NOT NULL,
  unidade_id UUID UNIQUE REFERENCES unidades(id),
  nome_loja TEXT,
  webhook_url TEXT,
  saipos_mapa_pedidos JSONB DEFAULT '[]',
  saipos_pedidos_fila JSONB DEFAULT '[]',
  entregas_na_fila_saipos INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### logs_auditoria
Registro de aÃ§Ãµes importantes no sistema.
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
Templates de mensagens WhatsApp personalizÃ¡veis por unidade.
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
HistÃ³rico de mensagens enviadas via WhatsApp.
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
Chaves de API para integraÃ§Ãµes externas.
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
ConfiguraÃ§Ãµes de gateways de pagamento por unidade.
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
Planos associados Ã s unidades (para cÃ¡lculos de faturamento).
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

## ðŸ”� POLÃ�TICAS DE ROW LEVEL SECURITY (RLS)

### VisÃ£o Geral
O sistema utiliza RLS permissivo (`USING (true)` e `WITH CHECK (true)`) em todas as tabelas. Isso significa que:

- âœ… **Qualquer usuÃ¡rio autenticado pode realizar qualquer operaÃ§Ã£o**
- âš ï¸� **A seguranÃ§a Ã© gerenciada na camada de aplicaÃ§Ã£o** (AuthContext)
- ðŸ”’ **NÃ£o hÃ¡ isolamento automÃ¡tico de dados por usuÃ¡rio/franquia no banco**

### ImplementaÃ§Ã£o Atual
```sql
-- PadrÃ£o aplicado em todas as tabelas principais
CREATE POLICY "nome_tabela_permissive_all" 
  ON nome_tabela 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
```

### âš ï¸� RECOMENDAÃ‡Ã•ES DE SEGURANÃ‡A

Para ambientes de produÃ§Ã£o, considere implementar RLS mais restritivo:

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

-- Exemplo: Impedir modificaÃ§Ã£o de franquias por nÃ£o-admins
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

## ðŸ› ï¸� EDGE FUNCTIONS (SUPABASE)

### 1. elevenlabs-tts
**Rota:** `POST /elevenlabs-tts`  
**DescriÃ§Ã£o:** Gera Ã¡udio TTS usando ElevenLabs e salva no storage.  
**Input:**
```json
{
  "text": "Carlos",
  "voice_id": "opcional",
  "model_id": "opcional",
  "filename": "carlos.mp3"
}
```
**Output:** URL pÃºblica do arquivo de Ã¡udio gerado.

---

### 2. send-whatsapp
**Rota:** `POST /send-whatsapp`  
**DescriÃ§Ã£o:** Envia mensagem via Evolution API WhatsApp.  
**Input:**
```json
{
  "unidade_id": "uuid",
  "telefone": "11999999999",
  "mensagem": "Sua entrega estÃ¡ pronta!"
}
```
**Output:** Status do envio.

---

### 3. send-webhook
**Rota:** `POST /send-webhook`  
**DescriÃ§Ã£o:** Envia dados de entregas para webhook configurado (ex: Google Sheets).  
**Input:**
```json
{
  "unidade": "ITAQUA",
  "data": { "entregador": "Carlos", "hora_saida": "..." }
}
```

---

### 4. reset-daily (Reset de Expediente)
**Rota:** `POST /reset-daily`  
**DescriÃ§Ã£o:** Reseta status de motoboys. Funciona como botÃ£o "Reset de Expediente" da aba da loja.  
**AÃ§Ãµes:**
- Define todos motoboys como `disponivel` e os desativa `ativo: false`
- Limpa `hora_saida` de todos para garantir zeramento da fila
- Prepara o sistema para o prÃ³ximo dia sem excluir os dados em nuvem do HistÃ³rico (`historico_entregas`).

---

### 5. cleanup-old-data
**Rota:** `POST /cleanup-old-data`  
**DescriÃ§Ã£o:** Remove dados antigos do histÃ³rico de entregas (>90 dias).

---

### 6. criar-cobranca-franquia
**Rota:** `POST /criar-cobranca-franquia`  
**DescriÃ§Ã£o:** Cria cobranÃ§a no Asaas para franquia.  
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
**DescriÃ§Ã£o:** Recebe notificaÃ§Ãµes de pagamento do Asaas e atualiza status.

---

### 8. sync-payment-status
**Rota:** `POST /sync-payment-status`  
**DescriÃ§Ã£o:** Sincroniza status de pagamento com Asaas manualmente.

---

### 9. update-franquias-status
**Rota:** `POST /update-franquias-status`  
**DescriÃ§Ã£o:** Atualiza status de pagamento das franquias baseado nas cobranÃ§as.

---

### 10. delete-expired-franchises
**Rota:** `POST /delete-expired-franchises`  
**DescriÃ§Ã£o:** Remove franquias de teste expiradas (trial + 30 dias).

---

### 11. clear-motoboy-voices
**Rota:** `POST /clear-motoboy-voices`  
**DescriÃ§Ã£o:** Remove arquivos de voz do storage para uma franquia.

---

### 12. api-payments-create
**Rota:** `POST /api-payments-create`  
**DescriÃ§Ã£o:** API pÃºblica para criar cobranÃ§as via API key.

---

### 13. api-store-status
**Rota:** `GET /api-store-status`  
**DescriÃ§Ã£o:** Retorna status pÃºblico da loja (se estÃ¡ aberta/fechada baseado no turno).

---

### 14. webhooks-payments
**Rota:** `POST /webhooks-payments`  
**DescriÃ§Ã£o:** Endpoint genÃ©rico para receber webhooks de mÃºltiplos gateways.

---

### 15. register-franchise
**Rota:** `POST /register-franchise`  
**DescriÃ§Ã£o:** Registra nova franquia com perÃ­odo de teste.  
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
**AÃ§Ãµes:**
1. Cria registro em `franquias`
2. Cria `unidades` (primeira loja)
3. Cria usuÃ¡rio admin em `system_users`
4. Vincula usuÃ¡rio Ã  unidade em `user_unidades`
5. Associa plano em `unidade_planos` (se aplicÃ¡vel)

---

## ðŸŽ¨ FUNCIONALIDADES PRINCIPAIS

### 1. Roteirista (/roteirista)
**Tela principal para gestÃ£o de entregas.**

**Funcionalidades:**
- **Drag & Drop:** Arraste motoboys na "Fila de DisponÃ­veis" para reordenar posiÃ§Ãµes.
- **Check-in RÃ¡pido:** Registra saÃ­da do motoboy com quantidade de bags e tag de bebidas.
- **Deixar DisponÃ­vel (Check-out):** Ex-botÃ£o "Finalizar", devolve motoboy da lista "Em Entrega" para a lista "Na Fila".
- **NÃ£o Apareceu (Card Inteligente):** Modal 10s nÃ£o bloqueante para marcar motoboy como ausente ou chamar novamente.
- **AÃ§Ã£o Em Entrega:** Mova rapidamente motoboys equivocados da "Fila" para a aba "Em Entrega" a qualquer momento.
- **IntegraÃ§Ã£o Viva Sisfood:** Acompanhamento dinÃ¢mico direto da integraÃ§Ã£o com badges alertando pedidos atrasados.

**Fluxo:**
1. Motoboy aparece na coluna "Na Fila"
2. Operador arrasta para "Em Entrega" ou clica em "Check-in"
3. Sistema registra hora de saÃ­da em `historico_entregas`
4. Atualiza `entregadores.status = 'em_entrega'`
5. Ao retornar, operador clica em "Check-out"
6. Sistema registra `hora_retorno` e volta status para `disponivel`

**IntegraÃ§Ãµes:**
- **WhatsApp:** Envia mensagem automÃ¡tica ao motoboy na saÃ­da (se mÃ³dulo ativo)
- **Google Sheets:** Exporta dados da entrega via webhook (se configurado)
- **TV:** Atualiza tela de chamadas em tempo real

---

### 2. TV (/tv)
**Tela pÃºblica para chamar motoboys (exibida em TVs na loja).**

**Funcionalidades:**
- **Chamadas Visuais:** AnimaÃ§Ãµes exclusivas com nome do motoboy
- **TTS (Text-to-Speech):** Voz sintetizada via ElevenLabs
- **Toques ConfigurÃ¡veis:** 6 opÃ§Ãµes de ringtone
- **Volume AjustÃ¡vel:** 0-100%
- **Modos de Voz:**
  - ElevenLabs (vozes customizadas por motoboy)
  - Browser TTS (fallback nativo)
- **Check-in Direto:** Modal para check-in sem sair da tela
- **HistÃ³rico de Chamadas:** Ãšltimas 5 chamadas exibidas no rodapÃ©

**Fluxo:**
1. Operador chama motoboy no Roteirista
2. Sistema dispara evento via Realtime Supabase
3. TV detecta evento e inicia animaÃ§Ã£o
4. Reproduz toque + voz do nome do motoboy
5. Exibe animaÃ§Ã£o por 10 segundos
6. Retorna ao estado de espera

**ConfiguraÃ§Ã£o (franquia.config_pagamento.tv_tts):**
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
1. O tempo mÃ­nimo inerte para ativar o modo ocioso Ã© um Custom Slider definido na aba Config > TV de cada loja (entre 5 e 60 segundos, default: 15s).
2. Se o tempo da variÃ¡vel estourar sem uso de botÃµes e sem novas chamadas de entrega, a TV recua.
3. Aciona nativamente o `play` nas listas do banco de dados `tv_playlist` (imagens, videos da Galeria `franquia_media` e YouTube iframe sync).
4. Se houver Clima, puxarÃ¡ dados abertos da "OpenWeatherMap" buscando a temperatura e Ã­cone da `cidade_clima` cadastrada na configuraÃ§Ã£o local da Unidade.
5. Qualquer movimento de mouse via operador muta, esconde e cessa a Playlist com repasse inteligente de posiÃ§Ã£o temporal.

**IntegraÃ§Ã£o Galeria de MÃ­dia (Storage `franquia_media`):**
- Os Franqueados possuem um gerenciador modal UI visual contendo abas nativas de (Fotos, VÃ­deos e Ã�udios).
- A API restringe e alimenta os uploads baseados no RLS vinculado ao prÃ³prio `franquia_id` do enviador para que lixos de outras lojas nÃ£o colidam.
- Esses botÃµes da Galeria e URLs estÃ£o dispostos na **FormulaÃ§Ã£o da Playlist da TV**, na aba de **ConfiguraÃ§Ãµes de Bags** para vozes e em **EdiÃ§Ã£o de TtS do Motoboy** (como Bypass do sistema ElevenLabs convencional).

---

### 3. Meu Lugar (/meu-lugar)
**Portal para motoboys verificarem seu status.**

**Funcionalidades:**
- **Busca por Telefone:** Motoboy insere seu nÃºmero
- **VisualizaÃ§Ã£o de Status:**
  - ðŸŸ¢ DisponÃ­vel: "VocÃª estÃ¡ na fila!"
  - ðŸ”´ Em Entrega: "VocÃª estÃ¡ em entrega desde [hora]"
  - âš« Ausente: "VocÃª estÃ¡ marcado como ausente"
- **HistÃ³rico Pessoal:** Ãšltimas 10 entregas realizadas
- **Tempo MÃ©dio:** CÃ¡lculo automÃ¡tico do tempo de entrega

---

### 4. Fila de Pagamento (/fila-pagamento)
**Sistema de senhas para organizar pagamentos de motoboys.**

**Funcionalidades:**
- **GeraÃ§Ã£o de Senhas:** Cria senha automÃ¡tica (formato: #001, #002...)
- **Chamada de Senhas:** BotÃ£o para chamar prÃ³xima senha
- **Status de Senhas:**
  - ðŸŸ¡ Aguardando
  - ðŸ”µ Chamada
  - ðŸŸ¢ Atendida
  - ðŸ”´ Cancelada
- **ExpiraÃ§Ã£o:** Senhas expiram apÃ³s 24h
- **HistÃ³rico:** VisualizaÃ§Ã£o de senhas do dia

**MÃ³dulo:** Requer `fila_pagamento` ativo.

---

### 5. ConfiguraÃ§Ã£o (/config)
**Painel de configuraÃ§Ã£o da unidade.**

**Abas:**

#### 5.1 Motoboys
- Cadastro, ediÃ§Ã£o e exclusÃ£o de motoboys
- ConfiguraÃ§Ã£o de turnos personalizados
- Dias de trabalho da semana
- GeraÃ§Ã£o de voz TTS individual
- ImportaÃ§Ã£o em lote via XLSX

#### 5.2 UsuÃ¡rios
- GestÃ£o de operadores e admins da franquia
- VinculaÃ§Ã£o de usuÃ¡rios a mÃºltiplas unidades
- AlteraÃ§Ã£o de senha
- Controle de permissÃµes

#### 5.3 MÃ³dulos
- AtivaÃ§Ã£o/desativaÃ§Ã£o de mÃ³dulos opcionais
- VisualizaÃ§Ã£o de mÃ³dulos inclusos no plano

#### 5.4 Webhook
- ConfiguraÃ§Ã£o de URL do webhook (Google Sheets)
- Templates de mensagens WhatsApp
- Teste de envio

#### 5.5 Financeiro (Admin Franquia)
- VisualizaÃ§Ã£o do plano atual
- Status de pagamento
- Dias atÃ© vencimento
- HistÃ³rico de cobranÃ§as
- BotÃ£o "Pagar com PIX"
- SincronizaÃ§Ã£o de status com Asaas

---

### 6. Super Admin (/admin)
**Dashboard administrativo global (acesso restrito ao Super Admin).**

**Abas:**

#### 6.1 Dashboard
- **Cards de Resumo:**
  - Faturamento Mensal Bruto
  - Faturamento Mensal Estimado (com descontos)
  - Total de Franquias Ativas
  - Novas Franquias (Ãºltimos 30 dias)
- **Tabela de Franquias:**
  - Nome, slug, status pagamento, vencimento
  - Faturamento mensal individual
  - BotÃµes de aÃ§Ã£o (editar, descontos)

#### 6.2 Planos
- Cadastro de novos planos (mensal, trimestral, anual)
- EdiÃ§Ã£o de valores e descriÃ§Ãµes
- ConfiguraÃ§Ã£o de trial
- AtivaÃ§Ã£o/desativaÃ§Ã£o

#### 6.3 MÃ³dulos
- Cadastro de mÃ³dulos opcionais
- CÃ³digo Ãºnico, nome, descriÃ§Ã£o
- PreÃ§o mensal
- Status ativo/inativo

#### 6.4 Pacotes
- CriaÃ§Ã£o de pacotes comerciais
- AssociaÃ§Ã£o de plano base + mÃ³dulos
- DefiniÃ§Ã£o de desconto percentual
- PreÃ§o total

#### 6.5 Descontos
- AtribuiÃ§Ã£o de descontos por franquia
- **Tipos:**
  - Percentual (ex: 20% off)
  - Valor Fixo (ex: R$ 50 off)
- **OpÃ§Ãµes:**
  - Pontual (apenas prÃ³xima cobranÃ§a)
  - Recorrente (todas as cobranÃ§as futuras)
- **VisualizaÃ§Ã£o:** Desconto ativo exibido abaixo do botÃ£o
- **RemoÃ§Ã£o:** BotÃ£o "Remover desconto" quando aplicÃ¡vel

#### 6.6 Financeiro
- VisÃ£o consolidada de todas as franquias
- Faturamento mensal/trimestral/anual
- Franquias inadimplentes
- CÃ¡lculos consideram descontos ativos

---

### 7. HistÃ³rico (/historico)
**Consulta de entregas passadas.**

**Funcionalidades:**
- Filtros por data, unidade, entregador
- ExportaÃ§Ã£o para Excel
- CÃ¡lculo de tempo mÃ©dio de entrega
- DeleÃ§Ã£o de registros (admins)

---

### 8. Cadastro de Franquias (/register)
**PÃ¡gina pÃºblica para registro de novas franquias.**

**Campos:**
- Nome da franquia
- CPF/CNPJ
- Email e telefone
- Nome da primeira loja
- SeleÃ§Ã£o de plano
- CriaÃ§Ã£o de usuÃ¡rio admin

**Processo:**
1. UsuÃ¡rio preenche formulÃ¡rio
2. Sistema chama edge function `register-franchise`
3. Cria franquia com status `trial`
4. Define `data_vencimento` = hoje + `dias_trial`
5. Cria unidade inicial
6. Cria usuÃ¡rio admin
7. Redireciona para login

**Trial:** 7 dias grÃ¡tis por padrÃ£o.

---

## ðŸ”„ FLUXOS PRINCIPAIS

### Fluxo 1: Check-in de Motoboy

```
Operador clica em "Check-in" no Roteirista
    â†“
Sistema abre modal para seleÃ§Ã£o de tipo de bag
    â†“
Operador confirma
    â†“
Sistema cria registro em historico_entregas:
  - entregador_id
  - hora_saida = NOW()
  - tipo_bag
  - unidade, unidade_id, franquia_id
    â†“
Atualiza entregadores:
  - status = 'em_entrega'
  - hora_saida = NOW()
    â†“
[MÃ³dulo WhatsApp] Envia mensagem ao motoboy (se ativo)
    â†“
[MÃ³dulo Planilha] Envia dados via webhook (se configurado)
    â†“
Tela TV Ã© notificada via Realtime e exibe animaÃ§Ã£o + voz
```

---

### Fluxo 2: Check-out de Motoboy

```
Motoboy retorna Ã  loja
    â†“
Operador clica em "Check-out" no card do motoboy
    â†“
Sistema atualiza historico_entregas:
  - hora_retorno = NOW()
    â†“
Atualiza entregadores:
  - status = 'disponivel'
  - hora_saida = NULL
  - fila_posicao = NOW() (volta ao final da fila)
    â†“
[Opcional] Calcula tempo de entrega e exibe toast
```

---

### Fluxo 3: CobranÃ§a Mensal AutomÃ¡tica

```
Cronjob dispara edge function update-franquias-status
    â†“
Para cada franquia:
  - Verifica data_vencimento
  - Se vencido e sem pagamento:
    - status_pagamento = 'bloqueado'
    â†“
    - Bloqueia acesso ao Roteirista e TV
    - Permite acesso Ã  aba Financeiro em Config
    â†“
Admin de franquia acessa /config?tab=financeiro
    â†“
Clica em "Pagar com PIX"
    â†“
Sistema chama criar-cobranca-franquia:
  - Calcula valor (plano + mÃ³dulos - descontos)
  - Cria cobranÃ§a no Asaas
  - Salva em franquia_cobrancas
  - Retorna checkout_url
    â†“
Admin Ã© redirecionado para pÃ¡gina de pagamento Asaas
    â†“
ApÃ³s pagamento, Asaas envia webhook para webhook-asaas
    â†“
Sistema atualiza:
  - franquia_cobrancas.status = 'paid'
  - franquias.status_pagamento = 'ativo'
  - franquias.data_vencimento = hoje + 30 dias
    â†“
Acesso ao sistema Ã© liberado
```

---

### Fluxo 4: AplicaÃ§Ã£o de Desconto Recorrente

```
Super Admin acessa /admin â†’ aba Descontos
    â†“
Seleciona franquia
    â†“
Preenche formulÃ¡rio:
  - Tipo: Percentual (ex: 20%)
  - Aplicar em: Imediatamente
  - Recorrente: SIM
    â†“
Clica em "Aplicar Desconto"
    â†“
Sistema atualiza franquias:
  - desconto_tipo = 'percentual'
  - desconto_percentual = 20
  - desconto_recorrente = true
    â†“
PrÃ³xima cobranÃ§a criada via criar-cobranca-franquia:
  - valor_base = plano + mÃ³dulos
  - valor_final = valor_base * (1 - 0.20)
  - Exemplo: R$ 249,90 â†’ R$ 199,92
    â†“
Desconto Ã© exibido:
  - Na aba Financeiro da franquia
  - No dashboard Super Admin
  - Na modal de ediÃ§Ã£o da franquia
    â†“
Para remover:
  - Super Admin clica em "Remover desconto"
  - Sistema seta desconto_tipo = 'nenhum'
```

---

## ðŸŽ¯ REGRAS DE NEGÃ“CIO

### 1. Controle de Acesso
- **Super Admin:** Acesso total sem restriÃ§Ãµes
- **Admin Franquia:** 
  - Acesso Ã s suas unidades
  - GestÃ£o de usuÃ¡rios da franquia
  - ConfiguraÃ§Ãµes de webhook/WhatsApp
  - VisualizaÃ§Ã£o financeira
  - **Bloqueio se inadimplente:** NÃ£o acessa Roteirista/TV, apenas Config (aba Financeiro)
- **Operador:**
  - Acesso apenas Ã  unidade vinculada
  - Roteirista, TV, Fila de Pagamento, HistÃ³rico
  - **Bloqueio se inadimplente:** Deslogado automaticamente com aviso

### 2. Reset DiÃ¡rio (03:00)
- Executado via cron â†’ edge function `reset-daily`
- AÃ§Ãµes:
  - Todos motoboys voltam a `status = 'disponivel'`
  - `hora_saida = NULL`
  - `fila_posicao` reorganizada
- Registros antigos em `historico_entregas` (>90 dias) sÃ£o deletados

### 3. Trial e Vencimento
- Nova franquia recebe 7 dias de trial gratuito
- `data_vencimento = data_registro + dias_trial`
- ApÃ³s vencimento:
  - `status_pagamento = 'bloqueado'`
  - Bloqueia funcionalidades operacionais
  - NotificaÃ§Ã£o enviada ao admin da franquia
- Se sem pagamento por 30 dias apÃ³s trial, franquia Ã© deletada (edge function `delete-expired-franchises`)

### 4. Fila de Motoboys
- Ordem determinada por `fila_posicao` (timestamp)
- Ao fazer check-out, motoboy vai para o final da fila (`fila_posicao = NOW()`)
- Drag & Drop no Roteirista nÃ£o altera `fila_posicao` (apenas UI temporÃ¡ria)

### 5. Tipos de Bag
- CustomizÃ¡vel por franquia em `franquia_bag_tipos`
- Associado Ã s unidades via `unidade_bag_tipos`
- Registrado em `historico_entregas.tipo_bag`
- Usado para anÃ¡lises (ex: tempo mÃ©dio por tipo de bag)

### 6. MÃ³dulos Opcionais
- Verificados no frontend via `franquias.config_pagamento.modulos_ativos`
- RenderizaÃ§Ã£o condicional de features:
  - `whatsapp`: Aba "Webhook" em Config
  - `planilha`: Campo URL do webhook
  - `fila_pagamento`: Rota /fila-pagamento
  - `tv_avancada`: AnimaÃ§Ãµes exclusivas na TV
- DesativaÃ§Ã£o de mÃ³dulo esconde funcionalidade (nÃ£o deleta dados)

### 7. CÃ¡lculo de Faturamento
```javascript
// Super Admin â†’ Dashboard
faturamentoBruto = Î£(plano_base de cada franquia)
faturamentoEstimado = Î£(
  plano_base - (desconto_percentual * plano_base / 100) - desconto_valor
)

// Exemplo:
// Franquia A: R$ 249,90 com 20% off â†’ R$ 199,92
// Franquia B: R$ 199,90 sem desconto â†’ R$ 199,90
// Total Bruto: R$ 449,80
// Total Estimado: R$ 399,82
```

### 8. SeguranÃ§a de Senha
- **Armazenamento:** Texto plano em `system_users.password_hash` (âš ï¸� nome incorreto)
- **ValidaÃ§Ã£o:** ComparaÃ§Ã£o direta na funÃ§Ã£o `login()` do `AuthContext`
- **SessÃ£o:** LocalStorage com expiraÃ§Ã£o no reset diÃ¡rio (05:00)
- **âš ï¸� IMPORTANTE:** Em produÃ§Ã£o, implementar bcrypt ou argon2 para hash real

### 9. Turnos de Trabalho
- **PadrÃ£o:** 16:00 - 02:00 (turno noite)
- **Personalizado:** Cada motoboy pode ter turno diferente
- **Dias da Semana:** JSONB `dias_trabalho` controla disponibilidade
- **Filtros no Roteirista:** Exibe apenas motoboys no turno atual

### 10. Webhooks
- **Google Sheets:** Envia dados de entrega para planilha via POST
- **WhatsApp:** Notifica motoboy na saÃ­da
- **Asaas:** Recebe notificaÃ§Ãµes de pagamento
- **Personalizado:** Franquias podem configurar URL prÃ³pria em `system_config.webhook_url`

---

## ðŸ”Œ INTEGRAÃ‡Ã•ES

### ElevenLabs (Text-to-Speech)
**API Key:** Armazenada em `ELEVENLABS_API_KEY` (secret)  
**Uso:**
- GeraÃ§Ã£o de voz para chamadas na TV
- Ã�udios salvos no bucket `motoboy_voices`
- Path: `{franquia_id}/{entregador_id}.mp3`

**ConfiguraÃ§Ã£o:**
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
**ConfiguraÃ§Ã£o por Franquia:**
```javascript
// franquias.config_pagamento.whatsapp
{
  "url": "https://dom-evolution-api.adhwpy.easypanel.host/",
  "instance": "pizzaria",
  "api_key": "E7BCA4BB4535-4C3C-8C97-744315F4DECE"
}
```

**Templates:** PersonalizÃ¡veis em `whatsapp_templates` por unidade.  
**Exemplo:**
```
OlÃ¡ {nome}! 
VocÃª estÃ¡ saindo para entrega. 
Boa viagem! ðŸ��ï¸�
```

**Envio:** Edge function `send-whatsapp` chamada ao fazer check-in.

---

### Asaas (Pagamentos)
**ConfiguraÃ§Ã£o:** `franquias.config_pagamento.customer_id`  
**Fluxo:**
1. Sistema cria cobranÃ§a via API Asaas
2. Retorna `checkout_url` e `external_id`
3. Salva em `franquia_cobrancas`
4. Asaas notifica via webhook `webhook-asaas`
5. Sistema atualiza status do pagamento

**Webhook URL:** `https://[project].supabase.co/functions/v1/webhook-asaas`

---

### Google Sheets (Webhook)
**ConfiguraÃ§Ã£o:** `unidades.config_sheets_url`  
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

**MÃ©todo:** POST para URL configurada.

---

## ðŸ“± ROTAS E NAVEGAÃ‡ÃƒO

```
/ (Index)
  â”œâ”€â”€ /login (Login Administrativo)
  â”œâ”€â”€ /register (Cadastro de Franquias)
  - `/meu-lugar`: Portal "Sou Motoboy" para check-in por senha pessoal com **exigÃªncia obrigatÃ³ria de GPS**
  
  - `[Protegido - Operacional]`
  - `/roteirista`: GestÃ£o da Fila e Mapa de Motoboys em Tempo Real
  â”œâ”€â”€ /tv (Tela de Chamadas)
  â”œâ”€â”€ /fila-pagamento (Sistema de Senhas)
  â”œâ”€â”€ /historico (Consulta de Entregas)
  â”‚
  â”œâ”€â”€ [Protegido - Administrativo]
  â”œâ”€â”€ /config (ConfiguraÃ§Ãµes da Unidade)
  â”‚   â”œâ”€â”€ ?tab=motoboys
  â”‚   â”œâ”€â”€ ?tab=usuarios
  â”‚   â”œâ”€â”€ ?tab=modulos
  â”‚   â”œâ”€â”€ ?tab=webhook
  â”‚   â””â”€â”€ ?tab=financeiro&bloqueio=1
  â”‚
  â””â”€â”€ /admin (Super Admin Dashboard)
      â”œâ”€â”€ ?tab=dashboard
      â”œâ”€â”€ ?tab=planos
      â”œâ”€â”€ ?tab=modulos
      â”œâ”€â”€ ?tab=pacotes
      â”œâ”€â”€ ?tab=descontos
      â””â”€â”€ ?tab=financeiro
```

---

## ðŸŽ¨ DESIGN SYSTEM

### Cores SemÃ¢nticas (index.css)
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
- Ajustes especÃ­ficos em SuperAdmin, Roteirista e Config
- Layout adaptativo para tablets e desktops

---

## ðŸš€ DEPLOY E AMBIENTES

### Desenvolvimento
- **URL:** `http://localhost:5173`
- **Vite Dev Server:** Hot reload ativo
- **Supabase Local:** Opcional via Supabase CLI

### ProduÃ§Ã£o
- **Frontend:** Deploy automÃ¡tico via Lovable
- **Edge Functions:** Deploy automÃ¡tico no Lovable Cloud
- **Banco de Dados:** Supabase (PostgreSQL hospedado)
- **Storage:** Supabase Storage (S3-compatible)

### VariÃ¡veis de Ambiente (.env)
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

## ðŸ“Š MÃ‰TRICAS E ANALYTICS

### Dashboard Financeiro (Super Admin)
- Faturamento mensal bruto e estimado
- Crescimento MoM (Month over Month)
- Taxa de conversÃ£o de trial para pago
- Churn rate
- Franquias ativas vs. bloqueadas

### RelatÃ³rios de Entregas
- Tempo mÃ©dio de entrega por unidade
- Entregas por motoboy
- Picos de movimento (horas/dias)
- Taxa de "nÃ£o apareceu"

---

## ðŸ”§ MANUTENÃ‡ÃƒO E SUPORTE

### Logs de Auditoria
- AÃ§Ãµes administrativas registradas em `logs_auditoria`
- Campos: franquia_id, usuario_email, acao, detalhes (JSONB)

### Cleanup AutomÃ¡tico
- **HistÃ³rico:** Registros >90 dias deletados diariamente
- **Senhas:** Senhas expiradas (>24h) removidas automaticamente
- **Franquias Trial:** Deletadas apÃ³s 30 dias sem pagamento

### Backup
- **Banco de Dados:** Backup automÃ¡tico Supabase (point-in-time recovery)
- **Storage:** ReplicaÃ§Ã£o S3 habilitada

---

## ðŸ›¡ï¸� SEGURANÃ‡A - CHECKLIST

### âœ… Implementado
- HTTPS obrigatÃ³rio (Supabase)
- CORS configurado em edge functions
- ValidaÃ§Ã£o de entrada em forms (React Hook Form + Zod)
- ProteÃ§Ã£o de rotas via `ProtectedRoute`
- Segredos gerenciados via Supabase Secrets

### âš ï¸� Melhorias Recomendadas
- [ ] Implementar hash de senha (bcrypt/argon2)
- [ ] RLS mais restritivo (isolar dados por franquia)
- [ ] Rate limiting em edge functions
- [ ] AutenticaÃ§Ã£o via Supabase Auth (OAuth, MFA)
- [ ] Criptografia de dados sensÃ­veis em JSONB
- [ ] Logs de acesso e atividade suspeita
- [ ] SanitizaÃ§Ã£o de HTML em mensagens WhatsApp

---

## ðŸ“š DOCUMENTAÃ‡ÃƒO TÃ‰CNICA ADICIONAL

### Como Adicionar Nova Franquia Manualmente
```sql
-- 1. Criar franquia
INSERT INTO franquias (nome_franquia, slug, cpf_cnpj, status_pagamento, data_vencimento, config_pagamento)
VALUES ('Nova Pizzaria', 'nova-pizzaria', '12345678900', 'ativo', '2026-02-01', 
  '{"plano_id":"404b30bf-f308-42e4-a263-60acec5cba29","modulos_ativos":["whatsapp","planilha"]}'::jsonb);

-- 2. Criar unidade
INSERT INTO unidades (franquia_id, nome_loja)
VALUES ((SELECT id FROM franquias WHERE slug = 'nova-pizzaria'), 'Loja Centro');

-- 3. Criar usuÃ¡rio admin
INSERT INTO system_users (username, password_hash, role, unidade, franquia_id)
VALUES ('admin_nova', 'senha123', 'admin', 'CENTRO', 
  (SELECT id FROM franquias WHERE slug = 'nova-pizzaria'));

-- 4. Vincular usuÃ¡rio Ã  unidade
INSERT INTO user_unidades (user_id, unidade_id)
SELECT 
  (SELECT id FROM system_users WHERE username = 'admin_nova'),
  (SELECT id FROM unidades WHERE nome_loja = 'Loja Centro');
```

### Como Debugar Problema de Chamada na TV
1. Verificar se motoboy estÃ¡ ativo (`entregadores.ativo = true`)
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

### Como Exportar Dados para AnÃ¡lise
```sql
-- Entregas por motoboy (Ãºltimos 30 dias)
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

## ðŸ“� CHANGELOG

### v2.9.1 (2026-06-16)
- âœ… **Erros corrigidos**:
    - Resolvidos os problemas de tela preta no Analytics Pro e logout ao recarregar a pÃ¡gina (F5).
- âœ… **Registro de horÃ¡rio de retorno na planilha**:
    - Agora o sistema registra o horÃ¡rio de retorno e o tempo de rua do motoboy na mesma linha de saÃ­da na planilha.
- âœ… **Melhoria no histÃ³rico**:
    - Aprimoramento visual e de mÃ©tricas na listagem e exportaÃ§Ã£o do painel de HistÃ³rico.

### v2.8.0 (2026-06-14)
- âœ… **Screensaver de TransmissÃ£o via WebRTC (SaaS Screen Sharing)**:
    - Novo tipo de mÃ­dia `transmissao` adicionado ao Screensaver da TV.
    - CriaÃ§Ã£o dos componentes `ScreenShareReceiver.tsx`, `ScreenShareTransmitter.tsx` e do contexto `ScreenShareContext.tsx` utilizando Supabase como canal de Signaling em tempo real para os Peers WebRTC.
    - IntegraÃ§Ã£o com servidores STUN/TURN (script de instalaÃ§Ã£o `install_coturn.sh` incluÃ­do) para garantir conectividade de rede atrÃ¡s de NATs simÃ©tricos.
    - PÃ¡gina de diagnÃ³stico local `/public/test-rtc.html` criada para testar conectividade e handshake WebRTC.
- âœ… **RefatoraÃ§Ã£o Completa do Modal de Controle de Maquininhas (`MaquininhaControlModal.tsx`)**:
    - AlteraÃ§Ã£o do layout de grid-cols para flexbox nas colunas de Motoboys ElegÃ­veis e Maquininhas Livres, garantindo o scroll independente de cada lista sem quebrar a proporÃ§Ã£o do modal.
    - Ajuste do contÃªiner de scroll da aba "Devolver" para manter os estados de carregamento (Loader) e vazio (CheckCircle) centralizados na tela, em vez de ficarem restritos Ã  Ã¡rea de rolagem.
- âœ… **LÃ³gica Unificada de Check-in DiÃ¡rio na TV (`TV.tsx`)**:
    - SincronizaÃ§Ã£o dos campos `primeiro_checkin` (usado para o cÃ¡lculo do screensaver) e `checkin_diario` (usado para controle administrativo de check-in diÃ¡rio) na funÃ§Ã£o `handleCheckin` da TV, resetando-os automaticamente na primeira entrada do dia.

### v2.7.0 (2026-05-11)
- âœ… **Aesthetic Refactor (Glassmorphism):** RefatoraÃ§Ã£o estÃ©tica profunda em todas as pÃ¡ginas do sistema (`Index`, `Login`, `Register`, `Roteirista`, `Config`, `FilaPagamento`, `MeuLugar`, `Historico`, `SuperAdmin`), adotando a linguagem visual premium *Glassmorphism* com tipografia de alto contraste e animaÃ§Ãµes de estado.
- âœ… **Plano de AutomaÃ§Ã£o Sisfood Backend:** CriaÃ§Ã£o do plano arquitetural (`SISFOOD_AUTOMATION_PLAN.md`) para migraÃ§Ã£o da baixa de pedidos do Tampermonkey (Client-Side) para Supabase Edge Functions (Server-Side).

### v2.6.2 (2026-03-21)
- âœ… **App Motoboy (Expo React Native):** Frontend e Backend com notificaÃ§Ãµes nativas Expo push ao longo das chamadas na tela de TV.
- âœ… **AÃ§Ãµes Roteirista (SemÃ¢nticas):** CriaÃ§Ã£o do atalho rÃ¡pido (`Em Entrega`) e renomeaÃ§Ã£o estratÃ©gica para `Deixar DisponÃ­vel`.
- âœ… **TV e Call UX:** O modal de nÃ£o-comparecimento agora Ã© um banner 10 segundos flutuante nÃ£o-bloqueante no bottom-40 garantindo visibilidade em resoluÃ§Ãµes mais espremidas.

### v2.6.0 (2026-03-12)
- âœ… **Kanban de AtualizaÃ§Ãµes:** Refatorado painel de Super Admin para visualizaÃ§Ã£o Kanban das atualizaÃ§Ãµes.
- âœ… **Sisfood v9.6:** CorreÃ§Ã£o crÃ­tica no cÃ¡lculo de tempo em fila preservando timestamp original do Sisfood.
- âœ… **Termos e Privacidade:** Adicionados modais de conformidade na Landing Page.
- âœ… **ResiliÃªncia de Dados:** Alterado comportamento de reset para preservaÃ§Ã£o de histÃ³rico em anÃ¡lises futuras.

### v1.3.0 (2026-02-28)
- âœ… **Estabilidade da TV (Redescagem):** Implementado sistema de rediscagem automÃ¡tica de 10 segundos entre tentativas (mÃ¡ximo 3) com aviso por voz em caso de falha persistente.
- âœ… **Ã�udios de BAG/Bebida:** Caminhos de Ã¡udio agora sÃ£o construÃ­dos dinamicamente no Storage (`[franquiaId]/bags/[bagId].mp3`), resolvendo silÃªncios nas chamadas.
- âœ… **Conserto Analytics Pro:** Implementada retrocompatibilidade na RPC de mÃ©tricas. Novos registros agora salvam `unidade_id` corretamente para precisÃ£o estatÃ­stica.
- âœ… **Limpeza AutomÃ¡tica:** Adicionado rotina de limpeza de cache diÃ¡rio (localStorage) na tela de TV para manutenÃ§Ã£o de performance.

### v1.2.0 (2026-02-26)
- âœ… **ImplementaÃ§Ã£o Mobile Base Real:** RefatoraÃ§Ã£o completa da UI/UX mobile executada. Drawers de navegaÃ§Ã£o aplicados (Home e Dashboard), tabelas substituÃ­das por Grid Cards responsivos no Roteirista e HistÃ³rico, botÃµes de aÃ§Ã£o e modais (ex: Reset) reestruturados para width 100% visando mÃ¡xima usabilidade em telas pequenas.

### v1.1.0 (2026-02-23)
- âœ… **Mapa de Entregadores:** Implementado painel Mapa no Roteirista para visualizaÃ§Ã£o em tempo real.
- âœ… **Obrigatoriedade GPS:** Adicionada permissÃ£o silenciosa de GPS Ã  pÃ¡gina `/meu-lugar` para motoboys operacionais.

### v1.0.0 (2026-01-02)
- âœ… **LanÃ§amento Base:** Sistema de descontos, faturamento e responsividade inicial.

### PrÃ³ximas Features (Roadmap)
- [ ] Multi-tenant completo com RLS restritivo (PragmÃ¡tico atual -> Custom Claims JWT)
- [ ] Dashboard de analytics avanÃ§ado para franquias
- [ ] App mobile nativo para motoboys PWA -> Native
- [ ] IntegraÃ§Ã£o com Mercado Pago e PagSeguro
- [ ] Sistema de notificaÃ§Ãµes push (Web Push atual -> Mobile)
- [ ] RelatÃ³rios exportÃ¡veis em PDF

---

**FIM DA DOCUMENTAÃ‡ÃƒO**

*Este documento foi atualizado em 2026-06-16.*  
*Todos os dados cadastrados, estruturas de tabelas, polÃ­ticas RLS e funcionalidades foram extraÃ­dos diretamente do banco de dados e cÃ³digo-fonte.*