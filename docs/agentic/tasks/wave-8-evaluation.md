# Tarefa: `wave-8-evaluation`

- Estado: proposed
- Onda: 8 — Avaliação e experimentos
- Responsável / ferramenta / papel: não assumida
- Requisitos do escopo: §§16–19, sprint 7
- Dependências: [Onda 7](wave-7-reports.md) em `done`. Também depende de dados anotados e autorizados para fechar A–C.
- Arquivos permitidos: `research/`, `scripts/` de avaliação, `docs/evaluation.md`, `docs/datasets.md`, manifests e relatórios. Ajuste de seed somente em split de desenvolvimento, com a mudança registrada na configuração e justificada antes de olhar o teste.
- Plano: [Onda 8](../../implementation-plan.md).

## Objetivo verificável

Publicar A, B e C com medições reais, e D em sinal sintético, ou registrar bloqueio de dados sem preencher métrica.

## Contratos e decisões

Seguir [evaluation.md](../../evaluation.md) e [datasets.md](../../datasets.md). Tolerância de 500 ms permanece a do protocolo, salvo ADR anterior à medição de teste. Separar pose, contagem e feedback. Experimento E fica de fora.

## Critérios de pronto

- [ ] Licença e local dos clipes estão registrados; os binários não foram commitados.
- [ ] Split por pessoa/sessão foi congelado antes do ajuste.
- [ ] A, B e C têm comando, manifest, resultado por sessão, falha e limitação.
- [ ] D compara os filtros no sinal sintético sem chamar isso de acurácia humana.
- [ ] Ausência de ground truth permanece `not_evaluated`.

## Validação planejada

Reexecutar um relatório a partir do manifest. Conferir que o teste congelado não aparece no log de ajuste de threshold.

## Fora desta tarefa

LSTM/TCN/Transformer, coleta formal com participantes sem orientação ética, e texto de portfólio que cite número ainda não medido.

## Evidências e revisão

- Arquivos/diff/commit:
- Comandos executados e resultados:
- Testes não executados e motivo:
- Artefatos/manifests:
- Limitações e desvios:
- Conclusão da revisão:
- Próxima ação:
