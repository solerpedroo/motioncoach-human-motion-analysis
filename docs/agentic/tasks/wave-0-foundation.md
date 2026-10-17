# Tarefa: `wave-0-foundation`

- Estado: proposed
- Onda: 0 — Fundação executável e contratos
- Responsável / ferramenta / papel: não assumida
- Requisitos do escopo: §§8–13, sprint 1
- Dependências: documentação de planejamento. Nenhuma onda de software anterior.
- Arquivos permitidos: `pyproject.toml`, `uv.lock`, `.python-version`, `.gitignore`, `motioncoach/`, `backend/`, `frontend/`, `shared/schemas/`, `shared/fixtures/` de contrato, `.github/`, `.env.example`, `README.md`, `docs/architecture.md`, `docs/api-contract.md`, este cartão, workboard e ADR de implementação da toolchain. Atualização de estado em `AGENTS.md` e no plano faz parte do encerramento.
- Plano: [Onda 0](../../implementation-plan.md).

## Objetivo verificável

Monorepo instalável, com contratos testados, health e shell navegável, sem pose e sem upload.

## Contratos e decisões

Seguir [AGENTS.md](../../../AGENTS.md), [ADR-009](../architecture-decisions.md) e a seção 5 do plano. Antes do código, registrar versões resolvidas se divergirem da direção de toolchain. Modelos: `PoseFrame`, `SessionSummary`, eventos e schema de exercício. Health não carrega modelo. UI em inglês, tema escuro, rotas do escopo com dados mockados e os estados de tela nomeados.

Este cartão pode ser dividido. A onda fecha só com todas as entregas.

## Critérios de pronto

- [ ] Pacote `motioncoach` importa contratos sem FastAPI, OpenCV ou MediaPipe.
- [ ] Schemas rejeitam extra, NaN e enum inválido; exemplos do escopo passam.
- [ ] `GET /api/health` responde liveness e o shell Next.js cobre as rotas.
- [ ] Lockfiles, CI leve e README com comandos realmente executados.
- [ ] Revisão registrada neste cartão e workboard em `done`.

## Validação planejada

Instalação limpa, Ruff, pytest, lint, typecheck, Vitest e build. Smoke HTTP do health. Conferir que o OpenAPI da Onda 0 não lista rota de vídeo.

Comandos exatos entram aqui depois de existirem. Não marcar execução antecipada.

## Fora desta tarefa

Câmera, MediaPipe, FSM, IndexedDB, upload, worker, gráficos de análise e experimento.

## Evidências e revisão

- Arquivos/diff/commit:
- Comandos executados e resultados:
- Testes não executados e motivo:
- Artefatos/manifests:
- Limitações e desvios:
- Conclusão da revisão:
- Próxima ação: assumir a Onda 1 somente depois do fechamento.
