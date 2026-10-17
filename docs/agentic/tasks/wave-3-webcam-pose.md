# Tarefa: `wave-3-webcam-pose`

- Estado: done
- Onda: 3 — Webcam e visualização da pose
- Responsável / ferramenta / papel: Codex / implementação e validação
- Requisitos do escopo: RF-03, RF-05, sprint 2
- Dependências: [Onda 2](wave-2-exercise-fsms.md) em `done`
- Arquivos permitidos: `frontend/app/workout/live/`, `frontend/components/camera/`, `frontend/components/pose-overlay/`, `frontend/features/pose-engine/`, `frontend/workers/`, testes de ciclo de vida, docs do modelo e ADR da variante. Inclui manifesto e script local de assets, package/lock, exclusão dos assets gerados em `biome.json` e `.gitignore`, testes automatizados da captura, página ao vivo, badge contextual de `app-shell.tsx` e documentação de estado/README. Ampliação necessária para instalar e servir o runtime com versão fixa. Não alterar as transições da FSM salvo bug comprovado por fixture; nesse caso, voltar ao cartão da Onda 2.
- Plano: [Onda 3](../../implementation-plan.md).

## Reivindicação e etapas delimitadas

Dependência conferida: Onda 2 em `done`; árvore limpa ao assumir.
Sequência: runtime e assets; câmera e fila; integração visual; testes e evidências.
Na revisão, o registro foi desdobrado em [3A](wave-3a-capture-runtime.md) e
[3B](wave-3b-live-integration.md), mantendo a reivindicação original deste cartão.
O código foi implementado sequencialmente, sem delegação.

## Objetivo verificável

A página ao vivo mostra a câmera, o esqueleto alinhado e a fase produzida pelo motor, sem enviar frame.

## Contratos e decisões

Modo VIDEO do Pose Landmarker. Uma pose. Coordenadas de desenho acompanham o espelho; features usam o quadro original. Fila de inferência com um frame. Registrar versão, variante e hash do asset. Worker é a primeira opção; fallback exige ADR e throttling.

## Critérios de pronto

- [x] Permissão, troca, negação e desligamento liberam tracks.
- [x] Overlay conferido pelo usuário em câmera física, com e sem espelho. Caixas, projeção e espelho sintético já tinham passado. Sem navegador, dispositivo ou resolução registrados.
- [x] FPS exibido vem da sessão, com janela de medição documentada.
- [x] Start, pause e stop não corrompem a FSM já testada.
- [x] CI segue sem câmera real; smoke manual descrito à parte.

## Validação planejada

Stream falso para ciclo de vida. Inspeção visual local do alinhamento, declarada como qualitativa. Confirmar ausência de request com frame no fluxo ao vivo.

## Fora desta tarefa

Voz, IndexedDB, relatório exportável e qualquer rota de upload.

## Evidências e revisão

- Arquivos/diff: captura em `components/camera/`, desenho em `components/pose-overlay/`,
  runtime/manifesto em `features/pose-engine/`, worker em `workers/pose.worker.ts`,
  página `/workout/live`, dois scripts opt-in e dois arquivos de testes.
  Package/lock, exclusões de assets e documentação atualizados. Sem mudança
  das FSMs, schemas ou configurações da Onda 2. Sem commit criado.
- `npm --prefix frontend run pose:prepare`: passou; modelo baixado da origem
  oficial, SHA-256 verificado e WASM copiado do SDK 1.1.1.
