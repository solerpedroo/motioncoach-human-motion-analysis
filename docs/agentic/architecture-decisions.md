# Decisões arquiteturais

Este registro distingue diretrizes aceitas de escolhas ainda pendentes.
Aceitação documental não significa implementação. Novas entradas usam ID,
data, estado, contexto, decisão e consequências. Ao substituir uma decisão,
referenciar a anterior sem apagar o histórico.

## ADR-001 — Contexto compartilhado e entrega por ondas

- Data: 2026-10-17. Estado: aceito para planejamento.
- Contexto: desenvolvimento alternado em Cursor e Codex, no protocolo já usado
  em `intelligent-traffic-tracking`.
- Decisão: AGENTS, plano, cartões, workboard, ADRs, regras, skills e handoffs
  são o contexto durável. Papéis de planejamento, implementação, teste e revisão
  podem ser exercidos pelo mesmo agente, em sequência.
- Consequência: nenhuma onda de código se conclui porque a documentação existe.

## ADR-002 — Ordem: motor puro, webcam, upload, ciência

- Data: 2026-10-17. Estado: aceito para planejamento.
- Contexto: a seção 20 manda provar pose, contagem e feedback na webcam antes
  de upload e relatórios. A seção 24 manda extrair regras testáveis antes de
  embuti-las na interface. A sprint 2 do escopo liga a câmera antes da FSM.
- Decisão: Onda 0 entrega casca e contratos. Ondas 1–2 provam geometria e FSM
  em fixtures. Ondas 3–4 ligam webcam, feedback e sessão. Ondas 5–7 portam o
  motor para Python e entregam upload, timeline e exportação. Onda 8 mede.
  Onda 9 fecha aceitação e portfólio.
- Consequência: não há endpoint de análise de vídeo antes da paridade das
  fixtures. Não há treino de modelo nem autenticação dentro do MVP.

## ADR-003 — Dois runtimes, uma especificação

- Data: 2026-10-17. Estado: aceito para planejamento.
- Decisão: `shared/schemas`, `shared/exercise-configs` e `shared/fixtures` são
  normativos. A primeira implementação das regras é TypeScript, fora do React,
  em `frontend/features/exercise-engine`. O pacote Python `motioncoach/`
  guarda contratos desde a Onda 0 e recebe algoritmos na Onda 5. CLI e worker
  chamam esse pacote. FastAPI não calcula ângulo nem repetição.
- Consequência: divergência de threshold, filtro ou transição é defeito de
  paridade. O upload só exibe resultado depois que o Python reproduz as
  fixtures compartilhadas dentro da tolerância definida na Onda 5.

## ADR-004 — Pose, ângulo 2D e qualidade dos dados

- Data: 2026-10-17. Estado: aceito para planejamento.
- Decisão: MediaPipe Pose Landmarker, 33 pontos, modo VIDEO no navegador e no
  Python. Uma pose. Métricas do exercício usam `x` e `y` normalizados da
  imagem. Ângulo degenerado, ponto ausente ou visibilidade abaixo do mínimo
  configurado produz `null`. Quality gate: `GOOD`, `LIMITED`, `INSUFFICIENT`.
  Esses estados qualificam o dado de pose, não a execução física.
- Consequência: coordenadas de mundo e ângulo 3D ficam para experimento
  separado. Versão, variante e hash do asset entram no manifest quando o
  modelo for fixado nas Ondas 3 e 5.

## ADR-005 — Invariantes da repetição

- Data: 2026-10-17. Estado: aceito para planejamento.
- Decisão: cada exercício declara estados, landmarks, vistas e thresholds.
  Transição exige histerese, permanência mínima e ciclo mínimo. `UNCERTAIN`
  não completa repetição; um ciclo que já desceu e perde observabilidade vira
  incompleto. Pausa congela a FSM e não conta o tempo parado como permanência.
  Espelho não altera features. O lado escolhido permanece durante a sessão.
  Contagem perto do limiar não duplica repetição nos testes de regressão.
