# Tarefa: `wave-1-kinematics`

- Estado: proposed
- Onda: 1 — Geometria, tempo e quality gate
- Responsável / ferramenta / papel: não assumida
- Requisitos do escopo: §§7.2, 7.3, 7.5
- Dependências: [Onda 0](wave-0-foundation.md) em `done`
- Arquivos permitidos: `frontend/features/exercise-engine/`, `frontend/tests/` do motor, `shared/fixtures/` cinemáticas, `shared/exercise-configs/` dos parâmetros comuns, docs de especificação se a implementação revelar ambiguidade. Cartão, workboard e ADR se a política de filtro mudar.
- Plano: [Onda 1](../../implementation-plan.md).

## Objetivo verificável

Ângulo, EMA e quality gate determinísticos, cobertos por fixtures compartilhadas.

## Contratos e decisões

Implementar a fórmula e as regras de `null` de [exercise-spec.md](../../exercise-spec.md). Relógio e amostras entram por argumento. EMA é o filtro padrão. Não portar o algoritmo para Python nesta onda. Não calcular dentro de componente visual.

## Critérios de pronto

- [ ] 90°, 180° e vetor nulo têm resultado estável.
- [ ] Baixa visibilidade e salto produzem `null` ou bloqueio de amostra, conforme a spec.
- [ ] Lacuna longa não é interpolada; lacuna curta marcada não completa métrica sozinha.
- [ ] Seeds comuns estão no JSON compartilhado com status `unvalidated_seed`.
- [ ] Vitest registrado e revisão concluída.

## Validação planejada

Casos numéricos escritos à mão, timestamps fora de ordem, duplicados e gaps. Sem modelo e sem câmera.

## Fora desta tarefa

FSM dos exercícios, MediaPipe, gráficos e feedback textual.

## Evidências e revisão

- Arquivos/diff/commit:
- Comandos executados e resultados:
- Testes não executados e motivo:
- Artefatos/manifests:
- Limitações e desvios:
- Conclusão da revisão:
- Próxima ação:
