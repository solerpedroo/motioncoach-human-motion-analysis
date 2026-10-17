# Motor puro — cinemática e exercícios

Implementação TypeScript independente de React, câmera e HTTP. A especificação
é `docs/exercise-spec.md`; seeds em `shared/exercise-configs/common.json` e
fixtures em `shared/fixtures/kinematics/`. A Onda 2 acrescenta FSM, lado fixo,
pausa e eventos, usando as configurações executáveis de cada exercício.

## Entradas e tempo

`createKinematicsProcessor({ config, requirements, metrics, clock })` recebe
configuração comum, índices obrigatórios/opcionais, triplas angulares com
papel de transição ou observação e um relógio injetado `() => number`.
`update(landmarks, timestampMs?)` usa o timestamp explícito de mídia quando
fornecido, ou o relógio de sessão. Não usa `Date.now`, DOM ou timers globais.

O timestamp é finito, não negativo e estritamente crescente. Duplicatas e
amostras fora de ordem são bloqueadas sem avançar relógio, filtro ou referência
de landmarks. Timestamp inválido retorna `timestamp_ms: null`. `reset()` limpa
toda a memória de sessão. Configuração, métricas e landmarks aceitos são
copiados para que mutações do chamador não alterem a história do motor.

## Geometria e gate

`angle2D(a, b, c)` calcula o ângulo em B pelo produto escalar, com clamp em
[-1, 1]. Normaliza cada vetor antes do produto para evitar overflow/underflow.
Vetor nulo, ponto ausente ou coordenada não finita produz `null`. `z` não entra
na fórmula. O plano é o de x/y normalizados especificado no projeto, sem
reconstrução 3D ou calibração de proporção física da imagem.

`landmarkAngle2D` também exige landmarks únicos, coordenadas normalizadas e
visibilidade mínima. `presence` pode ser `null`; quando informado precisa ser
uma confiança válida em [0, 1], mas não substitui o threshold de visibilidade.

`evaluatePoseQuality` verifica os índices configurados. Obrigatório ausente,
inválido ou com visibilidade insuficiente produz `INSUFFICIENT`; opcional
indisponível produz `LIMITED`. Sem landmarks, a razão é `POSE_LOST`. Índices
duplicados são ambíguos e bloqueiam a amostra. O salto é a distância euclidiana
2D de cada ponto configurado até a última amostra aceita, sem usar `z`.
Distância maior que a seed bloqueia; igualdade é aceita. Essas classes
qualificam dados disponíveis, não a execução do exercício.

Uma métrica de transição só pode usar índices obrigatórios. Métrica de
observação pode depender dos opcionais e ficar `null`. Geometria degenerada
numa métrica de transição bloqueia a amostra; numa observação limita a
qualidade, preservando a métrica obrigatória disponível.

## EMA e continuidade

`createEmaFilter({ alpha, max_gap_ms })` aplica
`filtered = alpha * observed + (1 - alpha) * previous`.
O primeiro valor finito inicia o filtro sem média com zero.

No filtro isolado, `null` ou número não finito pode reter a última saída só
até `max_gap_ms` desde a última **observação finita**, inclusive. Essa saída
tem `interpolated: true`, `can_transition: false` e razão `HELD`. Retenções
sucessivas não renovam o prazo. Isso é retenção do valor anterior, não
reconstrução linear do movimento.

Acima do gap, a saída ausente é `null`, e a próxima observação finita reinicia
a EMA. Essa primeira amostra após gap tem `can_transition: false` e
`continuity_broken: true`; amostra válida posterior volta a autorizar análise.

O processador de landmarks é conservador: não retém ângulo quando um ponto
necessário está oculto ou ausente. Retorna `null` e reinicia filtros e
referência espacial em perda de pose, salto ou geometria necessária inválida.
Em gap longo, reinicia antes de aceitar a nova posição; a amostra atual pode
mostrar ângulo, mas não autoriza transição. Um salto não mantém o motor preso
à posição antiga: a amostra válida seguinte estabelece uma nova referência.

O resultado inclui `features`, `pose_quality`, `reasons`, `can_transition` e
`continuity_broken`. A FSM invalida o ciclo ao receber quebra de
continuidade e readquire seu estado inicial; `can_transition` autoriza apenas
usar uma amostra. Não equivale a uma repetição nem dispensa a permanência
mínima. O processador não interpola landmarks e sua flag `interpolated` é falsa.

