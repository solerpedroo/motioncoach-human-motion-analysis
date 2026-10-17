# Contrato HTTP

Estado em 2026-10-17: health e as rotas de job da Onda 6 estão implementadas.
`GET /api/analyses/{id}/export` continua na Onda 7.

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


## Jobs implementados

`POST /api/videos` recebe `multipart/form-data` com `file`, `exercise`,
`camera_view` e, na rosca, `selected_side`. A resposta `202` traz o job em
`QUEUED` depois da validação e do probe. Pose não roda nesse processo.

`GET /api/jobs/{job_id}` devolve `status` e `stage`
(`probe`, `pose`, `analysis`, `publication`).
`DELETE /api/jobs/{job_id}` cancela um job na fila, pede cancelamento de um
job em processamento ou apaga os arquivos de um job já terminado.
`GET /api/jobs/{job_id}/artifacts/{name}` só aceita `analysis.json` e
`frames.jsonl` de um job `COMPLETED`.

Erros usam `{"error": {"code", "message"}}` sem stack trace. Códigos desta
onda incluem `UNSUPPORTED_EXTENSION`, `FILE_TOO_LARGE`, `INVALID_VIDEO`,
`QUEUE_FULL`, `JOB_NOT_FOUND`, `ANALYSIS_NOT_READY` e `WORKER_INTERRUPTED`.

O worker é outro processo: `uv run --locked python -m backend.app.worker`.
Variáveis: `MOTIONCOACH_DATA_DIR`, `MOTIONCOACH_MAX_BYTES`,
`MOTIONCOACH_MAX_DURATION_MS`, `MOTIONCOACH_TTL_HOURS`,
`MOTIONCOACH_STALE_SECONDS`, `MOTIONCOACH_MAX_ACTIVE_JOBS`,
`MOTIONCOACH_MODEL_PATH`, `MOTIONCOACH_CORS_ORIGINS`.

## Health implementado

`GET /api/health` → `200 application/json`:

```json
{"schema_version":"1.0.0","status":"ok","service":"motioncoach-api","version":"0.1.0"}
```

Health não depende de modelo, worker ou banco. CORS local libera o frontend
em `127.0.0.1:3000` e `localhost:3000`. A forma de health continua separada
do catálogo `shared/schemas/contracts.schema.json`.
