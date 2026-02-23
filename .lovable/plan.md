

# Plano de Implementacao

Este plano aborda 4 problemas principais: (1) a chamada do motoboy na TV que pula direto para "entregando", (2) a tela de planos/modulos que precisa ser redesenhada, (3) RLS por franquia, e (4) o botao "Configurar Chamadas da TV" como modulo extra.

---

## 1. Corrigir chamada do motoboy na TV

**Problema raiz:** A pagina `Roteirista.tsx` tem um `useEffect` (linhas 138-168) que auto-transiciona o motoboy de "chamado" para "entregando" apos apenas **3 segundos**. Ao mesmo tempo, a TV (linhas 582-596) espera **15 segundos** para exibir a animacao antes de fazer essa mesma transicao. O Roteirista "ganha a corrida" e muda o status antes da TV processar a chamada.

**Solucao:**
- Remover o auto-transition de 3 segundos do `Roteirista.tsx` (linhas 138-168)
- Deixar APENAS a TV responsavel por transicionar de "chamado" para "entregando" (ja faz isso apos 15s)
- Caso a TV nao esteja aberta, adicionar um fallback no Roteirista com timeout maior (ex: 60 segundos) para garantir que motoboys nao fiquem presos no status "chamado"

**Arquivos:** `src/pages/Roteirista.tsx`

---

## 2. Redesenhar tela de Planos e Modulos (estilo das imagens de referencia)

**Problema:** A tela atual (`PlanosModulosSection.tsx`) e um formulario generico. O usuario quer uma interface similar as imagens enviadas, com:
- Cards visuais de cada modulo/funcionalidade com preco, status (HABILITADO/DESABILITADO) e botao de adicionar
- Uma lista de "recursos" da franquia mostrando o que esta ativo e inativo (como badges)
- Tela do admin da franquia com visao de "Gerenciar Plano" + "Cobrancas"
- Tela do super admin para cadastrar modulos e atrelar funcoes

**Mudancas:**
- Reescrever `PlanosModulosSection.tsx` para o super admin com grid de cards visuais
- Criar novo componente `FranquiaPlanoManager.tsx` para a visao do admin_franquia dentro de `Config.tsx`, mostrando:
  - Resumo do plano atual, data de cobranca, status
  - Grid de badges com funcionalidades (Historico, WhatsApp, TV Avancada, etc.) e status HABILITADO/DESABILITADO
  - Dialog "Adicionar Produto" com cards de modulos disponiveis e precos
  - Lista de produtos/modulos ativos da franquia

**Modulos como funcionalidades do sistema:**
- Cada modulo no banco (`modulos` table) representara uma funcionalidade: `historico`, `whatsapp_avancado`, `tv_avancada`, `configurar_chamadas_tv`, etc.
- O super admin cadastra e ativa/desativa modulos por franquia
- No frontend, verificar `modulos_ativos` da franquia para mostrar/esconder abas e funcoes

**Arquivos:** `src/components/PlanosModulosSection.tsx`, novo `src/components/FranquiaPlanoManager.tsx`, `src/pages/Config.tsx`

---

## 3. "Configurar Chamadas da TV" como modulo extra

**Problema:** O botao "Configurar Chamadas da TV" (imagem 3) precisa ser um modulo extra, acessivel apenas para o admin da franquia que tenha esse modulo ativo.

**Solucao:**
- Criar modulo com codigo `configurar_chamadas_tv` na tabela `modulos`
- No `Config.tsx`, verificar se o modulo esta ativo na franquia antes de exibir o botao `TVCallConfigModal`
- Apenas `admin_franquia` com o modulo ativo pode ver/usar essa funcionalidade

**Arquivos:** `src/pages/Config.tsx`

---

## 4. Implementar RLS por franquia_id

**Problema:** Todas as tabelas tem politicas permissivas `USING (true)`, qualquer usuario ve tudo.

**Solucao:**
Como o sistema usa autenticacao customizada (nao usa `auth.uid()` do Supabase Auth), as RLS policies baseadas em `auth.uid()` nao funcionarao. O sistema autentica via edge function e usa tokens proprios.

**Abordagem pragmatica:**
- Manter as policies permissivas por enquanto (o sistema ja filtra por `franquia_id` no frontend/queries)
- Adicionar filtros `franquia_id` consistentes em todas as queries do frontend que ainda nao filtram
- Documentar que para RLS real seria necessario migrar para Supabase Auth ou passar o `franquia_id` via claims JWT customizados

Alternativamente, se o usuario quiser RLS real:
- Criar uma funcao `get_user_franquia_id()` que extrai o `franquia_id` do JWT customizado
- Aplicar policies usando essa funcao em todas as tabelas com `franquia_id`
- Isso requer que o edge function `auth-login` gere JWTs que o Supabase reconheca (usando o JWT secret do projeto)

**Arquivos:** Migration SQL, `supabase/functions/auth-login/index.ts`

---

## Resumo tecnico das mudancas

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Roteirista.tsx` | Remover auto-transition de 3s, adicionar fallback de 60s |
| `src/components/PlanosModulosSection.tsx` | Redesenhar com cards visuais, badges de status, dialog "Adicionar Produto" |
| `src/components/FranquiaPlanoManager.tsx` | Novo - visao admin_franquia do plano e modulos |
| `src/pages/Config.tsx` | Integrar FranquiaPlanoManager, condicionar "Configurar Chamadas da TV" ao modulo |
| `supabase/functions/auth-login/index.ts` | Incluir `franquia_id` no JWT para RLS |
| Migration SQL | Criar policies RLS baseadas em JWT claims |

---

## Ordem de implementacao

1. Corrigir TV call (Roteirista auto-transition) - impacto imediato
2. Redesenhar tela de planos/modulos
3. Modulo "Configurar Chamadas da TV"
4. RLS por franquia (JWT + policies)

