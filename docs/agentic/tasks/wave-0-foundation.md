# Tarefa: `wave-0-foundation`

- Estado: done
- Onda: 0 — Fundação executável e contratos
- Responsável / ferramenta / papel: Codex / implementação e revisão sequenciais, em 2026-10-17
- Requisitos do escopo: §§8–13, sprint 1
- Dependências: documentação de planejamento. Nenhuma onda de software anterior.
- Arquivos permitidos: `pyproject.toml`, `uv.lock`, `.python-version`, `.gitignore`, `motioncoach/`, `backend/`, `frontend/`, `shared/schemas/`, `shared/fixtures/` de contrato, `.github/`, `.env.example`, `README.md`, `docs/architecture.md`, `docs/api-contract.md`, este cartão, workboard e ADR de implementação da toolchain. Atualização de estado em `AGENTS.md` e no plano faz parte do encerramento.
- Plano: [Onda 0](../../implementation-plan.md).

## Objetivo verificável

Monorepo instalável, com contratos testados, health e shell navegável, sem pose e sem upload.

## Contratos e decisões

Seguir [AGENTS.md](../../../AGENTS.md), [ADR-009](../architecture-decisions.md) e a seção 5 do plano. Antes do código, registrar versões resolvidas se divergirem da direção de toolchain. Modelos: `PoseFrame`, `SessionSummary`, eventos e schema de exercício. Health não carrega modelo. UI em inglês, tema escuro, rotas do escopo com dados mockados e os estados de tela nomeados.

Este cartão pode ser dividido. A onda fecha só com todas as entregas.

Execução dividida em entregas verificáveis, sem alterar a ordem das ondas:

- [0A — Contratos e API](wave-0a-contracts-api.md).
- [0B — Shell de interface](wave-0b-frontend-shell.md).
- [0C — Integração e validação](wave-0c-integration.md).

## Critérios de pronto

- [x] Pacote `motioncoach` importa contratos sem FastAPI, OpenCV ou MediaPipe.
- [x] Schemas rejeitam extra, NaN e enum inválido; exemplos do escopo passam.
- [x] `GET /api/health` responde liveness e o shell Next.js cobre as rotas.
- [x] Lockfiles, CI leve e README com comandos realmente executados.
- [x] Revisão registrada neste cartão e workboard em `done`.

## Validação planejada

Instalação limpa, Ruff, pytest, lint, typecheck, Vitest e build. Smoke HTTP do health. Conferir que o OpenAPI da Onda 0 não lista rota de vídeo.

Comandos exatos entram aqui depois de existirem. Não marcar execução antecipada.

## Fora desta tarefa

Câmera, MediaPipe, FSM, IndexedDB, upload, worker, gráficos de análise e experimento.

## Evidências e revisão

- Data: 2026-10-17. Responsável: Codex; implementação e revisão em etapas
  sequenciais, sem alteração de ondas posteriores.
- Arquivos: pacote `motioncoach/contracts`, health em `backend/app/main.py`,
  schema 1.0.0 e fixtures em `shared/`, shell Next.js em `frontend/`,
  lockfiles, CI, README e documentação vinculada. Diff local, sem commit.
- Ambiente: Linux x86_64; Python 3.12.15, uv 0.12.24, Node 24.21.0,
  npm 11.19.0. Versões resolvidas e decisões no ADR-011.

Comandos executados e resultados:

```bash
uv sync --extra api
uv run --locked ruff check .
uv run --locked ruff format --check .
uv run --locked python -m motioncoach.contracts.schema --check
uv run --locked pytest
npm --prefix frontend ci
npm --prefix frontend run contracts:check
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend test
npm --prefix frontend run build
```

Resultados finais: Ruff e Biome sem diagnósticos; igualdade estrutural do
schema Python e tipos TypeScript sem deriva; **54 testes Python** e
**60 testes Vitest** aprovados; build de produção concluído com as oito rotas.
Os testes consomem sete exemplos válidos e 39 mutações inválidas compartilhadas,
incluindo NaN/Infinity em memória, extras, enum, ângulo e configuração.

Instalações Python limpas, em diretórios temporários novos:

```bash
UV_PROJECT_ENVIRONMENT=/tmp/motioncoach-wave0-full uv sync --locked --extra api
UV_PROJECT_ENVIRONMENT=/tmp/motioncoach-wave0-full uv run --locked ruff check .
UV_PROJECT_ENVIRONMENT=/tmp/motioncoach-wave0-full uv run --locked ruff format --check .
UV_PROJECT_ENVIRONMENT=/tmp/motioncoach-wave0-full uv run --locked python -m motioncoach.contracts.schema --check
UV_PROJECT_ENVIRONMENT=/tmp/motioncoach-wave0-full uv run --locked pytest
UV_PROJECT_ENVIRONMENT=/tmp/motioncoach-wave0-core uv sync --locked --no-dev
/tmp/motioncoach-wave0-core/bin/python -I -c "import importlib.util; from motioncoach.contracts import PoseFrame, SessionSummary; assert all(importlib.util.find_spec(name) is None for name in ('fastapi', 'cv2', 'mediapipe')); print('Core imports without HTTP or vision dependencies')"
```

Ambiente completo passou nos checks e em 54 testes. O ambiente mínimo instalou
somente o núcleo e dependências Pydantic; importação isolada passou sem os
pacotes HTTP/visão instalados. `npm ci` reinstalou o frontend pelo lockfile.

Smoke local com processos reais:

```bash
uv run --locked uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
npm --prefix frontend start
npm --prefix frontend run test:smoke
npm --prefix frontend run dev -- --port 3001
```

- Health `200`, payload esperado; OpenAPI só `/api/health`;
  `POST /api/videos` → `404`.
- Oito rotas `200`, um h1, links de navegação e CSS servido com media queries.
  `/workout/live?exercise=jumping_jack` incluída no smoke.
- Servidor dev pronto; `GET /` na porta 3001 → `200`. Processo de dev encerrado
  depois da verificação. Build servido separadamente na porta 3000.
- `git diff --check`: aprovado. Revisão de imports confirma ausência de
  captura, fetch, IndexedDB ou persistência no código de produto do shell.

Falhas encontradas e corrigidas durante a implementação: suporte a validação
RFC3339 foi explicitado na dependência de teste; resolução de caminhos de
Vitest foi corrigida para diretórios com espaços; arquivo TypeScript gerado
foi excluído do formatter; smoke HTTP passou a aceitar a ordem real dos
atributos HTML. Checks finais acima refletem as correções.

Limitações de validação:

- Inspeção visual em navegador não executada: inventário CUA vazio e tentativa
  de abrir a aba retornou `Browser is not available: iab`. Vitest/jsdom e HTTP
  verificam renderização e interações, não comprovam layout visual real.
- Workflow GitHub Actions configurado; execução remota depende de publicar o
  diff. Os comandos correspondentes passaram localmente.
- Nenhum modelo, câmera, vídeo humano ou experimento foi executado. Fixture
  não é desempenho humano; métricas científicas permanecem `not_evaluated`.

Revisão: fronteiras domínio/HTTP/UI preservadas; contratos extras e não
finitos rejeitados; estados mockados identificados; nenhum comportamento das
Ondas 1–9 antecipado. Critérios determinísticos da fundação atendidos.

Próxima ação: assumir [Onda 1](wave-1-kinematics.md) em um novo diff.
