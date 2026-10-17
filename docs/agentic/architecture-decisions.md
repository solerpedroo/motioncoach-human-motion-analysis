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

## Decisões pendentes

- Onda 0 resolvida no ADR-011; comandos reais no README e evidências no cartão.
- Onda 1 resolvida no ADR-012. One Euro permanece no experimento D.
- Onda 2 resolvida no ADR-013: seeds de desenvolvimento versionadas e ainda
  não validadas. Avaliação empírica permanece na Onda 8.
- Ondas 3 e 5: pacote MediaPipe, variante Lite como padrão candidato, hash do
  asset e o fallback documentado se Web Worker for inviável.
- Onda 5: tolerância numérica da paridade TypeScript/Python e política de PTS.
- Onda 6: limites medidos de tamanho, duração, CPU e TTL. Partida sugerida pelo
  escopo: 200 MB, 5 minutos e exclusão em até 24 horas.
- Onda 8: existência de um conjunto consentido ou de um dataset cuja licença
  permita a avaliação. Sem isso a onda não fecha.
- Onda 9: LICENSE do repositório, depois do inventário real de dependências e
  de modelos. Não assumir compatibilidade.
