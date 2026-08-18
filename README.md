# 🌿 RotinaPet — Frontend

> Sistema moderno de agendamento e gerenciamento de cuidados para pets, desenvolvido com Angular 20 e Material Design.

![Angular](https://img.shields.io/badge/Angular-20.1.4-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Material Design](https://img.shields.io/badge/Material%20Design-UI-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🚀 Funcionalidades

- ✅ **Autenticação completa** - Login/Signup com validação
- ✅ **Tela Hoje orientada à ação** - Atrasados, cuidados do dia, conclusão em um toque e desfazer seguro
- ✅ **Gerenciamento de Pets** - CRUD completo de pets
- ✅ **Planos de cuidado** - Recorrência, orientações e lembretes com ocorrências independentes
- ✅ **Agenda confiável** - Filtros por pet, período, tipo e status, com histórico auditável
- ✅ **Caderneta de saúde** - Linha do tempo clínica, registro rápido e formulários progressivos
- ✅ **Evolução de saúde** - Peso, temperatura e condição corporal em gráfico e tabela acessíveis
- ✅ **Anexos privados** - Exames, receitas e fotos com upload direto e download autenticado
- ✅ **Cuidado compartilhado** - Papéis familiares, convites, responsáveis e passagem de turno
- ✅ **Resumo veterinário** - Histórico por período, impressão e link externo revogável com escopo mínimo
- ✅ **Planejamento financeiro** - Realizado, previsões dos planos, filtros e CSV seguro para planilhas
- ✅ **Integração Google Maps** - Localização de veterinárias e petshops
- ✅ **Perfil de usuário** - Gerenciamento de dados pessoais
- ✅ **Design responsivo** - Funciona em desktop e mobile
- ✅ **Tema moderno** - Direção visual Quintal, modos claro e escuro

## 🛠️ Tecnologias

- **Framework**: Angular 20.1.4
- **UI Library**: Angular Material
- **Linguagem**: TypeScript
- **Estilização**: CSS3 + Material Design
- **Maps**: Google Maps API
- **Deploy**: Vercel
- **Gerenciamento de Estado**: RxJS

## ⚡ Quick Start

Requer Node.js 22.12+ (a versão usada no CI está registrada em `.nvmrc`) e npm 9+.

### 1. Clone o repositório
```bash
git clone https://github.com/caiovilquer/pet-care-front.git
cd pet-care-scheduler-front
```

### 2. Instale as dependências
```bash
npm ci
```

### 3. Configure as variáveis de ambiente
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o .env com suas chaves
API_URL=/api/v1
GOOGLE_MAPS_API_KEY=sua-chave-do-google-maps
```

### 4. Inicie o servidor de desenvolvimento
```bash
npm start
```

A aplicação estará rodando em `http://localhost:4200/`

## 🔧 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm start` | Inicia servidor de desenvolvimento |
| `npm run build` | Build para desenvolvimento |
| `npm run build:prod` | Build para produção com variáveis |
| `npm run set-env` | Gera arquivo de variáveis de ambiente |
| `npm test` | Executa testes unitários |

## 🌍 Configuração de Ambiente

### Desenvolvimento Local
1. Configure o arquivo `.env` na raiz do projeto
2. Use `npm start` para carregar as variáveis automaticamente

### Produção (Vercel)
1. Configure as variáveis no painel do Vercel:
   - `API_URL`: URL da sua API backend
   - `GOOGLE_MAPS_API_KEY`: Chave da API do Google Maps
2. O deploy automático usa `npm run build:prod`

📋 **Ver instruções detalhadas**: [SETUP.md](./SETUP.md) | [DEPLOY.md](./DEPLOY.md)

## 📱 Estrutura do Projeto

```
src/
├── app/
│   ├── core/                 # Serviços, guards, interceptors
│   │   ├── services/         # Serviços da aplicação
│   │   ├── models/           # Interfaces e tipos
│   │   └── guards/           # Guards de autenticação
│   ├── features/             # Funcionalidades principais
│   │   ├── auth/             # Login/Signup
│   │   ├── dashboard/        # Dashboard principal
│   │   ├── pets/             # Gerenciamento de pets
│   │   ├── health/           # Linha do tempo, formulários e gráficos clínicos
│   │   ├── events/           # Sistema de eventos
│   │   ├── reports/          # Resumo veterinário, compartilhamento e finanças
│   │   └── profile/          # Perfil do usuário
│   ├── shared/               # Componentes compartilhados
│   │   └── components/       # Layout, cards, mapas
│   └── environments/         # Configurações de ambiente
├── assets/                   # Recursos estáticos
└── styles.css               # Estilos globais
```

## 🎨 Design System — RotinaPet (direção "Quintal")

### Paleta de Cores
- **Primária (verde-mata)**: `#265949`
- **Acento (amarelo-ipê)**: `#DFA32E`
- **Fundo (areia)**: `#F6F2E8`
- **Texto (grafite-verde)**: `#20261F`
- **Semânticas**: sucesso `#2E7D52` · alerta `#9A6B10` · erro `#B3402F` · info `#38709B`
- Dark mode completo via `light-dark()` + `color-scheme` (toggle no header, persistido em localStorage)

### Tipografia
- **Display**: Bricolage Grotesque (600/700)
- **Corpo**: Hanken Grotesk (400–700)

### Tokens e componentes
- Tokens `--q-*` em `src/styles.css` (cores, raios, sombras, escala de espaço de 4px)
- Tema Material M3 próprio em `src/theme.scss` (`mat.theme`) + sobrescrita de `--mat-sys-*`
- Componentes de UI compartilhados (`rp-*`) em `src/app/shared/components/ui/`:
  pet-avatar (moldura orgânica), page-header, stat-card, empty-state, skeleton,
  confirm-dialog, nearby-toggle
- Shell: header leve no desktop + bottom nav no mobile (breakpoint 960px)

## 🔐 Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `API_URL` | URL da API backend | `https://api.petcare.com/api/v1` |
| `GOOGLE_MAPS_API_KEY` | Chave da API do Google Maps | `AIzaSy...` |

## 🚀 Deploy

### Vercel (Recomendado)
1. Conecte seu repositório GitHub ao Vercel
2. Configure as variáveis de ambiente no painel
3. Deploy automático a cada push na main

### Build Local
```bash
npm run build:prod
```
Os arquivos gerados estarão em `dist/pet-care-scheduler-front/browser/`

## 🧪 Testes

```bash
# Testes unitários
npm test

# Execução não interativa, igual ao CI
npm test -- --watch=false --browsers=ChromeHeadless
```

## 📦 Dependências Principais

- `@angular/core` - Framework Angular
- `@angular/material` - Material Design Components
- `@angular/google-maps` - Integração Google Maps
- `@angular/forms` - Formulários reativos
- `rxjs` - Programação reativa

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

**Caio Vilquer**
- GitHub: [@caiovilquer](https://github.com/caiovilquer)

---

# Timezones da agenda

O frontend lê `household.timezone` (IANA) da API. Datetimes naive de cuidados representam wall-clock nesse fuso; quando o navegador está em outro timezone, o cliente envia ISO com `Z`, e a API converte para o wall-clock da família. Respostas naive são convertidas do timezone do household para exibição no relógio local do navegador. Saúde e despesas continuam usando `toISOString()` e UTC. O fallback compatível fica centralizado em `DEFAULT_HOUSEHOLD_TIMEZONE` e permanece `America/Sao_Paulo`.
