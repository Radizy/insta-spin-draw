# Sorteio Insta - Sorteios de Instagram Fáceis e Divertidos

Um aplicativo web moderno e colorido para realizar sorteios com comentários do Instagram de forma rápida, fácil e divertida.

## 🎯 Funcionalidades

### ✅ Implementado
- **Interface colorida e divertida** com animações suaves
- **Dois métodos de seleção**: Por perfil (@usuario) ou link direto da publicação
- **Filtros configuráveis**:
  - Exigir 2+ menções no comentário
  - Permitir/bloquear comentários duplicados
- **Sorteio animado** com contagem regressiva e efeito roleta
- **Múltiplos ganhadores** e suplentes
- **Confete animado** nos resultados
- **Download e compartilhamento** dos resultados
- **Design responsivo** para desktop e mobile
- **Sistema de autenticação** Instagram OAuth (em desenvolvimento)
- **API real** do Instagram Graph API (configurável)

### 🚧 Em Desenvolvimento
- Integração completa com Instagram Graph API
- Backend para gerenciamento de tokens
- Configurações avançadas de filtros

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Design System customizado
- **UI Components**: shadcn/ui + Radix UI
- **Animações**: CSS Animations + Tailwind
- **API**: Instagram Graph API + Mock API para desenvolvimento
- **Autenticação**: OAuth 2.0 do Instagram

## 🎨 Design System

O app utiliza um design system colorido e alegre:

- **Cores primárias**: Rosa (#ff6b9d), Azul (#3742fa), Laranja (#f8b500)
- **Gradientes**: Transições suaves entre cores complementares
- **Animações**: Confete, roleta, bounce, glow effects
- **Tipografia**: System fonts com hierarquia clara
- **Componentes**: Botões grandes, cards arredondados, inputs intuitivos

## 🚀 Como Usar

### Modo Desenvolvimento (Mock API)
1. Clone o repositório
2. Execute `npm install`
3. Execute `npm run dev`
4. Acesse `http://localhost:8080`

O app funcionará automaticamente em modo demo com dados simulados.

### Modo Produção (Instagram Real)
Para usar com dados reais do Instagram:

1. **Configure o Instagram App**:
   - Crie um app no [Facebook Developers](https://developers.facebook.com/)
   - Configure Instagram Basic Display API
   - Adicione as URLs de redirect

2. **Configure as variáveis de ambiente**:
   ```bash
   VITE_INSTAGRAM_APP_ID=your_app_id
   ```

3. **Deploy e configuração**:
   - Configure o backend para processar tokens OAuth
   - Adicione as URLs de produção no Instagram App

## 📱 Fluxo de Uso

1. **Autenticação**: Login com Instagram (ou modo demo)
2. **Seleção**: Escolha um post por @ ou URL
3. **Configuração**: Defina filtros e número de ganhadores
4. **Sorteio**: Contagem regressiva + animação de roleta
5. **Resultado**: Celebração com confete + download

## 🔧 Configuração Técnica

### Estrutura do Projeto
```
src/
├── components/         # Componentes React
├── lib/               # Utilitários e APIs
├── pages/             # Páginas da aplicação
├── types/             # Definições TypeScript
└── assets/            # Imagens e recursos
```

### APIs Principais
- `realInstagramApi`: Integração real com Instagram
- `mockInstagramApi`: Dados simulados para desenvolvimento
- `instagramAuth`: Gerenciamento de autenticação OAuth

## 🎯 Próximos Passos

- [ ] Backend completo para tokens Instagram
- [ ] Histórico de sorteios
- [ ] Sorteios programados
- [ ] Integração com outras redes sociais
- [ ] Templates personalizados para resultados
- [ ] Analytics de sorteios

## 🐛 Resolução de Problemas

### Erro de Autenticação Instagram
- Verifique se o App ID está correto
- Confirme as URLs de redirect no Facebook Developers
- Use o modo demo para testes

### Comentários não carregam
- Verifique se a publicação é pública
- Confirme se o usuário tem permissões adequadas
- O Instagram limita acessos à API

## 📄 Licença

Este projeto é apenas para fins educacionais e de demonstração. Respeite os termos de uso do Instagram ao utilizar suas APIs.

---

**Desenvolvido com ❤️ para tornar sorteios mais divertidos!** 🎉