# SISD — Sistema de Gestão de Dispensas

> **Projeto Integrador em Computação II — UNIVESP**

Sistema web para gerenciamento de processos de **dispensa de licitação**, desenvolvido com foco em uma aplicação realista, acessível e tecnicamente fundamentada, mantendo o escopo adequado a um projeto universitário.

## Sobre o projeto

O **SISD (Sistema de Gestão de Dispensas)** tem como objetivo digitalizar e organizar o fluxo de processos de dispensa de licitação, desde a criação da solicitação até sua aprovação e conclusão.

A proposta é centralizar informações, documentos, cotações, fornecedores, aprovações e histórico das operações relacionadas a um processo.

O projeto possui **aplicabilidade real**, mas não pretende reproduzir toda a complexidade de um sistema governamental de produção. O foco é implementar um **MVP funcional**, demonstrando conceitos de desenvolvimento web, modelagem de dados, APIs, segurança, acessibilidade e testes.

## Objetivos

### Objetivo geral

Desenvolver uma aplicação web capaz de apoiar o gerenciamento de processos de dispensa de licitação de forma organizada, rastreável e acessível.

### Objetivos específicos

- Permitir o cadastro e gerenciamento de processos de dispensa.
- Organizar informações do objeto da contratação.
- Registrar cotações e propostas de fornecedores.
- Permitir o cadastro e seleção de fornecedores.
- Gerenciar documentos associados aos processos.
- Implementar um fluxo de análise e aprovação.
- Registrar o histórico das principais ações realizadas.
- Implementar controle de acesso baseado em usuários e papéis.
- Disponibilizar uma API para comunicação entre frontend e backend.
- Utilizar banco de dados relacional para persistência.
- Aplicar princípios de acessibilidade e IHC.
- Aplicar metodologias formais de teste.
- Utilizar controle de versão durante todo o desenvolvimento.
- Utilizar recursos de computação em nuvem.
- Incorporar uma pequena funcionalidade de análise de dados como diferencial profissional.

## Escopo do MVP

O MVP será concentrado no fluxo principal de uma dispensa de licitação:

```text
Criação do processo
        ↓
Análise
        ↓
Cadastro de cotações
        ↓
Seleção do fornecedor
        ↓
Anexação de documentos
        ↓
Envio para aprovação
        ↓
Aprovação ou rejeição
        ↓
Conclusão
```

Principais módulos:

- Autenticação
- Usuários e perfis
- Departamentos
- Processos
- Fornecedores
- Cotações
- Documentos
- Aprovações
- Histórico/Auditoria
- Dashboard e indicadores básicos

## Perfis de usuário

| Perfil                    | Responsabilidade principal                               |
| ------------------------- | -------------------------------------------------------- |
| **Administrador**         | Gerenciamento do sistema e usuários                      |
| **Solicitante**           | Criação e acompanhamento de solicitações                 |
| **Agente de Contratação** | Análise, cotações, fornecedores e preparação do processo |
| **Aprovador**             | Análise final e aprovação/rejeição                       |

O acesso às funcionalidades será controlado no backend por autenticação e autorização.

## Arquitetura

```text
┌─────────────────────────────┐
│       Frontend / UI         │
│       React / Next.js       │
└──────────────┬──────────────┘
               │
               │ HTTP / JSON
               ▼
┌─────────────────────────────┐
│    Next.js Pages API Routes │
│          /pages/api         │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│          Services           │
│     Regras de negócio       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│           Prisma            │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│         PostgreSQL          │
└─────────────────────────────┘
```

O projeto utilizará o **Next.js Pages Router**, com API Routes localizadas em:

```text
src/pages/api/
```

Princípio arquitetural:

> **As rotas HTTP expõem a aplicação; os services implementam as regras de negócio; o Prisma realiza a persistência.**

## Stack tecnológica

### Frontend e aplicação web

- Next.js
- React
- TypeScript
- JavaScript

O projeto será desenvolvido em TypeScript, que é baseado em JavaScript e permite tipagem estática durante o desenvolvimento.

### Backend / API

- Next.js API Routes
- REST-style API
- TypeScript

### Banco de dados

- PostgreSQL
- Prisma ORM

### Infraestrutura

- Recursos de computação em nuvem.
- Ambiente de desenvolvimento e/ou produção hospedado em serviço cloud.

### Controle de versão

- Git
- Repositório remoto para colaboração e histórico do projeto.

### Testes

O projeto utilizará metodologias formais de teste, contemplando, conforme aplicável:

- Testes unitários
- Testes de integração
- Testes das API Routes
- Testes de fluxos críticos
- Testes de acessibilidade

A estratégia definitiva de ferramentas será definida durante a implementação.

## Requisitos técnicos da UNIVESP

O projeto foi planejado para contemplar os requisitos técnicos apresentados para o **Projeto Integrador em Computação II**.

