# Tarefa: `wave-7-reports`

- Estado: done
- Onda: 7 — Timeline, relatórios e exportação
- Responsável / ferramenta / papel: Cursor / implementação e validação
- Requisitos do escopo: RF-09, RF-10, sprint 6
- Dependências: [Onda 6](wave-6-jobs-api.md) em `done`
- Arquivos permitidos: `frontend/app/workout/upload/`, `frontend/app/sessions/`, `frontend/components/charts/`, `frontend/components/reports/`, `frontend/features/upload/`, exportação no backend, testes de reconciliação, `docs/api-contract.md`.
- Plano: [Onda 7](../../implementation-plan.md).

## Objetivo verificável

O usuário abre uma análise, salta para uma repetição e exporta JSON e CSV sem frames brutos.

## Contratos e decisões

A interface lê artefatos do job. Gráfico usa o tempo da mídia. Recharts fica na visão de relatório, fora do callback de inferência ao vivo. PNG é derivado. Se o PNG falhar e o JSON estiver íntegro, o job mostra o aviso e mantém os números. Exportação padrão omite imagem.

## Critérios de pronto

- [x] Timeline e player usam o mesmo timestamp do evento.
- [x] Repetições completas e incompletas batem com o resumo.
- [x] JSON e CSV abrem sem coluna de frame bruto.
- [x] Estado vazio, falho e cancelado tem mensagem e ação.
- [x] Suíte de paridade da Onda 5 continua verde.

## Validação planejada

Clipe curto de teste, clique na repetição, comparação de totais e inspeção do arquivo exportado. Verificação visual do gráfico no navegador.

## Fora desta tarefa

Experimento científico, PDF e consistency score.

## Evidências e revisão

Verificação local em 2026-10-17, Fedora, Python 3.12.15, Node 24.21.0.

- `pytest`: **168 passed**, 1 skipped (`test_pose` opt-in).
- Export JSON/CSV do job sintético: cabeçalho sem landmark ou frame; quantidade
  de `REP_COMPLETED` igual ao resumo. PNG publicado começa com a assinatura PNG.
- Falha injetada do gráfico: job permanece `COMPLETED`, `chart_warning` é
  `CHART_RENDER_FAILED` e o resumo continua legível.
- `npm test`: **286 passed**, incluindo o clique que define `currentTime` em
  1.2 s para o evento de 1200 ms. `npm run typecheck` aprovado.
- `npm run test:parity`: PASS, delta máximo 2.84e-14.
- Não abri um vídeo real no navegador. O salto do player foi verificado no
  jsdom, não numa sessão visual.
- Conclusão: critérios da Onda 7 verificados com vídeo sintético.
- Próxima ação: [Onda 8](wave-8-evaluation.md).
