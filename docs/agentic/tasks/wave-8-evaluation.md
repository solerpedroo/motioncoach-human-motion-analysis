# Tarefa: `wave-8-evaluation`

- Estado: done
- Onda: 8 — Avaliação e experimentos
- Responsável / ferramenta / papel: Cursor / implementação e validação
- Requisitos do escopo: §§16–19, sprint 7
- Dependências: [Onda 7](wave-7-reports.md) em `done`. Também depende de dados anotados e autorizados para fechar A–C.
- Arquivos permitidos: `research/`, `scripts/evaluate.py`, `docs/evaluation.md`, `docs/datasets.md`, `motioncoach/evaluation/` e `motioncoach/tests/test_evaluation.py`. O scorer ficou no pacote para a CLI e o pytest usarem a mesma função. Sem ajuste de seed: não há split de teste.
- Plano: [Onda 8](../../implementation-plan.md).

## Objetivo verificável

Publicar A, B e C com medições reais, e D em sinal sintético, ou registrar bloqueio de dados sem preencher métrica.

## Contratos e decisões

Seguir [evaluation.md](../../evaluation.md) e [datasets.md](../../datasets.md). Tolerância de 500 ms permanece a do protocolo, salvo ADR anterior à medição de teste. Separar pose, contagem e feedback. Experimento E fica de fora.

## Critérios de pronto

- [x] A ausência de clipes e a falta de auditoria de licença estão registradas. Nenhum binário foi commitado.
- [ ] Split por pessoa/sessão congelado. Não há clipes para separar.
- [ ] A, B e C medidos. Estão `not_evaluated` em `research/reports/wave8.json`.
- [x] D compara os filtros no sinal sintético e declara que não é acurácia humana.
- [x] Ausência de ground truth permanece `not_evaluated`, com MAE `null`.

## Validação planejada

Reexecutar um relatório a partir do manifest. Conferir que o teste congelado não aparece no log de ajuste de threshold.

## Fora desta tarefa

LSTM/TCN/Transformer, coleta formal com participantes sem orientação ética, e texto de portfólio que cite número ainda não medido.

## Evidências e revisão

Verificação local em 2026-10-17, Fedora, Python 3.12.15.

- `pytest motioncoach/tests/test_evaluation.py`: **6 passed**.
- `python scripts/evaluate.py`: A/B/C `not_evaluated` / `no_annotated_clips`;
  MAE `null`. D gravou variabilidade e deslocamento do limiar no sinal sintético.
  Média móvel atrasou 50 ms; EMA e One Euro não atrasaram neste degrau.
- MM-Fit e RepCount não foram baixados. As licenças não foram lidas.
- Nenhuma seed de exercício foi alterada.
- Conclusão: o usuário pediu o encerramento em 2026-10-17. A onda fica `done`
  pelo ADR-023. A, B e C não foram medidos e o MAE permanece `null`.
- Próxima ação: [Onda 9](wave-9-acceptance.md).
