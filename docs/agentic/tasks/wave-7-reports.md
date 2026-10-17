# Tarefa: `wave-7-reports`

- Estado: proposed
- Onda: 7 — Timeline, relatórios e exportação
- Responsável / ferramenta / papel: não assumida
- Requisitos do escopo: RF-09, RF-10, sprint 6
- Dependências: [Onda 6](wave-6-jobs-api.md) em `done`
- Arquivos permitidos: `frontend/app/workout/upload/`, `frontend/app/sessions/`, `frontend/components/charts/`, `frontend/components/reports/`, `frontend/features/upload/`, exportação no backend, testes de reconciliação, `docs/api-contract.md`.
- Plano: [Onda 7](../../implementation-plan.md).

## Objetivo verificável

O usuário abre uma análise, salta para uma repetição e exporta JSON e CSV sem frames brutos.

## Contratos e decisões

A interface lê artefatos do job. Gráfico usa o tempo da mídia. Recharts fica na visão de relatório, fora do callback de inferência ao vivo. PNG é derivado. Se o PNG falhar e o JSON estiver íntegro, o job mostra o aviso e mantém os números. Exportação padrão omite imagem.

## Critérios de pronto

- [ ] Timeline e player usam o mesmo timestamp do evento.
- [ ] Repetições completas e incompletas batem com o resumo.
- [ ] JSON e CSV abrem sem coluna de frame bruto.
- [ ] Estado vazio, falho e cancelado tem mensagem e ação.
- [ ] Suíte de paridade da Onda 5 continua verde.

## Validação planejada

Clipe curto de teste, clique na repetição, comparação de totais e inspeção do arquivo exportado. Verificação visual do gráfico no navegador.

## Fora desta tarefa

Experimento científico, PDF e consistency score.

## Evidências e revisão

- Arquivos/diff/commit:
- Comandos executados e resultados:
- Testes não executados e motivo:
- Artefatos/manifests:
- Limitações e desvios:
- Conclusão da revisão:
- Próxima ação:
