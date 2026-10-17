# Tarefa: `wave-0a-contracts-api`

- Estado: done
- Onda: 0
- Responsável / ferramenta / papel: Codex / implementação e revisão, 2026-10-17
- Requisitos: §§10–12; plano, Onda 0; ADR-003, 004 e 009.
- Dependências: planejamento lido; árvore Git inicialmente limpa.
- Arquivos permitidos: `pyproject.toml`, `uv.lock`, `.python-version`, `motioncoach/`, `backend/`, `shared/schemas/`, `shared/fixtures/` de contratos; este cartão.

## Objetivo verificável

Contratos versionados compartilhados, pacote puro instalável e health sem pose.
JSON Schema é normativo. Python rejeita extras, tipos coercivos e números não
finitos. Nenhum algoritmo ou seed de exercício nesta entrega.

## Implementação e critérios de pronto

- [x] Contratos e fixtures válidas/inválidas com verificação de deriva.
- [x] Health testado; OpenAPI sem vídeo.
- [x] Importação sem dependências HTTP ou de visão.

## Validação planejada

Instalação com uv; Ruff; pytest de contratos e HTTP; importação isolada.

## Fora desta tarefa

Geometria, FSM, modelo, câmera, upload e worker.

## Evidências e revisão

- Pacote, schema normativo 1.0.0 e fixtures implementados; 54 testes Python
  aprovados. Verificação estrutural do schema aprovada.
- `uv run --locked ruff check .`, `uv run --locked ruff format --check .`,
  `uv run --locked python -m motioncoach.contracts.schema --check` e
  `uv run --locked pytest`: aprovados.
- Instalação limpa completa e núcleo sem extras confirmadas. `python -I`
  importa contratos sem FastAPI, OpenCV ou MediaPipe instalados.
- Health `200` e OpenAPI somente com liveness; vídeo retorna `404`.
- Revisão: domínio não importa backend. Nenhum algoritmo ou modelo.
- Comandos completos e ambiente no [cartão pai](wave-0-foundation.md).
- Próxima ação: integração 0C; concluída nesta onda.
