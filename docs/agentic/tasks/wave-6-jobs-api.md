# Tarefa: `wave-6-jobs-api`

- Estado: proposed
- Onda: 6 — API, worker e retenção
- Responsável / ferramenta / papel: não assumida
- Requisitos do escopo: §11, RF-04, sprint 5, ADR-006
- Dependências: [Onda 5](wave-5-python-video.md) em `done`
- Arquivos permitidos: `backend/`, testes de API, configuração `MOTIONCOACH_*`, `docs/api-contract.md`, `docs/privacy.md` se o TTL implementado divergir da partida, página de upload apenas no estado de progresso necessário para verificar o job. O cálculo continua em `motioncoach/`.
- Plano: [Onda 6](../../implementation-plan.md).

## Objetivo verificável

Um upload percorre fila, worker e resultado, com falha e cancelamento distinguíveis de sucesso.

## Contratos e decisões

Rotas da Onda 6 em [api-contract.md](../../api-contract.md). `POST /api/videos` responde 202 e não chama pose. Um worker, um job ativo, claim transacional. Progresso por etapa real. Identificador não sequencial. Diretório privado. Limpeza ignora job ativo. Crash vira `FAILED` com motivo de interrupção.

## Critérios de pronto

- [ ] Arquivo disfarçado, excessivo e indekodificável é recusado.
- [ ] Job válido termina `COMPLETED` com o contrato de sessão.
- [ ] Cancelamento e processo morto não aparecem como sucesso.
- [ ] Download e leitura não aceitam caminho arbitrário.
- [ ] Exclusão antecipada remove o arquivo temporário.

## Validação planejada

Testes de API com clipe mínimo gerado no teste, sem vídeo de pessoa. Concorrência de claim. Reinício do worker.

## Fora desta tarefa

Player sincronizado, gráfico, exportação PNG e conta de usuário.

## Evidências e revisão

- Arquivos/diff/commit:
- Comandos executados e resultados:
- Testes não executados e motivo:
- Artefatos/manifests:
- Limitações e desvios:
- Conclusão da revisão:
- Próxima ação:
