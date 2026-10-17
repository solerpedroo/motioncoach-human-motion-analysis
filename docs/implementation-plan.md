# MotionCoach — Plano de implementação

Versão: 1.4 · Data: 2026-10-17 · Estado: Ondas 0–2 concluídas; Onda 3 em revisão; Ondas 4–9 propostas.
Fonte de requisitos: [project-scope.md](project-scope.md).
Interpretação: [scope-analysis.md](scope-analysis.md).

## 1. Objetivo e estratégia

Entregar um assistente de treino que conte repetições de agachamento, flexão,
rosca e polichinelo a partir da webcam, com feedback contextual, e depois analise um vídeo
enviado com as mesmas regras. Documentação em português. Código, API, CLI e
interface em inglês.

A ordem segue a seção 20 do escopo, com o ajuste da seção 24: a FSM é provada
em fixtures antes de ser ligada à câmera. Upload e relatório vêm depois do
fluxo ao vivo. Experimentos exigem anotação real. Ondas não têm duração
prometida.

## 2. Pilares e marcos

- **Especificação compartilhada:** schemas, exercícios e fixtures em `shared/`.
- **Motor testável:** geometria, EMA, quality gate e FSM fora da UI e do HTTP.
- **Ao vivo privado:** pose no navegador, frames sem upload, câmera liberada.
- **Paridade:** o Python reproduz as fixtures antes de publicar análise.
- **Jobs locais:** API curta, worker separado, SQLite, retenção e cancelamento.
- **Ciência honesta:** protocolo congelado, métricas separadas, `not_evaluated`.
- **Engenharia contínua:** cartão, evidência, ADR e workboard.

Marcos:

1. Onda 2: quatro exercícios contam em sequência sintética.
2. Onda 4: sessão ao vivo completa, sem backend de vídeo.
3. Onda 7: upload revisável e exportável, com paridade registrada.
4. Onda 8: experimentos A–C medidos, ou bloqueio explícito por falta de dados.
5. Onda 9: aceitação do MVP e material de portfólio.

## 3. Modelo de entrega

Sequência: **0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9**.
A onda seguinte começa depois do fechamento da anterior, ou de uma mudança
escrita no plano, no ADR e nos cartões.

Sprint 1 → Onda 0. A biblioteca da sprint 3 → Ondas 1–2. Sprint 2 → Onda 3.
Sprint 4 → Onda 4. Sprint 5 → Ondas 5–6. Sprint 6 → Onda 7. Sprint 7 → Ondas
8–9. Testes acompanham a onda que cria o comportamento.

Cada tarefa declara requisitos, arquivos, contratos, testes e exclusões.
Cursor e Codex usam [AGENTS.md](../AGENTS.md), os cartões e o
[workboard](agentic/workboard.md).

## 4. Estrutura alvo

A árvore está em [architecture.md](architecture.md). Pastas de código nascem na
onda responsável. A Onda 0 cria o esqueleto instalável, não as features.

## 5. Contratos e invariantes

### 5.1 Fronteiras

`frontend/features/exercise-engine` implementa as regras no TypeScript.
`motioncoach/` é o pacote Python puro: contratos na Onda 0, algoritmos na
Onda 5. `backend/` valida HTTP e persiste jobs. O worker importa
`motioncoach.pipeline`. Componente visual recebe fase, contagem e mensagem já
calculadas.

### 5.2 Dados

Na Onda 0, versionar e testar `Landmark`, `PoseFrame`, `PoseQuality`,
`FeatureSet`, `SessionEvent`, `SessionSummary` e o schema da configuração de
exercício. Exemplos inválidos precisam falhar: campo extra, número não finito,
qualidade desconhecida, ângulo fora de 0–180 quando o campo estiver presente.

Landmarks de imagem são normalizados. Ângulo do MVP é 2D. `null` não vira 0.
Índices seguem os 33 pontos do Pose Landmarker. O manifest de sessão guarda
algoritmo, configuração, vista e variante do modelo.

### 5.3 FSM

A especificação executável das transições está em
[exercise-spec.md](exercise-spec.md). Teste sintético constrói a sequência em
torno das seeds vigentes. Mudar uma seed atualiza a fixture de propósito; não
se afrouxa asserção para acomodar a saída.

Espelho é flag de apresentação. O teste de contagem compara a mesma sequência
com e sem a flag. Pausa no meio de `BOTTOM` ou `FLEXED` não incrementa ao
retomar.

### 5.4 Webcam

`getUserMedia` pede só vídeo. Tracks são parados em stop, troca e unmount.
Fila de inferência tem tamanho 1. Overlay e vídeo espelhado usam a mesma
transformação. FPS exibido é o medido na sessão.

### 5.5 Upload e artefatos

Estados e rotas: [api-contract.md](api-contract.md). Arquivo com nome opaco,
probe antes da inferência, progresso por etapa. Publicação por escrita
temporária e rename. Limpeza não apaga job `QUEUED` ou `PROCESSING`.
Retenção e cotas são configuração, com o ponto de partida descrito na
[privacidade](privacy.md).

### 5.6 Avaliação

Seguir [evaluation.md](evaluation.md). Fixture sintética fecha teste de
unidade. Ela não fecha a Onda 8.

## 6. Ondas

### Onda 0 — Fundação executável e contratos

Requisitos: escopo §§8–13 e sprint 1. Depende desta documentação.

Entregar monorepo instalável: pacote `motioncoach` com contratos e sem
MediaPipe; FastAPI com health; Next.js com as rotas do escopo em estados
mockados; tokens visuais; catálogo de mensagens em inglês; JSON Schema e
exemplos; CI leve; README com os comandos que de fato passaram.

Testes: schemas válidos e inválidos, health, navegação do shell, importação do
pacote Python sem FastAPI, OpenCV e MediaPipe. **Pronto:** instalação limpa,
checks locais registrados no cartão, contratos versionados. Sem câmera, sem
modelo e sem upload.

### Onda 1 — Geometria, tempo e quality gate

Requisitos: §§7.2, 7.3 e 7.5. Depende de 0.

Entregar no TypeScript ângulo 2D, rejeição de vetor nulo, EMA, lacuna longa sem
interpolação, quality gate e relógio injetável. Seeds comuns entram na
configuração compartilhada. Python continua só com contratos.

Testes: 90°, 180°, degenerado, visibilidade baixa, timestamp duplicado, gap
maior que `max_gap_ms`, salto que bloqueia transição. **Pronto:** fixtures em
`shared/fixtures` e suíte Vitest verde, sem componente React decidindo regra.

### Onda 2 — Máquinas de estado dos exercícios

Requisitos: §§6 e 7.4, RF-07, ADR-010. Depende de 1.

Entregar `ExerciseAnalyzer` para `squat`, `push_up`, `biceps_curl` e
`jumping_jack`, com seeds marcadas como não calibradas. Eventos de repetição
e recuperação depois de `UNCERTAIN`. No polichinelo, a fase aberta exige braços
e pernas ao mesmo tempo.

Testes: um ciclo gera um completo; jitter no limiar não duplica; parcial não
completa; pausa não completa; perda de pose no meio vira incompleto; espelho
não muda contagem; lado da rosca permanece; braços sem abertura de pernas não
contam polichinelo. **Pronto:** regressão determinística dos quatro ids. Sem
webcam e sem afirmar acurácia em pessoa real.

### Onda 3 — Webcam e visualização da pose

Requisitos: RF-03, RF-05, sprint 2. Depende de 2.

Entregar permissão, seletor, espelho visual, Pose Landmarker em modo VIDEO,
overlay alinhado, estados de câmera e de pose, FPS medido, start/pause/stop e
liberação de tracks. Ligar landmarks ao motor já testado. Fixar variante e hash
do asset num ADR de implementação. Tentar Web Worker; documentar fallback.

Testes: ciclo de vida com stream falso, fila que não cresce, overlay espelhado,
modelo carregado uma vez. Smoke com câmera é manual e separado da CI.
**Pronto:** sessão local mostra esqueleto e fase sem POST de frame.

### Onda 4 — Feedback, voz e sessão ao vivo

Requisitos: RF-08, RF-09, sprint 4. Depende de 3.

Entregar prioridade, cooldown, voz desligável, resumo, IndexedDB opt-in e
apagar dados. Mensagens pelos `rule_id` da especificação. Sem nota de postura.

Testes: deduplicação de fala com relógio injetado, mudo imediato, resumo com
completos e incompletos, persistência só após opt-in, exclusão verificável.
**Pronto:** o fluxo de personal trainer no navegador fecha numa sessão local.
Upload continua ausente.

### Onda 5 — Vídeo e pose Python com paridade

Requisitos: §§9.4 e 9.5, parte do RF-04. Depende de 4.

Entregar decode, limites, timestamps, Pose Landmarker Python e o port do motor.
CLI `probe` e `analyze` chamam o mesmo código que o futuro worker. Comparar
saídas com as fixtures TypeScript. Registrar política de PTS.

Testes: arquivo corrompido, limite excedido, paridade de contagem e eventos,
fechamento de decoder em erro. CI leve segue sem baixar modelo; smoke de pose
é opt-in. **Pronto:** um vídeo pequeno autorizado gera o mesmo contrato de
sessão, e a paridade das fixtures está registrada. Sem rota HTTP de upload ainda.

### Onda 6 — API, worker e retenção

Requisitos: §11, RF-04, sprint 5. Depende de 5.

Entregar as rotas da Onda 6 do contrato, worker em processo separado, claim
transacional, progresso, cancelamento, falha de crash e limpeza. A API não
importa o loop de pose para dentro do request.

Testes: upload inválido, 202 sem inferência no processo da API, cancelamento,
worker interrompido, path traversal e limpeza que preserva job ativo.
**Pronto:** um arquivo percorre a fila até um resultado ou uma falha explícita.

### Onda 7 — Timeline, relatórios e exportação

Requisitos: RF-09, RF-10, sprint 6. Depende de 6.

