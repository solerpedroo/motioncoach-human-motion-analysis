# Contrato HTTP

Estado: especificado em 2026-10-17. Nenhuma rota está implementada. A Onda 0
pode publicar só `GET /api/health`. As demais esperam a onda indicada.

Não criar endpoint que receba frames de webcam.

## Rotas

| Método | Caminho | Onda | Função |
| --- | --- | --- | --- |
| `GET` | `/api/health` | 0 | Liveness do processo HTTP. Não afirma modelo carregado nem worker vivo. |
| `GET` | `/api/exercises` | 6 | Exercícios e versão das regras publicadas. |
| `POST` | `/api/videos` | 6 | Upload validado e criação do job. Resposta `202`. |
| `GET` | `/api/jobs/{job_id}` | 6 | Estado e progresso por etapa real. |
| `DELETE` | `/api/jobs/{job_id}` | 6 | Cancelamento ou exclusão quando o estado permitir. |
| `GET` | `/api/analyses/{id}` | 6 | Resumo estruturado. |
| `GET` | `/api/analyses/{id}/events` | 6 | Timeline. |
| `GET` | `/api/analyses/{id}/export` | 7 | `format=json` ou `format=csv`. |

## Job

`UPLOADED` → `QUEUED` → `PROCESSING` → `COMPLETED` ou `FAILED` / `CANCELLED`.

Progresso nomeia etapas reais: validação, probe, pose, análise e publicação.
Falha de decode, pose ou análise termina em `FAILED` com causa compreensível.
Falha exclusiva de um derivado visual, se o núcleo já tiver publicado os
números, segue a política de artefato parcial definida na Onda 7 e não esconde
o aviso.

Cancelamento de job em processamento é observado no próximo frame. Crash do
worker marca `FAILED` com motivo de interrupção. Novo processamento usa outro id.

## Erros

Resposta de erro traz código estável e mensagem curta. Sem stack trace. Upload
recusa extensão disfarçada, MIME incompatível, duração ou tamanho acima do
limite e arquivo que não decodifica.

## Modelos

Pydantic v2, versão de schema no payload, campos extras rejeitados. O cliente
TypeScript consome os mesmos exemplos de `shared/fixtures` usados nos testes
da API.
