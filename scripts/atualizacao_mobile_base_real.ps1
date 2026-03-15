$conteudo = @"
# 📱 ATUALIZAÇÃO MOBILE COMPLETA — FILALAB (BASE REAL DO SISTEMA)

## 🎯 OBJETIVO

Refatorar toda experiência mobile do FilaLab com base
na estrutura e funcionalidades atuais do sistema:

- Área pública
- Área logada (operacional)
- Fila de motoboys
- Disponíveis
- Em Entrega
- Histórico
- Analytics Pro
- Configurações
- Reset de Expediente
- Botões operacionais

⚠ Desktop NÃO deve ser alterado.
A atualização deve afetar apenas telas mobile (< md).

---

# 1️⃣ MENU GLOBAL MOBILE (ÁREA PÚBLICA)

## Problema atual:
Menu fica desorganizado e ocupa espaço excessivo.

## Solução:

Implementar Drawer lateral padrão (igual estilo da index atual).

### Comportamento:

- Ícone ☰ no topo direito
- Abre menu lateral animado
- Overlay escuro no fundo
- Fecha ao clicar fora ou no X

### Itens do Menu:

- Home
- Como Funciona
- Módulos
- Contato
- Sou Motoboy
- Fazer Login
- Assinar Agora

Botões:
- Full width
- Altura mínima 48px
- Espaçamento confortável para toque

---

# 2️⃣ ÁREA LOGADA — MENU MOBILE OPERACIONAL

## Problema:
Sidebar lateral não funciona bem em telas pequenas.

## Nova Estrutura:

No mobile:

- Sidebar escondida
- Botão  ☰ no topo da área logada
- Abre Drawer lateral com:

  - Fila
  - Disponíveis
  - Em Entrega
  - Histórico
  - Analytics Pro
  - Configurações
  - Sair

Desktop:
Manter sidebar fixa atual.

---

# 3️⃣ TELA PRINCIPAL OPERACIONAL (FILA)

## Ajustes Mobile:

### Cards de Motoboys
- Empilhar verticalmente
- Remover múltiplas colunas
- Usar grid-cols-1 no mobile
- Espaçamento maior entre cards

### Botões:
- "Chamar Próximo"
- "Check-in"
- "Remover da Fila"
- "Mover para Em Entrega"

No mobile:
- Todos 100% largura
- Não ficar lado a lado
- Espaçamento vertical consistente

---

# 4️⃣ ABA DISPONÍVEIS

No mobile:

- Lista vertical
- Card grande por motoboy
- Botões internos empilhados
- Informações mais visíveis
- Evitar tabela comprimida

Se houver tabela:
Aplicar overflow-x-auto.

---

# 5️⃣ ABA EM ENTREGA

No mobile:

- Card único por motoboy
- Mostrar:

  Nome
  Tempo de entrega
  Ações

Botão:
"Remover da Fila"

Deve estar visível e full width.

Evitar ações pequenas lado a lado.

---

# 6️⃣ HISTÓRICO

No mobile:

- Substituir tabela compacta por:
  Lista vertical de cards

Cada card deve conter:

- Nome do motoboy
- Horário saída
- Horário retorno
- Tempo total
- Quantidade

Filtro de data:
Inputs full width.

---

# 7️⃣ ANALYTICS PRO

No mobile:

- Filtros empilhados:
  Data inicial
  Hora inicial
  Data final
  Hora final

- Botão aplicar filtro full width
- Cards de métricas empilhados
- Gráficos responsivos (width 100%)

Nunca permitir overflow lateral.

---

# 8️⃣ CONFIGURAÇÕES

No mobile:

- Seções separadas em cards
- Botão "Reset de Expediente" full width
- Modal de confirmação adaptado
- Texto explicativo mais legível

---

# 9️⃣ PADRÃO GLOBAL MOBILE

Aplicar:

Containers:
px-4
max-w-full

Grid:
grid-cols-1 md:grid-cols-X

Botões:
w-full md:w-auto
min-h-[48px]

Títulos:
text-lg md:text-xl lg:text-2xl

Espaçamento:
gap-4 ou gap-6

---

# 🔟 PERFORMANCE MOBILE

- Evitar múltiplos re-renders pesados
- Lazy load de gráficos
- Otimizar animações do drawer
- Evitar sombras excessivas

---

# 11️⃣ EXPERIÊNCIA TIPO APP

No mobile:

- Navbar fixa no topo
- Área de conteúdo com scroll
- Botões principais grandes
- Sensação de aplicativo

---

# 12️⃣ TESTES OBRIGATÓRIOS

Testar:

320px
360px
375px
390px
414px

Validar:

- Nenhum scroll lateral
- Nenhum botão cortado
- Nenhuma sidebar fixa ocupando espaço
- Drawer funcionando corretamente
- Todas funcionalidades operacionais intactas

---

# ✅ RESULTADO ESPERADO

✔ Sistema totalmente utilizável pelo operador no celular  
✔ Fila operável com uma mão  
✔ Ações grandes e claras  
✔ Menu funcional  
✔ Desktop inalterado  
✔ Visual profissional  
✔ Experiência semelhante a app  

Stack:
React + TypeScript + Tailwind

Aplicar atualização respeitando todas as funcionalidades já existentes.
"@

$arquivo = "Atualizacao_Mobile_Base_Sistema_Real.md"
Set-Content -Path $arquivo -Value $conteudo -Encoding UTF8

Write-Host "Arquivo $arquivo gerado com sucesso!"
