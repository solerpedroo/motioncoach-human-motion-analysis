# Contrato HTTP

Estado em 2026-10-17: `GET /api/health` implementado na Onda 0.
As demais rotas continuam especificadas e esperam a onda indicada.

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


## Health implementado

`GET /api/health` → `200 application/json`:

```json
{"schema_version":"1.0.0","status":"ok","service":"motioncoach-api","version":"0.1.0"}
```

Sem dependência de modelo, worker, filesystem de vídeo ou banco. O teste
confere que `/openapi.json` só contém esse caminho e que `POST /api/videos`
responde 404. A UI desta onda ainda não faz requests para a API; CORS não é
necessário. A forma de health é um contrato HTTP local, separado do catálogo
de domínio `shared/schemas/contracts.schema.json`.
