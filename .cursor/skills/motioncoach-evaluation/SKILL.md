---
name: motioncoach-evaluation
description: Mede contagem, cobertura e experimentos do MotionCoach sem inventar métricas. Use when designing evaluation, MAE, repetition F1, dataset splits, experiment reports, or when the user mentions acurácia, benchmark, IC, or annotated videos.
---

# Avaliação

## Fonte

`docs/evaluation.md` e `docs/datasets.md`. ADR-008. Cartão da Onda 8.

## O que publicar

- Contagem só com anotação de repetições. Pareamento um a um, tolerância 500 ms, congelada antes de ajustar seed no teste.
- Erro temporal só com início e fim anotados.
- Feedback com precisão só depois de um protocolo de revisão. Até lá, `not_evaluated`.
- Desempenho com relógio local, warm-up fora da estatística e a máquina identificada.
- Denominador vazio vira taxa `null` mais contagens absolutas.

Pose, contagem e feedback ficam em tabelas separadas. Fixture sintética não entra como MAE humano.

## Experimentos

A, B e C exigem clipe anotado e licença registrada. Os binários ficam fora do Git. D compara filtros em sinal sintético. E está fora do MVP.

Sem dataset, o cartão fica `blocked` com a aquisição que falta. Não preencher a tabela para desbloquear a Onda 9. O README só cita número cujo manifest está no repositório de resultados.
