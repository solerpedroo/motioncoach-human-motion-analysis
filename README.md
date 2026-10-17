# MotionCoach

Assistente educacional de observação de movimento por webcam e vídeo.
O MVP prevê agachamento, flexão, rosca bíceps e polichinelo, com contagem
explicável, ângulos 2D e feedback condicionado à visibilidade.

As **Ondas 0–2** estão concluídas: fundação, cinemática e contagem dos quatro
exercícios em motor TypeScript puro, testado com fixtures sintéticas. Há
contratos compartilhados, API de liveness, shell navegável, geometria 2D,
EMA, quality gate e FSM declarativa. A **Onda 3 está implementada, em revisão**:
captura local, worker de pose, overlay e contagem estão conectados. Falta o
smoke manual com câmera física para fechar a onda. Upload e relatórios medidos
seguem nas ondas responsáveis. A **Onda 4 está concluída**: feedback com prioridade,
voz opt-in interrompível, resumo e histórico local apagável. A **Onda 5**
implementa o port Python com paridade, probe/decode com PTS e análise local
pela CLI, ainda sem rota de upload.

## Executar localmente

Requisitos: **Python 3.12.15**, **uv 0.12.24**, **Node 24.21.0** e npm 11.
As versões de dependências estão em `uv.lock` e
`frontend/package-lock.json`. Não é necessário configurar `.env`, banco,
FFmpeg ou serviço externo. A captura requer o asset local do modelo.

Na raiz:

```bash
uv sync --locked --extra api
uv run --locked uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Em outro terminal, também a partir da raiz:

```bash
npm --prefix frontend ci
npm --prefix frontend run pose:prepare
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

O motor TypeScript em `frontend/features/exercise-engine/` já contém geometria,
EMA e quality gate, sem dependência de React. Seeds comuns estão em
`shared/exercise-configs/` e fixtures em `shared/fixtures/kinematics/`.
As máquinas de estado já contam ciclos sintéticos em `squat`, `push_up`,
`biceps_curl` e `jumping_jack`, com configurações JSON e fixtures de repetição.
Pausa/perda invalidam o ciclo e exigem readquisição; o lado fica fixo na sessão.
O port Python da Onda 5 consome os mesmos JSONs e passou na comparação cruzada,
incluindo feedback. CLI/pipeline em `motioncoach/` precedem a API de upload. Veja o
[contrato operacional do motor](frontend/features/exercise-engine/README.md).

## Interface disponível

Navegação: `/`, `/dashboard`, `/workout/live`, `/workout/upload`, `/exercises`,
`/sessions/demo`, `/settings` e `/about/methodology`.
`/sessions/[id]` carrega somente resumos salvos neste navegador por opt-in.

**Live Workout** solicita câmera somente em Start, sem microfone. Escolha
exercício, vista e braço (rosca) antes de começar. Trocar câmera encerra a
sessão; Start abre a nova câmera. Pause mantém vídeo e modelo; Resume exige
readquisição da posição inicial. Stop ou sair da página encerra tracks e worker.
Espelho afeta somente a apresentação. FPS/latência são medidos em janela de
2 segundos. Nenhum frame vai para a API. HTTPS ou localhost e suporte a
Worker, ImageBitmap e OffscreenCanvas são necessários.

Modelo MediaPipe Lite `float16/1`, SDK `1.1.1`. O comando `pose:prepare` baixa
uma vez, verifica SHA-256 e copia o WASM local; não roda na CI nem em install.
Sem assets, o fluxo oferece retry e encerra a câmera. Detalhes no
[README da captura](frontend/features/pose-engine/README.md) e ADR-014.

Ao encerrar uma sessão, **Workout summary** mostra contagem, fase, cobertura,
tempos, ritmo, amplitude observada e eventos explicáveis. Sem escolher
**Save summary in this browser**, recarregar/sair perde o resumo. O botão salva
somente métricas/eventos no IndexedDB; `/dashboard` e `/sessions/[id]` permitem
reabrir e apagar um resumo ou todo o histórico. Não há salvamento automático.

**Enable voice feedback** começa desligado, usa uma voz inglesa local quando
existe e não pede microfone. Desligar, pausar ou parar cancela fala imediatamente.
Mensagens seguem prioridade, cooldown por classe e limite de frequência. Sem
suporte de voz, a observação em texto continua disponível. Veja
[feedback](frontend/features/exercise-engine/FEEDBACK.md) e
[sessão local](frontend/features/session-store/README.md).

**Video Analysis** envia o arquivo para a API local. O processo HTTP só valida
e enfileira. A pose roda em `uv run --locked python -m backend.app.worker`,
com o extra `video` e, para um modelo real, o extra `pose` e
`motioncoach prepare-model`. A página mostra o estágio do job. Gráficos e
exportação CSV ainda não existem.

## Vídeo local pela CLI