- Consequência: seeds numéricas vivem na configuração, com status
  `unvalidated_seed`, até o protocolo da Onda 8. A especificação operacional
  está em [exercise-spec.md](../exercise-spec.md).

## ADR-006 — Jobs locais sem Redis

- Data: 2026-10-17. Estado: aceito para planejamento.
- Contexto: o escopo sugere Redis + RQ ou equivalente e, na seção 24, rejeita
  infraestrutura prematura.
- Decisão: um processo de API e um processo de worker. SQLite para o ciclo do
  job e filesystem privado para o arquivo. Estados de produto: `UPLOADED`,
  `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`. Criação HTTP não
  executa o pipeline. Um job ativo por worker. Reprocessar cria outro id.
- Consequência: claim, heartbeat, cotas e TTL exato são detalhados na Onda 6.
  Fila distribuída e vários workers ficam fora do MVP.

## ADR-007 — Privacidade e limite do produto

- Data: 2026-10-17. Estado: aceito para planejamento.
- Decisão: frame de webcam não é enviado à API. Gravação local nasce desligada
  e exige ação própria. Voz usa `speechSynthesis`, sem microfone. Upload recebe
  nome opaco, fica fora de diretório público e é apagável antes do TTL. Texto
  de feedback descreve visibilidade, fase e amplitude observada. Não afirma
  lesão, postura correta, exercício seguro nem carga.
- Consequência: a política operacional está em [privacy.md](../privacy.md).
  Revisão jurídica de deployment real continua pendente se o serviço sair de
  localhost.

## ADR-008 — Evidência e experimentos

- Data: 2026-10-17. Estado: aceito para planejamento.
- Decisão: separar erro de pose, de contagem e de feedback. Sem referência, o
  resultado é `not_evaluated` com motivo. Experimentos A, B e C são o gate
  científico e exigem vídeo anotado autorizado. O experimento D roda primeiro
  em sinais sintéticos. O experimento E fica para depois do MVP. Thresholds de
  desenvolvimento não são ajustados no conjunto de teste.
- Consequência: o protocolo está em [evaluation.md](../evaluation.md). A Onda 8
  pode ficar `blocked` sem fabricar MAE. A Onda 9 não apresenta esse bloqueio
  como acurácia medida.

## ADR-009 — Direção de toolchain da fundação

- Data: 2026-10-17. Estado: aceito para planejamento; versões travadas na Onda 0.
- Decisão: Python 3.12, uv e `uv.lock`; Node 24 LTS, npm e `package-lock.json`.
  Frontend: Next.js, TypeScript, Tailwind, shadcn/ui, Biome, Vitest e Recharts.
  API: FastAPI e Pydantic v2 com campos extras rejeitados. Testes Python com
  pytest e Ruff. MediaPipe, OpenCV e FFmpeg não entram no ambiente padrão da
  Onda 0. CI leve não baixa modelo nem vídeo.
- Consequência: a Onda 0 registra versões resolvidas, lockfiles e um ADR de
  implementação se a combinação escolhida divergir desta direção. Referência
  de prática: o monorepo de tráfego usou essa família de ferramentas com
  sucesso local; isso não copia os lockfiles dele.

## ADR-010 — Polichinelo no MVP

- Data: 2026-10-17. Estado: aceito para planejamento.
- Contexto: o escopo deixava o polichinelo para uma versão futura. O produto
  passa a oferecê-lo junto com agachamento, flexão e rosca.
- Decisão: o identificador é `jumping_jack`. A vista normativa é a frontal. A
  repetição completa exige, ao mesmo tempo, elevação dos dois braços e
  abertura horizontal dos tornozelos, e depois o retorno dos dois sinais à
  posição fechada. Um sinal só produz `REP_INCOMPLETE`. O mapeamento, as seeds
  e o gate de salto próprio estão em [exercise-spec.md](../exercise-spec.md).
- Consequência: a Onda 2 inclui o quarto id na regressão sintética. A biblioteca
  de exercícios e os seletores da interface o listam. Avanço, elevação lateral
  e prancha continuam fora do MVP. A seed não calibra altura de salto nem
  afirma que os pés saíram do chão.

## ADR-011 — Implementação da fundação e contratos 1.0.0

- Data: 2026-10-17. Estado: aceito e implementado na Onda 0.
- Contexto: concretizar ADR-003 e ADR-009, sem antecipar captura ou motor.
- Decisão: Next.js App Router; Python 3.12.15 e uv 0.12.24; Node 24.21.0 e
  npm 11.19.0. Versões resolvidas: Next 16.4.2, React 19.3.1, TypeScript 7.0.2,
  Tailwind 4.3.3, Biome 2.5.15, Vitest 5.0.5; Pydantic 2.14.1, FastAPI 0.143.3,
  Uvicorn 0.54.0, Ruff 0.17.1 e pytest 9.1.1. Dependências npm diretas exatas;
  Python travado por `uv.lock`. O extra `api` isola FastAPI do núcleo.
- Decisão: JSON Schema 2020-12 versionado em `shared/` é normativo.
  Adaptadores Pydantic mantidos explicitamente têm igualdade estrutural
  verificada em teste. Tipos TypeScript são gerados por
  `json-schema-to-typescript` 16.0.0; CI detecta deriva. Ajv 8.20.0 e jsonschema
  4.26.0 verificam os mesmos exemplos e a matriz de erros. O checker Python
  restringe números a finitos, porque JSON Schema puro presume números JSON.
- Decisão: todos os payloads principais têm `schema_version: "1.0.0"`.
  Eventos completam os exemplos abreviados do escopo com exercício, regra e
  metadados. Resumos adicionam versão de configuração, lado, hashes anuláveis
  e motivo de `not_evaluated`. `model_version`/hash podem ser `null` enquanto
  não há modelo selecionado. Campos novos tornam explícita a auditoria já
  exigida pelo plano. A fixture de resumo é ilustrativa, não reconcilia uma
  timeline completa nem representa execução medida.
- Decisão: configuração descreve features, thresholds com unidade, transições,
  condições, histerese por nomes de thresholds, tempos, qualidade e feedback.
  Referências semânticas entre nomes serão verificadas ao implementar a FSM na
  Onda 2. A fixture de configuração é parcial e não é catálogo operacional.
- Decisão: botão local com padrão shadcn/ui, Radix Slot e tokens CSS. Recharts
  será instalado na Onda 7, que é dona dos gráficos; não há gráfico nesta onda.
  Fonte de sistema equivalente a Inter evita download durante build.
- Decisão: `agentRules: false` evita que `next dev` gere outro `AGENTS.md`;
  o protocolo permanece no arquivo raiz. Documentação da versão instalada
  pode ser consultada em `frontend/node_modules/next/dist/docs/`.
- Consequências: nenhuma dependência de visão, câmera ou upload. A UI declara
  preview; seletores não persistem nem pedem permissões. Health é liveness
  apenas. Seeds e desempenho humano seguem sem validação. Documentação de
  execução em português nesta fase; README de portfólio em inglês fica para
  a Onda 9 conforme o plano.