- `uv run --locked ruff check .`: passou.
- `uv run --locked ruff format --check .`: 53 arquivos formatados.
- `uv run --locked python -m motioncoach.contracts.schema --check`: sem deriva.
- `uv run --locked pytest`: **54 passed**.
- `npm --prefix frontend run contracts:check`: sem deriva TypeScript.
- `npm --prefix frontend run lint`: passou, 57 arquivos.
- `npm --prefix frontend run typecheck`: passou.
- `npm --prefix frontend test`: **233 passed**, seis arquivos; 32 novos testes.
  Cobrem permissão negada/tardia, troca, unmount, erro, timeout, slot ocupado,
  bitmap descartado, vídeo duplicado, medições, projeção, pausa e ciclo parcial.
  A UI conta um ciclo sintético na FSM real, inclusive com espelho alternado;
  pausa em ciclo ativo gera incompleto e não permite concluir o ciclo antigo.
- `npm --prefix frontend run build`: passou; oito rotas do escopo disponíveis.
- `npm --prefix frontend run test:smoke -- http://127.0.0.1:3003 http://127.0.0.1:8003`:
  passou; páginas, navegação, stylesheet, health, OpenAPI somente health e
  POST de vídeo 404. Servidores locais próprios nas portas 3003 e 8003.
- `POSE_BROWSER_EXECUTABLE=/home/solerpedroo/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell POSE_SMOKE_ARTIFACTS=/tmp/motioncoach-wave3-browser npm --prefix frontend run test:pose-browser`:
  passou no build de produção, SDK/modelo reais e câmera sintética do Chromium.
  Inferência produziu amostras; pause/resume/stop passaram; tracks encerradas;
  caixas de vídeo/canvas iguais desktop/mobile; espelho comum; tráfego somente
  GET para origem local, incluindo modelo/WASM. Sem POST de frame.
- Artefatos locais temporários: `/tmp/motioncoach-wave3-browser/live-desktop.png`
  e `live-mobile.png`, inspecionados. São câmera de teste, sem pessoa. Não
  compõem benchmark e os valores observados não são metas de desempenho.
- Primeiro smoke falhou no carregador WASM de módulo; corrigido para carregador
  clássico do bootstrap Next e smoke repetido com sucesso (ADR-014).
- CI foi inspecionada: não chama `pose:prepare` nem `test:pose-browser`; mantém
  testes falsos e build sem download de modelo/câmera. Actions remoto não rodou.
- Testes não executados: câmera física/permissão real do usuário e alinhamento
  sobre pessoa. O navegador conectado à sessão não oferece essa superfície;
  Chromium headless com câmera sintética não substitui essa evidência.
- Conclusão da revisão automatizada: regressões aprovadas; o critério visual
  ficou aberto até a confirmação humana abaixo.

## Roteiro manual pendente para fechar a onda

1. Preparar assets e abrir `/workout/live` em localhost ou HTTPS, com câmera física.
2. Negar permissão: conferir instrução/retry. Permitir depois, confirmar somente
   vídeo e indicador Camera on; selecionar outra câmera quando disponível.
3. Observar juntas sobre a pessoa em vista lateral/frontal conforme exercício.
   Conferir alinhamento qualitativo normal/espelhado, redimensionamento e
   letterboxing. Registrar navegador, dispositivo, resolução e observação.
4. Sair do quadro: overlay some, qualidade fica INSUFFICIENT; retornar exige
   posição inicial. Pausar durante ciclo, retomar e conferir ausência de completo
   indevido. Não usar essa inspeção para afirmar acurácia biomecânica.
5. Stop, troca e navegação devem apagar o indicador físico de câmera; Start
   inicia nova contagem. Conferir DevTools Network sem requests com frames.
6. Anexar observações no cartão, marcar critério visual e só então mudar para
   `done`. Exceção posterior: o usuário pediu avanço para a Onda 4,
   registrada no ADR-015 e concluída em diff separado.

## Confirmação humana

Em 2026-10-17 o usuário informou que a validação humana do treino ao vivo
estava feita, com a aplicação em `http://127.0.0.1:3000/workout/live`, e pediu
para concluir o critério. Não foram informados navegador, câmera nem resolução.
A confirmação é qualitativa. Não produz MAE, F1 nem aprovação biomecânica.
Decisão no ADR-022.