Entregar player sincronizado, salto para a repetição, gráfico de ângulo,
exportação JSON/CSV e PNG. Números da tela saem dos artefatos do job. Falha de
um derivado visual não apaga o JSON já válido; o aviso fica visível.

Testes: sincronização em clipe curto, exportação sem frame bruto, reconciliação
resumo↔eventos, job sem análise. **Pronto:** o usuário revisa e exporta a
análise. Equivalência já exigida na Onda 5 permanece verde.

### Onda 8 — Avaliação e experimentos

Requisitos: §§16–19, sprint 7. Depende de 7.

Congelar splits e a tolerância de 500 ms antes de mexer em seed. Executar A, B
e C em material anotado. Executar D em sinal sintético. Publicar comandos,
manifests e falhas em `research/` e atualizar [evaluation.md](evaluation.md)
com resultados separados do protocolo.

**Pronto:** três estudos reais, ou estado `blocked` com a aquisição que falta.
Tabela vazia e número sintético não fecham a onda. Experimento E não entra.

### Onda 9 — Aceitação e portfólio

Requisitos: §§21, 23 e 26. Depende de 7. A parte científica depende de 8.

Rodar a regressão, o fluxo ao vivo e o fluxo de upload. Escrever
`docs/mvp-acceptance.md` com evidência por critério. README em inglês, limites,
privacidade, screenshots autorizados e demonstração. Escolher LICENSE só depois
do inventário de dependências e do modelo.

**Pronto:** uma pessoa consegue treinar na webcam e revisar um vídeo enviado,
com os critérios da seção 26. Métrica não medida continua `not_evaluated`.

## 7. Rastreabilidade da aceitação

Critérios da seção 21:

| Critério | Onda |
| --- | --- |
| Autorizar, ver, trocar e desligar a câmera | 3 |
| Landmarks alinhados e qualidade visível | 3 |
| Contagem dos quatro exercícios e anti-jitter | 2, integrada na 3–4 |
| Feedback visual e voz desligável | 4 |
| Permissão negada com recuperação | 3 |
| Upload, rejeição e status | 5–6 |
| Timestamps, timeline e exportação | 7 |
| Apagar dados e respeitar retenção | 4 e 6 |
| Testes de geometria, FSM e baixa confiança | 1–2, regressão na 9 |
| CI | 0, ampliada a cada onda |
| Conjunto anotado e métricas | 8 |
| Relatório sem certificar postura segura | 4 e 7 |
| Webcam sem gravação implícita | 3–4 |

## 8. Qualidade

- Diff limitado aos arquivos do cartão.
- Unidade, erro e limitação atualizados junto com o código.
- Vitest para o motor TypeScript. Pytest para contratos, paridade e API.
  Playwright no fluxo de usuário a partir da onda em que o fluxo existir.
- CI sem download de modelo. Smoke de MediaPipe tem marca e pode falhar por
  ausência de asset sem ser apresentado como aprovado.
- Python: Ruff e pytest. Frontend: Biome, typecheck, Vitest e build.
- Evidência com comando e resultado no cartão. Workboard só muda de estado.

## 9. Riscos e contenção

- **Oclusão:** quality gate e `UNCERTAIN` antes de qualquer frase corretiva.
- **Jitter:** histerese e testes de limiar na Onda 2.
- **Divergência Web/Python:** fixtures comuns e gate na Onda 5.
- **Browser lento:** variante leve, fila de um frame, fallback documentado.
- **Vídeo grande:** limite, job assíncrono e worker único.
- **Privacidade:** processamento local ao vivo e TTL no upload.
- **Linguagem clínica:** `rule_id` e revisão do texto nas Ondas 4 e 9.
- **Dataset:** gate da Onda 8, sem MAE de preenchimento.
- **Drift entre agentes:** cartão e ADR canônicos; skill não cria uma segunda
  lista de tarefas.

## 10. Estado atual e próximo passo

A Onda 0 entregou contratos compartilhados 1.0.0, pacote Python independente
de HTTP, health FastAPI, shell Next.js com oito rotas e estados demonstrativos,
lockfiles e CI leve. Evidências e limitações estão no
[cartão da Onda 0](agentic/tasks/wave-0-foundation.md); comandos no README.
A Onda 1 acrescentou geometria 2D, EMA, quality gate, relógio injetável e
fixtures compartilhadas no motor puro TypeScript. Decisão no ADR-012 e
[evidências no cartão](agentic/tasks/wave-1-kinematics.md).
A Onda 2 acrescentou configurações executáveis e FSM dos quatro exercícios,
eventos, pausa com readquisição e lado fixo. A regressão sintética inclui
landmarks e eventos; ADR-013 e [cartão](agentic/tasks/wave-2-exercise-fsms.md).
A Onda 3 implementou captura, inferência em worker, overlay, lifecycle e métricas.
O smoke Chromium com câmera sintética e modelo real passou. ADR-014 registra
versões e hash. Upload permanece planejado.

Próxima ação: concluir o smoke qualitativo com câmera física do
[cartão da Onda 3](agentic/tasks/wave-3-webcam-pose.md), ainda em revisão.
Somente após esse gate, assumir a Onda 4 em novo diff.