- Referências consultadas para integração: [Next App Router](https://nextjs.org/docs/app/getting-started/installation),
  [Tailwind com Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs),
  [botão shadcn/ui](https://ui.shadcn.com/docs/components/radix/button).

## ADR-012 — Cinemática, EMA e descontinuidade temporal

- Data: 2026-10-17. Estado: aceito e implementado na Onda 1.
- Contexto: concretizar o contrato do filtro e do quality gate antes da FSM.
  A especificação permitia retenção curta sem fixar seu prazo e recuperação.
- Decisão: manter seeds comuns vigentes (EMA alfa 0,40, gap 200 ms, salto 0,20,
  visibilidade 0,50) em JSON versionado 0.1.0, `unvalidated_seed`. Schema comum
  referencia o contrato 1.0.0 existente. Sem alteração de payload de domínio.
- Decisão: cálculo e deslocamento no plano x/y normalizado; vetor nulo ou dado
  inválido produz `null`. Salto usa distância euclidiana, limite inclusivo.
  Campos z/presence preservam contrato, sem entrar na geometria ou constituir
  outro threshold. Landmark duplicado bloqueia por ambiguidade.
- Decisão: timestamps injetados, finitos, não negativos e estritamente
  crescentes. Duplicatas/fora de ordem não avançam a memória. A EMA inicia com
  o primeiro valor observado; gap acima da seed reinicia a suavização.
- Decisão: filtro isolado pode reter saída em lacuna curta, medida desde a
  última observação finita, com `interpolated: true` e `can_transition: false`.
  Repetir retenções não prolonga o prazo. O processador não retém ângulo de
  landmark oculto: retorna `null` e limpa histórico após insuficiência.
- Decisão: gap longo permite exibir novo ângulo, mas marca
  `continuity_broken: true` e bloqueia a primeira amostra. Salto limpa referência
  antiga, permitindo nova aquisição no frame válido seguinte. Geometria
  necessária degenerada bloqueia; observação opcional degenerada só limita.
- Consequências: consumidores precisam invalidar o ciclo e readquirir estado
  após quebra de continuidade. Esse comportamento será provado com a FSM na
  Onda 2. Agora os testes verificam amostra, flag e motivo; não contam reps.
  Núcleo Python e interface permanecem nos contratos/shell da Onda 0.
- Evidências: fixtures sintéticas em `shared/fixtures/kinematics/`; comandos e
  resultados no [cartão da Onda 1](tasks/wave-1-kinematics.md). Sem métrica
  humana ou execução de modelo.

## ADR-013 — Execução declarativa das FSMs e recuperação

- Data: 2026-10-17. Estado: aceito e implementado na Onda 2.
- Contexto: executar as seeds dos quatro exercícios e resolver duas
  ambiguidades da especificação antes de conectar a câmera.
- Decisão: quatro configurações completas 0.1.0 com as seeds já previstas,
  `unvalidated_seed`, no schema de domínio 1.0.0 existente. Transições,
  condições, unidades, dwell e eventos vêm dos JSONs; validação semântica
  confere referências, histerese e aquisição do estado inicial. O executor
  TypeScript é puro. O Python só valida os contratos nesta onda.
- Decisão: dwell contínuo para posições estáveis, saída intermediária conforme
  `require_dwell: false`, uma transição por amostra. Completo exige o extremo,
  retorno estável e ciclo com duração mínima desde `REP_STARTED`, além do
  intervalo mínimo entre completos. Retorno curto demais vira incompleto.
- Decisão: perda, gap longo, salto, dado interpolado/inválido ou pausa em ciclo
  ativo emitem um incompleto, uma única vez, e exigem nova aquisição da posição
  inicial. Pausa expõe `PAUSED`, exclui o intervalo do relógio ativo e retoma em
  `UNCERTAIN`. Isso esclarece/substitui a cláusula de congelamento do ADR-005:
  a fase pode ficar suspensa na UI, mas o ciclo antigo não continua.
- Correção explícita: a spec permitia fallback de um braço no polichinelo,
  contrariando os obrigatórios bilaterais e o ADR-010. O fallback foi removido
  para a métrica conjunta: falta de um braço produz `null` e `INSUFFICIENT`
  para contar. Punhos seguem opcionais. Esta correção não muda o escopo.
- Decisão: a elevação conjunta é o mínimo dos ângulos observados no mesmo
  frame, antes da EMA. Condições da FSM precisam valer também nas features
  atuais não suavizadas, evitando contar braços/pernas que nunca abriram
  juntos, mas aparentam sobreposição por memória de filtros separados.
- Decisão: braços/pernas usam somente x/y; razão de pernas com quadril abaixo
  da seed horizontal ou vista não frontal fica `null`. Agachamento/flexão
  contam na vista lateral; rosca aceita lateral/frontal. Vista é fixa na sessão.
- Decisão: lado anatômico por configuração canônica e `side-bindings.json`.
  Rosca exige escolha do usuário. Agachamento/flexão usam maior visibilidade
  média dos obrigatórios antes de adquirir a posição inicial; empate esquerdo,
  mudança de candidato reinicia dwell; aquisição fixa o lado até reset.
  `mirrored` não transforma os dados do motor.
- Decisão: eventos mantêm o contrato 1.0.0. Índice só para completo; outros
  eventos usam `null`. Timestamp inválido não entra no payload: um incompleto
  por essa interrupção usa o último timestamp válido, com motivo explícito.
  Feedback candidates fica vazio até a Onda 4.
- Integração de build: `turbopack.root` aponta à raiz do repositório, porque
  `shared/` fica fora de `frontend/`, onde está o lockfile npm. A documentação
  instalada do Next 16.4.2 foi consultada em `dist/docs/.../turbopack.md`.
- Evidências: fixtures de features com fases/eventos esperados e landmarks
  sintéticos em `shared/fixtures/repetitions/`; testes e comandos no
  [cartão da Onda 2](tasks/wave-2-exercise-fsms.md). Sem calibração humana.

## ADR-014 — Captura local e Pose Landmarker Web (2026-10-17)

- Estado: aceito para implementação; inspeção com câmera física pendente no cartão.
- Dependência fixa: `@mediapipe/tasks-vision` **1.1.1**, npm lock com integridade.
  Variante **Lite**, modelo **float16/1**, VIDEO, `numPoses: 1`, sem segmentação,
  delegate CPU. Limiares de detecção/presença/tracking 0,5 são parâmetros de
  desenvolvimento do detector, não validação das seeds de exercício.
- Asset oficial:
  [pose_landmarker_lite.task](https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task).
  SHA-256 medido: `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`.
  Manifesto em `frontend/features/pose-engine/model-manifest.json`.
- Preparação local opt-in verifica SHA-256 e copia WASM do SDK travado.
  Assets ignorados no Git; build/CI não baixam modelo nem vídeo. Em runtime
  todos os assets vêm da mesma origem do frontend, sem POST de frame.
- Worker como execução padrão. Um snapshot em voo, nenhuma fila de espera:
  ocupado descarta captura; próximo slot livre observa a imagem atual.
  Pause mantém o modelo e suspende capturas; Stop termina worker e tracks.
- Evidência de compatibilidade: primeiro smoke real do build encontrou
  `Cannot use import.meta outside a module` ao usar WASM de módulo dentro
  do bootstrap clássico do Turbopack. Escolhido carregador WASM clássico
  (`forVisionTasks(path, false)`), confirmado por smoke posterior com modelo
  real. Isso mantém a inferência fora da UI; não foi necessário fallback na
  thread principal. Falta de suporte encerra recursos e permite retry.
- Vídeo e canvas usam a mesma caixa, contain e transformação de espelho.
  O motor recebe coordenadas originais e timestamps monotônicos. Landmarks
  inválidos/fora do quadro são omitidos; não se inventa ponto no limite.
- Resultado antigo após pause/resume/stop é descartado. Ausência de resultado
  por 500 ms entrega pose ausente à FSM. FPS e latência vêm de amostras da
  sessão, em janela móvel de dois segundos, definida no README da captura.
- Fonte primária consultada em 2026-10-17:
  [guia Web oficial](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js).
  A documentação recomenda worker porque `detectForVideo` é síncrono.
- Limite: smoke com câmera sintética valida carga e lifecycle, sem medir
  acurácia humana ou alinhamento sobre uma pessoa. Onda 3 permanece em revisão
  até a inspeção física registrada; a Onda 4 depende desse gate.

## ADR-015 — Avanço para sessão local com revisão física pendente (2026-10-17)

- Estado: aceito para implementação por instrução do usuário.
- Contexto: após receber o estado `in_review` da Onda 3 e a pendência física,
  o usuário pediu “va para a próxima onda”. Runtime, FSM e smoke sintético com
  modelo real já passaram; a câmera física permanece sem evidência.
- Decisão: iniciar a implementação da Onda 4 neste novo diff, mantendo a
  Onda 3 em revisão. Esta é uma exceção explícita à dependência `done` do
  plano; não marca inspeção humana como realizada. Substitui a restrição de
  início da Onda 4 no ADR-014. O gate físico continua aberto na Onda 3.
- Consequência: nenhuma conclusão de acurácia, benchmark humano ou aceitação
  biomecânica decorre deste avanço. CI e validação local seguem sintéticas.

## ADR-016 — Feedback, voz e resumo local (2026-10-17)

- Estado: aceito e implementado na Onda 4.
- Contexto: fechar sessão ao vivo sem alterar transições da FSM, com mensagens
  explicáveis e persistência somente por ação do usuário.
- Decisão: compor contador, `createFeedbackEngine` e recorder na camada de sessão.
  O contador puro mantém sua saída da Onda 2; candidatos/arbitragem são uma
  saída separada do motor de feedback, ainda fora do React. Regras numéricas
  ficam em `shared/exercise-configs/feedback.json` 0.1.0 e schema próprio,
  status unvalidated_seed. Nenhum parâmetro é calibração humana.
- Arbitragem: classe precede prioridade da regra: captura/visibilidade,
  observabilidade, completo, consistência. Isso esclarece o capture priority 2
  legado do squat: ele não perde para repetição. Cooldown compartilhado por
  classe; não há fallback para mensagem inferior durante bloqueio da superior.
- Consistência: pelo menos três completos anteriores GOOD e cinco amostras no
  ciclo atual, sem gaps/pausa/perda. Comparar amplitudes com mediana da própria
  sessão, seed de razão 0,8. Rosca compara vetor ombro→cotovelo médio em x/y
  normalizados com medianas anteriores, seed de distância 0,08, sempre mesmo
  braço. Históricos limitados a 20 completos. Sem suporte observacional, omitir.
  Observação pendente espera 1.500 ms pelo completo, expira em 4.000 ms e exige
  dado atual GOOD. Metadados registram feature, valor, motivo, fase e qualidade.
- Voz: porta injetável, opt-in por página, uma fala ativa e nenhuma fila.
  Mute/pausa/stop/unmount cancelam imediatamente. Classe superior cancela fala
  antiga, mesmo quando novo início é limitado. Mínimo de 1.500 ms entre inícios,
  até três em 15 s; liga/desliga não reinicia esse limite. Adaptador escolhe
  somente voz inglesa com localService; falta de voz/falha mantém texto.
  Referências: [cancel](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/cancel)
  e [localService](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService).
- Tempo: início quando modelo pronto; eventos relativos ao início, preservando
  pausas no eixo temporal. Summary.duration_ms é decorrido; envelope local
  separa ativo/pausado. Cobertura usa intervalos entre duas observações
  analisáveis adjacentes até max_gap_ms, sem extrapolação nem pausas.
  Descartados por dado indisponível são subconjunto de incompletos, não uma
  estimativa de repetições invisíveis.
- Contrato: SessionSummary 1.0.0 preservado, envelope LocalSession versão 1 em
  `shared/schemas/local-session.schema.json`, validado em leitura/escrita por
  Ajv. Algoritmo 0.4.0, versões de exercício/feedback, versão e hash de modelo.
  Config hash null, avaliação not_evaluated. Eventos limitados aos 5.000 mais
  recentes com omissão explícita; agregados continuam completos.
- Persistência: IndexedDB versão 1, object store summaries, chave summary.id.
  Save só no clique explícito; aguardar commit antes de confirmar. Sem frame,
  landmark, gravação ou localStorage. Leitura inválida mostra erro e permite
  apagar. Exclusões individual/total testadas após reabrir banco/recarregar.
  Fonte: [Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB).
- Evidência: relógio/alto-falante falsos, fake-indexeddb 6.2.6 na CI e smoke
  opt-in de Chromium com modelo real/câmera sintética e IndexedDB real.
  A pendência física da Onda 3 permanece visível; nenhuma acurácia foi inferida.

## ADR-017 — Decode, PTS e pipeline local (2026-10-17)

- Estado: aceito e implementado na Onda 5.
- Contexto: extrair metadados/frames sem API de upload e preservar o relógio de
  apresentação, inclusive VFR. Não há executável ffprobe no ambiente local.
- Decisão: PyAV **19.0.1** e NumPy **2.5.4** no extra `video`, usando libavformat/libavcodec para
  probe e decode pelo mesmo adaptador. Esta escolha substitui o executável
  ffprobe sugerido no §9.4; não cria um segundo decoder nem depende de binary
  externo no PATH. A CLI probe publica metadados, não garante decode completo.
- PTS: `(frame.pts * frame.time_base - stream.start_time * stream.time_base)
  * 1000`, com start_time ausente tratado como origem zero. A origem é fixa do
  stream original, nunca da primeira amostra/recorte. Aritmética racional até
  a fronteira do contrato numérico. Cada JSON PoseFrame mantém esse timestamp.
  Source PTS/base são preservados pelo decoder. VFR é aceito e testado com
  intervalos desiguais; average_fps serve só como metadado.
- Sem PTS/base, PTS repetido/regressivo ou timestamp normalizado negativo:
  falhar com erro estável. Nenhum fallback por FPS foi implementado. SDK Python
  exige milissegundos inteiros: floor somente no adaptador de inferência; motor
  e saída conservam PTS preciso. Colisão inteira falha, sem inventar tempo.
- Amostragem: no máximo 30 análises/s por default, selecionando frames existentes
  pelo PTS. Não renumera nem duplica amostra. Contador/suavização continuam
  sujeitos ao max_gap_ms normativo; lacuna grande pode invalidar um ciclo.
- Limites configuráveis de desenvolvimento: 200.000.000 bytes, 300.000 ms,
  3.840×2.160 pixels, 36.000 frames decodificados; sample_fps positivo até 120.
  Metadados são checados antes da pose; duração/resolução/frame count também
  durante decode. Não são limites medidos de capacidade do servidor.
- MP4/MOV/WebM passam por detecção do container real, não só extensão. Uma
  stream de vídeo, sem leitura de áudio. Protocolo local file e formatos
  permitidos são limitados na abertura. Rotação/display matrix e pixels não
  quadrados são rejeitados explicitamente nesta versão; normalizar antes.
- Recursos: decoder e modelo em context managers; fechamento em sucesso,
  erro, cancelamento cooperativo e falha do consumidor. Cancelamento não é um
  deadline nativo garantido: o isolamento/deadline do processo pertence à Onda 6.
- Pipeline: mesmo `analyze` para CLI/futuro worker, frame_sink streaming,
  progresso por frames/PTS reais. EOF invalida ciclo ativo como incompleto com
  motivo end_of_video; não inventa perda de pose nem pausa do usuário.
- Saída: diretório novo, temporário privado até sucesso. analysis.json contém
  SessionSummary 1.0.0 e proveniência; frames.jsonl contém PoseFrame 1.0.0.
  Sem imagens. Falha remove saída parcial; resultado existente não é sobrescrito
  no fluxo local. Fila/SQLite/HTTP continuam fora da onda.
- Fontes primárias: [tempo PyAV](https://pyav.basswood.io/docs/stable/api/time.html),
  [containers](https://pyav.basswood.io/docs/stable/api/container.html) e
  [vídeo/orientação](https://pyav.basswood.io/docs/stable/api/video.html).

## ADR-018 — Port Python, paridade e modelo compartilhado (2026-10-17)

- Estado: aceito e implementado na Onda 5.
- Decisão: geometria, EMA, gate, features, FSM, lado e feedback portados para
  Python puro. Sem FastAPI, React, NumPy ou modelo no import do motor.
  Configuração JSON compartilhada sem recalibração. Código de voz é exclusivo
  do navegador; candidatos/arbitragem/observações são comparados entre runtimes.
- Paridade: contagens, eventos completos/metadados, timestamps, fase, qualidade,
  null e estrutura exatos. Valores contínuos com atol=1e-9 e rtol=1e-9. Runner
  executa ambos sobre as mesmas fixtures; primeiro desvio informa caminho,
  valores e delta, sem afrouxar seed ou limiar. As fixtures continuam sintéticas.
- Referências: geometria/EMA/quality/pipeline, 36 casos de FSM, quatro sequências
  de landmarks com espelho e pause/resume, arbitragem e três casos de observação
  da própria sessão. Runner `npm --prefix frontend run test:parity`; não é
  benchmark de acurácia de pose ou biomecânica humana.
- Modelo Python: `mediapipe` **1.1.1** no extra `pose`, CPU, VIDEO, num_poses=1,
  sem segmentação e confidências 0,5. Usa o **mesmo Lite float16/1** do Web.
  SHA-256 `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`.
  Asset verificado antes de inicializar; normalização conserva x/y/z e
  visibility/presence, omite pontos fora do quadro/inválidos, nunca faz clamp.
- Manifesto único movido de frontend/features/pose-engine/model-manifest.json
  para `shared/models/pose-landmarker-lite.json`. Web e Python leem o mesmo
  arquivo, com versões dos SDKs/decoder. Esta migração atualiza a localização
  do ADR-014 sem mudar o asset. Preparação explícita; CI nunca baixa modelo.
- Empacotamento: wheel inclui os JSONs normativos de configuração/modelo/schema.
  Loaders usam shared do checkout ou cópia gerada no wheel, sem cópia manual.
  Instalação não editável do core foi testada sem runtimes HTTP/vídeo/pose.
- CI instala apenas video para gerar vídeos minúsculos sem pessoa; pose real é
  teste marcado, opt-in. O frontend CI roda a comparação cruzada com uv/Node.
  Smoke real registra hash, versões, máquina e limites do que não foi avaliado.
- Fonte primária: [Pose Landmarker Python](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/python).

## ADR-019 — Fila local de jobs (Onda 6)

- Data: 2026-10-17. Estado: aceito e implementado.
- Decisão: SQLite em `MOTIONCOACH_DATA_DIR`, um worker e um job em
  `PROCESSING`. `POST /api/videos` responde 202 depois do probe e não chama
  pose. Claim usa `BEGIN IMMEDIATE`. Cancelamento de job em execução é lido
  a cada frame. Heartbeat antigo vira `FAILED` / `WORKER_INTERRUPTED`.
  Reprocessar cria outro id.
- Retenção padrão: 24 horas após `finished_at`, só para jobs terminados.
  `QUEUED` e `PROCESSING` não são apagados. Cota padrão: 8 jobs ativos.
  Artefatos publicados: `analysis.json` e `frames.jsonl`.
- Consequência: não há Redis nem vários workers. O contrato está em
  [api-contract.md](../api-contract.md). Gráficos e exportação CSV ficam na
  Onda 7.

## Decisões pendentes

- Onda 0 resolvida no ADR-011; comandos reais no README e evidências no cartão.
- Onda 1 resolvida no ADR-012. One Euro permanece no experimento D.
- Onda 2 resolvida no ADR-013: seeds de desenvolvimento versionadas e ainda
  não validadas. Avaliação empírica permanece na Onda 8.
- Onda 3: runtime Web decidido no ADR-014; inspeção física pendente.
- Onda 5 resolvida nos ADR-017/018: pacote/modelo, port, PTS e paridade.
- Onda 6 resolvida no ADR-019. Limites de CPU em hardware real continuam
  sem medição de carga; tamanho, duração e TTL usam a partida do escopo.
- Onda 8: existência de um conjunto consentido ou de um dataset cuja licença
  permita a avaliação. Sem isso a onda não fecha.
- Onda 9: LICENSE do repositório, depois do inventário real de dependências e
  de modelos. Não assumir compatibilidade.