| Requisito                      | Como o SISD atende                                                     |
| ------------------------------ | ---------------------------------------------------------------------- |
| **Framework Web**              | Next.js + React                                                        |
| **Banco de dados**             | PostgreSQL + Prisma                                                    |
| **JavaScript / Web Scripting** | React/Next.js e TypeScript baseado em JavaScript                       |
| **Computação em nuvem**        | Deploy e/ou serviços de infraestrutura em cloud                        |
| **Integração com APIs**        | API REST desenvolvida com Next.js API Routes                           |
| **Acessibilidade**             | Interface desenvolvida considerando princípios de IHC e acessibilidade |
| **Controle de versão**         | Git                                                                    |
| **Testes**                     | Estratégia formal de testes unitários, integração e fluxos críticos    |
| **Análise de dados**           | Dashboard e indicadores básicos como diferencial                       |

> A implementação concreta de cada requisito será registrada na documentação e nos artefatos correspondentes do projeto.

## Acessibilidade e IHC

A interface será desenvolvida considerando princípios de **Interação Humano-Computador (IHC)** e acessibilidade.

Práticas previstas:

- Estrutura semântica adequada.
- Navegação por teclado.
- Foco visual consistente.
- Labels associados aos campos de formulário.
- Mensagens de erro compreensíveis.
- Contraste adequado.
- Uso correto de elementos HTML semânticos.
- Feedback visual para ações do usuário.
- Não depender exclusivamente de cor para transmitir informação.
- Componentes e formulários acessíveis.
- Compatibilidade com tecnologias assistivas quando aplicável.

A acessibilidade será tratada como requisito do sistema e como parte da estratégia de testes.

## Análise de dados

Embora a análise de dados seja opcional segundo os requisitos técnicos, o SISD incluirá uma funcionalidade simples de análise como diferencial profissional.

O dashboard poderá apresentar:

- Quantidade de processos por status.
- Quantidade de processos por período.
- Valor estimado total dos processos.
- Processos aprovados, rejeitados e concluídos.
- Tempo médio de tramitação.
- Distribuição de processos por departamento.

O objetivo não é transformar o sistema em uma plataforma de Business Intelligence, mas demonstrar a utilização dos dados gerados pela aplicação para produzir informações úteis à tomada de decisão.

## Segurança

O sistema deverá implementar controles básicos de segurança compatíveis com o escopo do projeto:

- Autenticação.
- Autorização baseada em papéis.
- Validação de dados no backend.
- Proteção de operações sensíveis.
- Controle de acesso aos processos.
- Não confiar em informações de autorização enviadas pelo cliente.
- Não permitir alteração arbitrária do status de processos.
- Tratamento seguro de erros.
- Proteção das credenciais e informações sensíveis.

Regras de negócio importantes serão implementadas no backend e não dependerão exclusivamente da interface.

## Fluxo de estados do processo

```text
DRAFT
  │
  ▼
IN_ANALYSIS
  │
  ▼
AWAITING_APPROVAL
  │
  ├──────────────► REJECTED
  │
  ▼
APPROVED
  │
  ▼
COMPLETED
```

As transições serão controladas pelos serviços da aplicação.

O cliente não poderá simplesmente enviar:

```json
{
  "status": "APPROVED"
}
```

para alterar diretamente o estado de um processo.

A aprovação deverá ocorrer através da operação de domínio correspondente:

```http
POST /api/processes/:id/approve
```

## API

A aplicação disponibilizará uma API HTTP para comunicação entre a interface e o backend.

Exemplos:

```http
GET    /api/processes
POST   /api/processes

GET    /api/processes/:id
PATCH  /api/processes/:id

POST   /api/processes/:id/submit
POST   /api/processes/:id/quotations
POST   /api/processes/:id/supplier
POST   /api/processes/:id/documents
POST   /api/processes/:id/submit-for-approval
POST   /api/processes/:id/approve
POST   /api/processes/:id/reject
POST   /api/processes/:id/complete

GET    /api/processes/:id/history
```

As operações de negócio mais importantes serão representadas por endpoints explícitos, evitando que regras de workflow sejam reduzidas a simples alterações de campos.

## Modelo de dados

O sistema utilizará PostgreSQL como banco de dados relacional e Prisma como ORM.

Principais entidades:

```text
User
Department
Process
Supplier
Quotation
Document
Approval
AuditLog
```

O modelo representa:

- Usuários e seus papéis.
- Departamentos.
- Processos de dispensa.
- Fornecedores.
- Cotações.
- Documentos.
- Aprovações.
- Histórico de operações.

## Estratégia de testes

O projeto deverá aplicar uma estratégia formal de testes durante o desenvolvimento.

### Testes unitários

Validarão funções e regras isoladas, especialmente:

- Regras de negócio.
- Validações.
- Cálculos.
- Transições de estado.

### Testes de integração

Validarão a interação entre:

```text
API
 ↓
Services
 ↓
Prisma
 ↓
Database
```

