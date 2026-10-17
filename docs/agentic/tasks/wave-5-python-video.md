# Tarefa: `wave-5-python-video`

- Estado: done
- Onda: 5 — Vídeo e pose Python com paridade
- Responsável / ferramenta / papel: Codex + Cursor / implementação e validação
- Requisitos do escopo: §§9.4, 9.5, parte do RF-04
- Dependências: [Onda 4](wave-4-live-session.md) em `done`
- Arquivos permitidos: conforme plano e subtarefas 5A–5C
- Plano: [Onda 5](../../implementation-plan.md).

## Reivindicação

Subtarefas [5A](wave-5a-python-engine.md), [5B](wave-5b-video-pose.md) e
[5C](wave-5c-pipeline-cli.md) concluídas. Inspeção física da Onda 3 permanece
pendente (ADR-015); não é evidência desta onda.

## Objetivo verificável

O pacote Python reproduz as fixtures do TypeScript e analisa um arquivo local pela CLI.

## Critérios de pronto

- [x] Fixtures de cinemática e de repetição passam nos dois runtimes.
- [x] Tolerância de paridade em `docs/evaluation.md` e ADR-018; runner falha no primeiro desvio.
- [x] Arquivo inválido, limite e decode falham com AnalysisError estável (test_video/test_pipeline).
- [x] CLI `probe` e `analyze` usam `motioncoach.pipeline.analysis.analyze`.
- [x] Smoke com modelo real permanece opt-in (`test_pose.py -m pose`); não executado nesta sessão.

## Evidências e revisão

Verificação local em 2026-10-17, Fedora, Python 3.12.15, Node 24.21.0, npm 11.19.0.

Comandos principais:

- `uv sync --locked --extra api --extra video`
- `ruff check .` e `ruff format --check motioncoach backend`
- `python -m motioncoach.contracts.schema --check`
- `pytest` → 160 passed, 1 skipped (`test_pose` opt-in)
- `npm --prefix frontend run test:parity` → PASS (delta máx. 2.84e-14)
- `npm --prefix frontend test` → 282 passed; `npm run build` OK

Artefatos: `shared/models/pose-landmarker-lite.json`, `motioncoach/cli.py`,
`frontend/scripts/parity-check.mjs`, saída CLI `analysis.json` / `frames.jsonl`
(documentada em `motioncoach/README.md`).

Limitações: seeds não calibradas; sem vídeo de pessoa na CI; smoke MediaPipe
real não rodado aqui; upload HTTP continua na Onda 6.

Conclusão: critérios executáveis da Onda 5 verificados localmente.

Próxima ação: [Onda 6 — API, worker e retenção](wave-6-jobs-api.md).