Extras opcionais: `video` instala PyAV 19.0.1 + NumPy 2.5.4; `pose` instala
MediaPipe Python 1.1.1. O core não depende desses runtimes nem de FastAPI.
Nenhum executável ffprobe/ffmpeg é necessário: probe e decode usam libavformat
pelo PyAV. A preparação do asset é explícita, com SHA-256 verificado.

```bash
uv sync --locked --extra video --extra pose
uv run --locked motioncoach prepare-model
uv run --locked motioncoach probe data/input.mp4
uv run --locked motioncoach analyze data/input.mp4 --exercise squat --view side --output data/analysis-1
```

Esses caminhos são exemplos para um arquivo local escolhido por você. Rosca
exige `--side left` ou `--side right`; polichinelo exige `--view front`.
`--model` pode apontar ao mesmo asset preparado pelo frontend.
O diretório de saída deve ser novo e só é publicado após sucesso: analysis.json
com resumo/proveniência e frames.jsonl com PoseFrame, sem imagens brutas.
Ctrl+C/cancelamento e falha removem saída parcial e fecham recursos.

Limites iniciais configuráveis: `--max-bytes 200000000`,
`--max-duration-ms 300000`, `--max-pixels 8294400`,
`--max-decoded-frames 36000`, `--sample-fps 30`. PTS é preservado, inclusive VFR;
sem PTS há rejeição explícita, sem reconstruir pelo FPS médio. Rotação/display
matrix e pixels não quadrados precisam de normalização prévia.
[Contrato operacional Python](motioncoach/README.md) e ADRs 017/018.

## Validação

Comandos de regressão da CI, também executados localmente. Para incluir decode
real de vídeos sintéticos, instalar `uv sync --locked --extra api --extra video`.
A CI não instala `pose` nem baixa modelo/vídeo de pessoa.

```bash
uv run --locked ruff check .
uv run --locked ruff format --check .
uv run --locked python -m motioncoach.contracts.schema --check
uv run --locked pytest
npm --prefix frontend run contracts:check
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend test
npm --prefix frontend run test:parity
npm --prefix frontend run build
```

O smoke Python com modelo real é **opt-in** e não baixa o asset. Após preparar
o modelo e instalar os extras, o comando usa um vídeo sintético gerado em teste:

```bash
uv run --locked --extra video --extra pose pytest motioncoach/tests/test_pose.py -m pose --run-pose --model-path frontend/public/pose/pose_landmarker_lite.task -q -s
```

O caminho também pode ser `data/models/pose_landmarker_lite.task`, criado pelo
prepare-model. O teste registra hash, versões e máquina, sem afirmar acurácia
humana. A suíte padrão pula esse teste por design.

Com API e frontend rodando, o smoke HTTP verifica as oito páginas, seus links
e stylesheet, health, OpenAPI e ausência da rota de vídeo:

```bash
npm --prefix frontend run test:smoke
```

O smoke HTTP não substitui inspeção visual. Há também um smoke **opt-in** de
Chromium com câmera sintética, SDK e modelo reais, fora da CI. Depois de
preparar os assets e servir o build na porta 3003:

```bash
npm --prefix frontend exec -- playwright install chromium
npm --prefix frontend start -- --port 3003
# Em outro terminal:
npm --prefix frontend run test:pose-browser
```

`POSE_SMOKE_URL` altera a URL; `POSE_BROWSER_EXECUTABLE` aponta a um Chromium
já instalado; `POSE_SMOKE_ARTIFACTS` grava capturas de tela. Esse smoke verifica
inferência, tracks, pausa/retomada, espelho, dimensões mobile e requests GET
locais, resumo sem opt-in perdido ao recarregar, persistência após salvar e
exclusões individual/total após recarga. A inspeção qualitativa sobre uma pessoa
permanece pendente no
[cartão da Onda 3](docs/agentic/tasks/wave-3-webcam-pose.md).

Para servir o build de produção, depois do build:

```bash
npm --prefix frontend start
```

A suíte cinemática pode ser executada isoladamente:

```bash
npm --prefix frontend test -- tests/kinematics.test.ts
npm --prefix frontend test -- tests/exercise-fsms.test.ts
```

A instalação do núcleo sem o extra `api` também é suportada:

```bash
uv sync --locked --no-dev
```

Ela não inclui FastAPI. Para voltar ao ambiente completo, executar
`uv sync --locked --extra api`. Evidências, resultados e limites dos checks
estão nos cartões da [Onda 0](docs/agentic/tasks/wave-0-foundation.md) e
[Onda 1](docs/agentic/tasks/wave-1-kinematics.md) e
[Onda 2](docs/agentic/tasks/wave-2-exercise-fsms.md) e
[Onda 3](docs/agentic/tasks/wave-3-webcam-pose.md) e
[Onda 4](docs/agentic/tasks/wave-4-live-session.md) e
[Onda 5](docs/agentic/tasks/wave-5-python-video.md).
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
segurança do movimento. Não há benchmark humano; FPS da câmera sintética não é benchmark de webcam.
Métricas sem referência permanecem `not_evaluated`. Fixtures sintéticas não
são validação biomecânica.
