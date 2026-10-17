# MotionCoach

Assistente educacional de observação de movimento por webcam e vídeo.
O MVP prevê agachamento, flexão, rosca bíceps e polichinelo, com contagem
explicável, ângulos 2D e feedback condicionado à visibilidade.

A **Onda 0** entrega a fundação: contratos compartilhados, API de liveness e
shell navegável. A interface está em inglês, em tema escuro, com estados
explicitamente demonstrativos. Câmera, modelo de pose, contagem, upload,
relatórios medidos e histórico serão implementados nas ondas seguintes.

## Executar localmente

Requisitos: **Python 3.12.15**, **uv 0.12.24**, **Node 24.21.0** e npm 11.
As versões de dependências estão em `uv.lock` e
`frontend/package-lock.json`. Não é necessário configurar `.env`, banco,
modelo, FFmpeg ou serviço externo nesta onda.

Na raiz:

```bash
uv sync --locked --extra api
uv run --locked uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Em outro terminal, também a partir da raiz:

```bash
npm --prefix frontend ci
npm --prefix frontend run dev
```

Frontend: <http://127.0.0.1:3000>. API:
<http://127.0.0.1:8000/api/health>. OpenAPI interativo:
<http://127.0.0.1:8000/docs>.

O shell não precisa da API para navegar. O health responde:

```json
{"schema_version":"1.0.0","status":"ok","service":"motioncoach-api","version":"0.1.0"}
```

Isso indica apenas que o processo HTTP está vivo. Não indica modelo carregado,
worker disponível ou análise de vídeo. O OpenAPI publica somente esse endpoint.

## Estrutura

- `shared/schemas/`: JSON Schema 2020-12 normativo, versão 1.0.0.
- `shared/fixtures/contracts/`: exemplos sintéticos válidos e matriz de erros,
  consumidos por Python e TypeScript.
- `motioncoach/contracts/`: adaptadores Pydantic, sem importação de HTTP ou visão.
- `backend/app/`: FastAPI, atualmente só `GET /api/health`.
- `frontend/app/`: oito rotas Next.js App Router; componentes em `components/`,
  mensagens canônicas em `messages/en.ts`, tipos gerados em `lib/`.
- `.github/workflows/ci.yml`: lint, contratos, testes e build leves.
- `docs/`: escopo, arquitetura, decisões, plano e cartões de trabalho.

O motor TypeScript nascerá em `frontend/features/exercise-engine/` na Onda 1.
Algoritmos Python só entram na Onda 5, antes da API de upload.

## Interface disponível

Navegação: `/`, `/dashboard`, `/workout/live`, `/workout/upload`, `/exercises`,
`/sessions/demo`, `/settings` e `/about/methodology`.
`/sessions/[id]` reconhece a rota, mas ainda não carrega sessões.

Em Live Workout e Video Analysis, o seletor **Preview state** mostra os 14
estados de tela, incluindo permissão negada, baixa confiança, pausa, falha e
cancelamento. Nenhum deles solicita permissão, transmite arquivo ou produz
medição. Os números de desempenho e contagem permanecem indisponíveis.

## Validação

Comandos da CI, executados localmente nesta fundação:

```bash
uv run --locked ruff check .
uv run --locked ruff format --check .
uv run --locked python -m motioncoach.contracts.schema --check
uv run --locked pytest
npm --prefix frontend run contracts:check
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend test
npm --prefix frontend run build
```

Com API e frontend rodando, o smoke HTTP verifica as oito páginas, seus links
e stylesheet, health, OpenAPI e ausência da rota de vídeo:

```bash
npm --prefix frontend run test:smoke
```

Ele não substitui inspeção visual em navegador. A inspeção visual não pôde
ser executada neste ambiente, que não disponibiliza navegador conectado.

Para servir o build de produção, depois do build:

```bash
npm --prefix frontend start
```

A instalação do núcleo sem o extra `api` também é suportada:

```bash
uv sync --locked --no-dev
```

Ela não inclui FastAPI. Para voltar ao ambiente completo, executar
`uv sync --locked --extra api`. Evidências, resultados e limites dos checks
estão no [cartão da Onda 0](docs/agentic/tasks/wave-0-foundation.md).
A execução remota do GitHub Actions depende de publicar este diff.

## Evoluir os contratos

O JSON Schema é normativo. Alterações precisam atualizar os adaptadores, os
exemplos e a versão quando houver quebra. O pytest detecta deriva do Python;
o check TypeScript compara o arquivo gerado com a especificação. Depois de
revisar uma alteração do schema:

```bash
npm --prefix frontend run contracts:generate
```

Os contratos aceitam `null` para features indisponíveis e rejeitam campos
extras, números não finitos, enums desconhecidos e ângulos fora de 0–180°.
A configuração descreve regras; ainda não executa a FSM. Veja
[os detalhes do contrato](shared/schemas/README.md).

## Escopo e continuidade

- [Escopo](docs/project-scope.md) e [análise](docs/scope-analysis.md).
- [Plano de implementação](docs/implementation-plan.md).
- [Arquitetura](docs/architecture.md) e [ADRs](docs/agentic/architecture-decisions.md).
- [Workboard](docs/agentic/workboard.md) e [protocolo de agentes](AGENTS.md).
- [Privacidade](docs/privacy.md) e [avaliação](docs/evaluation.md).

MotionCoach não diagnostica lesão, não prescreve treino e não certifica
segurança do movimento. Não há benchmark humano nem FPS medido nesta onda.
Métricas sem referência permanecem `not_evaluated`. Fixtures sintéticas não
são validação biomecânica.
