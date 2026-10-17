# Tarefa: `wave-1-kinematics`

- Estado: done
- Onda: 1 — Geometria, tempo e quality gate
- Responsável / ferramenta / papel: Codex / implementação e revisão sequenciais, 2026-10-17
- Requisitos do escopo: §§7.2, 7.3, 7.5
- Dependências: [Onda 0](wave-0-foundation.md) em `done`
- Arquivos permitidos: `frontend/features/exercise-engine/`, `frontend/tests/` do motor, `shared/fixtures/` cinemáticas, `shared/exercise-configs/` dos parâmetros comuns, docs de especificação se a implementação revelar ambiguidade. Cartão, workboard e ADR se a política de filtro mudar. Atualizações de estado em `AGENTS.md`, plano, README e arquitetura no encerramento, para refletir o motor agora existente.
- Plano: [Onda 1](../../implementation-plan.md).

## Objetivo verificável

Ângulo, EMA e quality gate determinísticos, cobertos por fixtures compartilhadas.

## Contratos e decisões

Implementar a fórmula e as regras de `null` de [exercise-spec.md](../../exercise-spec.md). Relógio e amostras entram por argumento. EMA é o filtro padrão. Não portar o algoritmo para Python nesta onda. Não calcular dentro de componente visual. O ADR-012 fixa retenção curta, distância do salto e recuperação; detalhes operacionais adicionados à especificação.

## Critérios de pronto

- [x] 90°, 180° e vetor nulo têm resultado estável.
- [x] Baixa visibilidade e salto produzem `null` ou bloqueio de amostra, conforme a spec.
- [x] Lacuna longa não é interpolada; lacuna curta marcada não completa métrica sozinha.
- [x] Seeds comuns estão no JSON compartilhado com status `unvalidated_seed`.
- [x] Vitest registrado e revisão concluída.

## Validação planejada

Casos numéricos escritos à mão, timestamps fora de ordem, duplicados e gaps. Sem modelo e sem câmera.

## Fora desta tarefa

FSM dos exercícios, MediaPipe, gráficos e feedback textual.

## Evidências e revisão

- Data: 2026-10-17. Responsável: Codex; implementação e revisão sequenciais.
- Dependência: Onda 0 em `done`; árvore inicialmente limpa, base `c1eef49`.
  Alterações desta onda permanecem locais, sem novo commit.
- Implementação: `frontend/features/exercise-engine/geometry.ts`, `ema.ts`,
  `quality.ts`, `kinematics.ts` e `types.ts`. Sem importação de React, DOM,
  FastAPI, modelo de pose ou relógio global. A integração usa relógio injetado
  ou timestamp explícito e retorna flags de continuidade para a futura FSM.
- Configuração: `shared/exercise-configs/common.json` 0.1.0, marcada
  `unvalidated_seed`; schema comum reutiliza definições normativas 1.0.0.
- Fixtures: `shared/fixtures/kinematics/{geometry,ema,quality,pipeline}.json`.
  Oito geometrias, três sequências EMA, treze casos de qualidade e três
  sequências integradas. Oráculos escritos a partir da fórmula, sem executar
  o algoritmo para produzir expectativas. Casos NaN/Infinity só em memória.
- Decisão: ADR-012; contrato operacional e limites documentados na spec e no
  README do motor. Sem alteração de payload de domínio ou de dependência.

Comandos executados:

```bash
npm --prefix frontend test -- tests/kinematics.test.ts
npm --prefix frontend run format
npm --prefix frontend run contracts:check
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend test
npm --prefix frontend run build
uv run --locked python -m motioncoach.contracts.schema --check
git diff --check
```

Resultados finais:

- Vitest: **120 testes aprovados em três arquivos**, incluindo **60 novos
  testes cinemáticos** e os 60 testes da fundação.
- Biome: sem diagnósticos; typecheck aprovado; build Next.js 16.4.2 concluído,
  com as oito rotas já existentes.
- Tipos TypeScript e adaptador Python continuam de acordo com o JSON Schema
  normativo; check de diff sem problemas de whitespace.
- Testes cobrem 0/45/90/180°, vetores nulos e extremos numéricos, espelho,
  dado ausente/não finito, limite de visibilidade e de salto, duplicação de
  índice, opcional ausente, EMA conhecida, retenção sinalizada que não autoriza
  transição, expiração sem renovar prazo, gaps e timestamps rejeitados sem
  contaminar o histórico. Integração cobre recuperação após perda/salto,
  geometria degenerada, clock inválido e mutação das entradas pelo chamador.

A revisão encontrou uma anotação de type guard que fazia o TypeScript tratar
um landmark definido porém de baixa qualidade como `never`; o predicado foi
corrigido para booleano, preservando a distinção entre formato e qualidade.
O typecheck final acima passou após essa correção. A revisão também garantiu
que um clock inválido retorne timestamp `null`, e que uma observação opcional
com geometria degenerada limite a qualidade sem suprimir a métrica necessária.

Testes não executados e limites:

- Suíte Python completa não repetida: pacote e API não foram alterados;
  o check estrutural do adaptador foi executado. Port de algoritmo só na Onda 5.
- Sem navegador/câmera/modelo, vídeo humano, paridade Python ou benchmark.
  Esta onda testa um módulo puro em Node. Métricas humanas continuam
  `not_evaluated`, e as seeds continuam sem validação biomecânica.
- GitHub Actions não executado remotamente; os comandos frontend da CI foram
  executados localmente. Nenhuma nova dependência exigiu reinstalação.
- `can_transition` autoriza usar a amostra, não completar uma repetição.
  A Onda 2 deve invalidar o ciclo em `continuity_broken` e provar a readquisição
  do estado inicial, incluindo pausa e lado fixo.

Conclusão da revisão: critérios da Onda 1 atendidos; regra fora da UI,
configuração compartilhada e fixtures reproduzíveis. Sem início da FSM.
Próxima ação: assumir [Onda 2](wave-2-exercise-fsms.md) em novo diff.