### Testes de API

Verificarão:

- Status HTTP.
- Payloads.
- Autenticação.
- Autorização.
- Validação.
- Regras de negócio.

### Testes de fluxos

O fluxo principal será validado de ponta a ponta:

```text
Criação
 → Análise
 → Cotações
 → Fornecedor
 → Documentos
 → Aprovação
 → Conclusão
```

### Testes de acessibilidade

Serão realizados testes para verificar aspectos fundamentais da acessibilidade da interface.

## Controle de versão

O desenvolvimento será realizado utilizando Git.

O controle de versão permitirá:

- Registrar o histórico do desenvolvimento.
- Organizar funcionalidades em commits.
- Trabalhar de forma colaborativa.
- Recuperar versões anteriores.
- Documentar a evolução do projeto.

O repositório deverá conter também os documentos técnicos produzidos durante o projeto.

## Computação em nuvem

O projeto deverá utilizar recursos de computação em nuvem, atendendo ao requisito técnico da disciplina.

A arquitetura deverá permitir:

```text
Usuário
   ↓
Aplicação Web hospedada
   ↓
API
   ↓
Banco de dados hospedado
```

Os serviços específicos de hospedagem serão definidos durante a implementação, considerando disponibilidade, custo e adequação ao projeto acadêmico.

## Documentação do projeto

O repositório deverá manter documentação técnica organizada.

Documentos previstos:

```text
docs/
├── PHASE-1-DOMAIN.md
├── PHASE-2-REQUIREMENTS.md
└── API-ARCHITECTURE.md
```

Novos documentos poderão ser adicionados conforme o projeto evoluir.

A documentação deverá acompanhar a implementação para evitar divergência entre o sistema projetado e o sistema desenvolvido.

## Escopo e limitações

O SISD é um **projeto acadêmico com aplicação prática**, não um sistema governamental completo.

O projeto não pretende inicialmente contemplar:

- Todas as modalidades de contratação pública.
- Integrações completas com sistemas governamentais externos.
- Automação de todos os procedimentos jurídicos.
- Assinatura digital com validade jurídica real.
- Integrações bancárias.
- Grande escala de usuários.
- Infraestrutura de nível enterprise.
- Cobertura completa de todos os cenários possíveis da legislação.

Essas limitações são deliberadas para manter o projeto executável dentro do contexto do Projeto Integrador.

## Objetivo do desenvolvimento

O desenvolvimento será conduzido de forma incremental:

1. Estabelecer o domínio.
2. Definir requisitos.
3. Implementar o banco de dados.
4. Implementar a API.
5. Implementar a interface.
6. Implementar autenticação e autorização.
7. Implementar o fluxo principal.
8. Implementar acessibilidade.
9. Implementar testes.
10. Disponibilizar a aplicação em ambiente cloud.
11. Implementar indicadores básicos.
12. Consolidar documentação e evidências para a avaliação acadêmica.

## Critérios de sucesso

O projeto será considerado bem-sucedido quando conseguir demonstrar um fluxo funcional:

```text
Usuário autorizado
       ↓
Cria processo
       ↓
Registra informações
       ↓
Adiciona cotações
       ↓
Seleciona fornecedor
       ↓
Anexa documentos
       ↓
Envia para aprovação
       ↓
Aprovador analisa
       ↓
Aprova ou rejeita
       ↓
Processo é concluído
       ↓
Histórico permanece registrado
```

Além do fluxo funcional, o projeto deverá demonstrar:

- Uso de framework web.
- Persistência em banco de dados.
- Uso de JavaScript/TypeScript no desenvolvimento web.
- API.
- Recursos de cloud.
- Acessibilidade.
- Controle de versão.
- Testes formais.
- Análise de dados básica.

## Contexto acadêmico

Este projeto é desenvolvido no contexto do:

**Projeto Integrador em Computação II — UNIVESP**

O sistema busca combinar uma necessidade de aplicação real com os conhecimentos técnicos desenvolvidos ao longo do curso.

O objetivo não é apenas produzir uma aplicação funcional, mas demonstrar um processo completo de desenvolvimento de software envolvendo:

```text
Problema
   ↓
Levantamento de requisitos
   ↓
Modelagem
   ↓
Arquitetura
   ↓
Implementação
   ↓
Testes
   ↓
Deploy
   ↓
Avaliação
   ↓
Documentação
```

## Documentos relacionados

- `PHASE-1-DOMAIN.md` — definição do domínio e modelo conceitual.
- `PHASE-2-REQUIREMENTS.md` — requisitos funcionais, regras de negócio e critérios de aceitação.
- `API-ARCHITECTURE.md` — arquitetura e contrato da API.

## Status

**Em desenvolvimento — Planejamento / MVP**

O escopo e a arquitetura podem ser refinados conforme o desenvolvimento e as necessidades acadêmicas do Projeto Integrador.
