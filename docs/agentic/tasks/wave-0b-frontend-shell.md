# Tarefa: `wave-0b-frontend-shell`

- Estado: done
- Onda: 0
- Responsável / ferramenta / papel: Codex / implementação e revisão
- Requisitos: §§8–10; plano, Onda 0; ADR-009.
- Dependências: 0A define contratos antes de gerar tipos TypeScript.
- Arquivos permitidos: `frontend/`; este cartão.

## Objetivo verificável

Shell Next.js com oito rotas, tokens escuros, catálogo inglês e estados
demonstrativos acessíveis. Dados simulados são identificados; nenhuma medição
é apresentada como real. Tipos e validação consomem o schema compartilhado.

## Implementação e critérios de pronto

- [x] Rotas, navegação, quatro exercícios e estados nomeados.
- [x] Layout responsivo e nenhuma captura, upload ou persistência.
- [x] Biome, typecheck, Vitest e build aprovados.

## Validação planejada

Contratos com Ajv; componentes e navegação com Vitest; smoke das rotas.

## Fora desta tarefa

Webcam, inferência, FSM, IndexedDB e gráficos de análise.

## Evidências e revisão

- Oito rotas do escopo implementadas; quatro exercícios e 14 estados
  demonstrativos. Mensagens em inglês, tokens escuros e media queries.
- `npm --prefix frontend ci`, `contracts:check`, `lint`, `typecheck`,
  `test` e `build`: aprovados; **60 testes Vitest**, incluindo a matriz
  compartilhada de contratos, navegação, estados e ausência de captura.
- `npm --prefix frontend run test:smoke`: oito rotas `200`, links e stylesheet
  presentes; servidor de desenvolvimento também respondeu `200`.
- Inspeção visual não executada: nenhum navegador disponível via CUA.
  Responsividade foi implementada em CSS, sem aprovação visual simulada.
- Revisão React: hooks no topo, estado local mínimo, páginas no servidor,
  seletores rotulados, foco de teclado e estados textuais. Sem chamadas de
  câmera, upload ou armazenamento. Botão local com padrão shadcn/ui.
- `agentRules: false` evita geração automática de um segundo AGENTS pelo Next;
  documentação da versão instalada consultada e decisão registrada no ADR-011.
- Comandos completos e ambiente no [cartão pai](wave-0-foundation.md).
- Próxima ação: integração 0C; concluída nesta onda.
