---
name: motioncoach-upload-jobs
description: Implementa upload de vídeo, fila SQLite, worker e retenção do MotionCoach. Use when editing the analysis API, job queue, video worker, file retention, FastAPI upload routes, or backend job lifecycle.
---

# Upload e jobs

## Fonte

`docs/api-contract.md`, ADR-006, `docs/privacy.md`, Ondas 5–7 do plano.

A Onda 5 entrega CLI e paridade sem HTTP. A Onda 6 liga a fila. A Onda 7 lê os artefatos na interface.

## Implementação

- Worker em processo separado importa `motioncoach.pipeline`. A rota não roda pose.
- `POST /api/videos` responde 202.
- Estados: `UPLOADED`, `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`.
- Claim transacional, um job ativo, heartbeat e progresso por etapa real.
- Nome opaco, diretório privado, download por catálogo de nomes.
- Escrita temporária e rename. Decoder fechado em erro e cancelamento.
- Crash → `FAILED` com interrupção. Reprocessar cria outro id.
- Limpeza não remove job ativo. TTL configurável; partida de 24 horas só vale depois de implementada e testada.
- Rejeitar arquivo disfarçado, limite excedido e decode impossível antes da inferência.

## Verificação

Teste de API com clipe gerado no teste, sem vídeo de pessoa. Incluir claim concorrente, cancelamento, worker morto e tentativa de path traversal. Falha de núcleo não pode aparecer como `COMPLETED`.
