# MotionCoach — orientação para agentes

## Estado e início de sessão

As Ondas 0–2 estão concluídas: fundação, cinemática e FSM dos quatro exercícios.
A próxima tarefa é a [Onda 3](docs/agentic/tasks/wave-3-webcam-pose.md). Estado:
[docs/agentic/workboard.md](docs/agentic/workboard.md).

1. Leia [o escopo](docs/project-scope.md), [a análise](docs/scope-analysis.md)
   e [o plano](docs/implementation-plan.md).
2. Leia [as decisões](docs/agentic/architecture-decisions.md) e o cartão da
   tarefa ativa em `docs/agentic/tasks/`.
3. Antes de código, reivindique uma tarefa delimitada e confira dependências.
   Divida cartão grande com `docs/agentic/task-template.md`.
4. Leia as regras em `.cursor/rules/` e a skill da área em `.cursor/skills/`.
5. Implemente, valide, registre evidência e atualize cartão e workboard.

## Postura

Engenharia sênior e pesquisa em visão: contratos explícitos, decisão
justificada, teste relevante e resultado reproduzível. Não invente FPS, MAE,
aprovação clínica nem execução de comando. Documentação em português. Código,
API, CLI e interface em inglês.

## Arquitetura e invariantes

- `shared/` é a especificação. TypeScript e Python executam a mesma configuração.
- O motor TypeScript vive em `frontend/features/exercise-engine`, fora do React.
- `motioncoach/` não importa FastAPI. Na Onda 0 só tem contratos. Algoritmo
  Python entra na Onda 5 e precisa passar nas fixtures antes do upload.
- `backend/` traduz HTTP e persiste jobs. O worker é outro processo.
- Webcam em modo VIDEO, uma pose, ângulo 2D. `null` quando faltar dado.
  `GOOD` / `LIMITED` / `INSUFFICIENT` qualificam a pose, não o exercício.
- Histerese, permanência mínima e ciclo mínimo. `UNCERTAIN` e pausa não
  completam repetição. Espelho não muda a contagem. Lado escolhido fica fixo.
- Frame de webcam não vai para a API. Voz não pede microfone. Upload é
  temporário. Texto não afirma segurança, lesão, carga nem postura correta.
- Métrica sem referência é `not_evaluated`. Seeds são `unvalidated_seed` até
  a Onda 8 as tratar como configuração de desenvolvimento, nunca como verdade
  biomecânica.
- CI leve não baixa modelo nem vídeo de pessoa.

## Fonte de verdade

Requisitos: escopo. Sequência e gates: plano. Decisões aceitas: ADRs.
Estado: workboard. Trabalho e evidência: cartão. Regras e skills especializam
esse conjunto e não mantêm um segundo plano. Conflito entre documentos pede
correção explícita.

Cursor e Codex usam este protocolo. Handoff só para trabalho interrompido,
bloqueado ou continuação não óbvia. Conferir `git status` antes de retomar.

## Validação

Os comandos reais estão no README; evidências no cartão da Onda 0. Não citar
comando futuro como executado. Toolchain: ADR-009 e versões no ADR-011:
Python 3.12 e uv; Node 24 e npm; Ruff e pytest; Biome, typecheck, Vitest e
build no frontend.

Feche uma onda só com critérios e evidências. Não antecipar MediaPipe, upload,
conta, modelo aprendido nem deploy ao concluir uma tarefa anterior.
