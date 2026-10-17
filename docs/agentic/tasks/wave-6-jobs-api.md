# Tarefa: `wave-6-jobs-api`

- Estado: done
- Onda: 6 — API, worker e retenção
- Responsável / ferramenta / papel: Cursor / implementação e validação
- Requisitos do escopo: §11, RF-04, sprint 5, ADR-006
- Dependências: [Onda 5](wave-5-python-video.md) em `done`
- Arquivos permitidos: `backend/`, testes de API, configuração `MOTIONCOACH_*`, `docs/api-contract.md`, `docs/privacy.md` se o TTL implementado divergir da partida, página de upload apenas no estado de progresso necessário para verificar o job. O cálculo continua em `motioncoach/`.
- Plano: [Onda 6](../../implementation-plan.md).

## Objetivo verificável

Um upload percorre fila, worker e resultado, com falha e cancelamento distinguíveis de sucesso.

## Contratos e decisões

Rotas da Onda 6 em [api-contract.md](../../api-contract.md). `POST /api/videos` responde 202 e não chama pose. Um worker, um job ativo, claim transacional. Progresso por etapa real. Identificador não sequencial. Diretório privado. Limpeza ignora job ativo. Crash vira `FAILED` com motivo de interrupção.

## Critérios de pronto

- [x] Arquivo disfarçado, excessivo e indekodificável é recusado.
- [x] Job válido termina `COMPLETED` com o contrato de sessão.
- [x] Cancelamento e processo morto não aparecem como sucesso.
- [x] Download e leitura não aceitam caminho arbitrário.
- [x] Exclusão antecipada remove o arquivo temporário.

## Validação planejada

Testes de API com clipe mínimo gerado no teste, sem vídeo de pessoa. Concorrência de claim. Reinício do worker.

## Fora desta tarefa

Player sincronizado, gráfico, exportação PNG e conta de usuário.

## Evidências e revisão

Verificação local em 2026-10-17, Fedora, Python 3.12.15, Node 24.21.0.

- `uv lock` acrescentou `python-multipart` 0.0.32 ao extra `api`.
- `pytest` completo: **167 passed**, 1 skipped (`test_pose` opt-in).
- `backend/tests/test_jobs.py`: upload rejeitado, job sintético `COMPLETED`
  com 1 repetição, artefato fora do catálogo 404, cancelamento de fila e de
  job em execução, claim concorrente com um vencedor, `WORKER_INTERRUPTED`,
  retenção que preserva job `QUEUED`.
- `npm test` da página de upload: formulário com arquivo obrigatório e sem
  status de resultado antes do envio. `npm run lint` aprovado depois do formato.
- Pose real no worker não foi executada. Os testes injetam landmarks da fixture.
- Limitações: identificador opaco não é autenticação; gráficos e CSV ficam na
  Onda 7; carga de CPU do worker não foi medida.
- Conclusão: critérios da Onda 6 verificados com vídeo sintético.
- Próxima ação: [Onda 7](wave-7-reports.md).