## Validação

Na raiz:

```bash
npm --prefix frontend test -- tests/kinematics.test.ts
```

Regressão, lint, typecheck e build usam os comandos já documentados no README
raiz. Nenhum teste desta área exige modelo ou navegador.


## Analisadores de exercício — Onda 2

`createExerciseAnalyzer(idOrConfig, { camera_view, selected_side?, mirrored?,
clock })` é a entrada para frames de pose. `update({ landmarks, timestamp_ms })`
passa pelo gate, extrai e suaviza features, seleciona/fixa lado e executa a
FSM. `snapshot()`, `pause(timestamp?)`, `resume(timestamp?)` e `reset()`
completam a API. Snapshot mostra fase, totais, qualidade, features, lado e
batch de eventos da última operação. Consumir eventos uma vez por update ou
comando; não tratar leituras repetidas de snapshot como novos eventos.

`getExerciseConfig(id)` carrega cópia do JSON versionado; `resolveSide` faz o
mapeamento anatômico. Configurações customizadas já tipadas precisam passar
pelo schema de domínio antes da validação semântica do executor. O catálogo
embutido é validado no schema pela regressão. Configs e opções são copiadas;
alterar o objeto de origem não muda uma sessão existente.

`createFeatureAnalyzer(config, clock)` permite testar/reexecutar a FSM com
features já calculadas. Essa entrada não substitui o gate de landmarks; o
chamador fornece qualidade, flags de continuidade/interpolação e, quando há
suavização, as observações atuais em `observed_features`. O wrapper de frames
faz isso automaticamente. Condições precisam valer tanto nos valores filtrados
quanto nas observações atuais. Features angulares inválidas ficam `null`.

As fases, condições e limiares são do JSON. Entradas estáveis têm dwell
contínuo; trocar a condição reinicia a espera. Saídas intermediárias sem dwell
estão declaradas. Cada frame aplica no máximo uma transição. Ciclo completo
precisa do extremo, retorno estável, duração mínima desde o início e intervalo
mínimo desde o completo anterior. Ciclo curto é incompleto; ficar parado no
estado inicial não o transforma em completo depois.

Uma pausa em ciclo ativo emite incompleto uma vez e `SESSION_PAUSED`, congela
progresso em `PAUSED` e retoma em `UNCERTAIN`. Não preserva o ciclo antigo;
readquire a posição inicial. Pausa não entra no tempo ativo. Comandos aceitam
tempo finito não decrescente; frames exigem tempo estritamente crescente.
Timestamp ruim não avança memória e pode invalidar o ciclo, emitindo o
incompleto no último timestamp válido, com motivo.

Rosca exige braço explícito. Agachamento/flexão escolhem pela média de
visibilidade dos obrigatórios e fixam após dwell inicial; empate esquerdo.
Mudança antes de fixar reinicia dwell. Perder o lado escolhido bloqueia, sem
usar o outro. `reset()` inicia outra sessão; rosca mantém a escolha explícita.
O flag de espelho é apresentação e não transforma x/y nem índices.

Polichinelo exige os dois braços e pernas no mesmo frame: `arm_elevation_deg`
é o mínimo dos dois ângulos atuais antes da EMA; `leg_spread_ratio` usa somente
x, dividido pelo span horizontal dos quadris. Braço ausente ou span pequeno
bloqueia; punhos são opcionais. Não mede salto ou saída dos pés do chão.

Eventos seguem `SessionEvent` 1.0.0: regra, fase, qualidade, motivo e tempo.
Só `REP_COMPLETED` usa índice positivo; os demais têm índice `null`.
`POSE_LOST` e `LOW_VISIBILITY` são deduplicados durante a perda;
`POSE_RECOVERED` sinaliza retorno dos dados, sem completar ciclo antigo.
`feedback_candidates` segue vazio; prioridade/cooldown/voz são da Onda 4.

`feature-processor.ts` compartilha qualidade, continuidade e EMA entre ângulos
e métricas derivadas. `kinematics.ts` preserva a API e as fixtures da Onda 1.
Não há modelo, câmera, HTTP ou persistência neste pacote.

Regressão das FSMs:

```bash
npm --prefix frontend test -- tests/exercise-fsms.test.ts
```
