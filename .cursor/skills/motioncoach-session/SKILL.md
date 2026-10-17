---
name: motioncoach-session
description: Inicia, retoma ou fecha uma onda de implementação do MotionCoach. Use when starting implementation, claiming a wave, resuming interrupted work, updating the workboard, or when the user says onda, wave, cartão, implementar, codar o MVP, or continue the plan.
---

# Sessão de implementação

## Antes de editar

1. Leia `AGENTS.md`, `docs/agentic/workboard.md` e o cartão da próxima onda em `docs/agentic/tasks/`.
2. Leia o ADR citado pelo cartão e a seção correspondente de `docs/implementation-plan.md`.
3. Confira `git status`. Preserve diff alheio. Não edite arquivo fora da lista permitida.
4. Marque o cartão e o workboard como `claimed`, com ferramenta e responsável, antes do código.

## Durante

- Uma onda por vez. Descoberta que mude contrato, ordem ou métrica vira ADR.
- Cartão grande demais para uma verificação vira cartões filhos via `docs/agentic/task-template.md`, ligados no workboard.
- Código, API, CLI e UI em inglês. Comentário de protocolo e docs em português.
- Não invente resultado de comando, FPS, MAE ou aprovação de câmera.

## Ao fechar

1. Rode os checks da área alterada. Anote comando, resultado e o que não rodou.
2. Preencha evidências no cartão. Só então mude o workboard para `done`.
3. Handoff em `docs/agentic/handoffs/` apenas se a retomada não for óbvia. Use `docs/agentic/handoff-template.md`.

## Bloqueio

Estado `blocked`, motivo e a próxima ação concreta. Não feche a onda com documentação no lugar de teste.
