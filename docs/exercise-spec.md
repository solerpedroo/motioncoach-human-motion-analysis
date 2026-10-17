# Especificação dos exercícios

Estado: normativa para implementação. Seeds numéricas são ponto de partida
não calibrado (`unvalidated_seed`). Elas servem para testes sintéticos da
máquina de estados. Não são amplitude recomendada, critério clínico nem
resultado experimental.

Fonte de requisitos: escopo, seções 6 e 7. Decisões: ADR-004 e ADR-005.

## Interface

Todo exercício implementa `ExerciseAnalyzer`.

- Identidade: `id`, `version`, `display_name`.
- Landmarks obrigatórios e opcionais, por índice MediaPipe.
- Vista recomendada: `side`, `front` ou `either`.
- Métricas usadas na transição e métricas só observacionais.
- Estados, transições, histerese e tempos mínimos.
- `rule_id` de feedback e condições.
- `reset`, `pause` e `resume`.
- `update(frame) -> { phase, events, feedback_candidates }`.

A configuração persistida é JSON versionado em `shared/exercise-configs/`.
Componente React não compara ângulo com constante.

## Ângulo

Para pontos A, B e C, o ângulo em B usa os vetores `A - B` e `C - B` no plano
da imagem:

`angle_deg = arccos(clamp(dot(u, v) / (|u| |v|), -1, 1)) * 180 / pi`

Vetor nulo, coordenada ausente ou visibilidade insuficiente produz `null`.
Não substituir por 0 nem pelo último ângulo sem marcar o tratamento. A FSM do
MVP ignora coordenadas de mundo.

## Qualidade

Antes de transicionar:

- Sem pose: `INSUFFICIENT`, evento `POSE_LOST`.
- Landmark obrigatório abaixo de `min_visibility`: feature `null` e
  `INSUFFICIENT` para aquela regra.
- Landmark opcional ausente: a feature correspondente fica `null`; a qualidade
  da sessão cai no máximo para `LIMITED` se a regra não depender dela.
- Salto acima de `max_jump_normalized` entre amostras válidas: a amostra não
  autoriza transição.
- `GOOD` exige obrigatórios visíveis e amostra estável.

Cobertura da sessão é a fração de tempo em que a qualidade permitia analisar
o exercício. Não é nota de execução.

## Tempo

- Suavizar somente valores finitos.
- Filtro padrão: `ema`, com `alpha` nomeado na configuração.
- Lacuna maior que `max_gap_ms` não é interpolada.
- Lacuna curta pode repetir o último valor só com `interpolated: true`.
  Amostra interpolada não completa sozinha uma repetição.
- `min_state_ms` conta tempo de mídia ou de sessão, excluindo pausa.
- `min_cycle_ms` separa dois completos.
- Pausa congela o estado. Retomada não completa ciclo.
- Depois de `UNCERTAIN`, o estado estável precisa ser readquirido. A FSM não
  salta para a transição que incrementa o contador.

## Seeds comuns

| Parâmetro | Seed | Status |
| --- | --- | --- |
| `min_visibility` | 0.50 | unvalidated_seed |
| `ema.alpha` | 0.40 | unvalidated_seed |
| `max_gap_ms` | 200 | unvalidated_seed |
| `max_jump_normalized` | 0.20 | unvalidated_seed |
| `min_state_ms` | 80 | unvalidated_seed |
| `min_cycle_ms` | 400 | unvalidated_seed |

Nos exercícios de articulação, ângulo maior significa segmento mais estendido.
O polichinelo usa outro par de features, definido na seção dele.

## Squat — `squat`

Vista recomendada: lateral, corpo inteiro. Vista frontal pode existir como
metadado e não reutiliza os mesmos limiares da lateral.

Landmarks obrigatórios do lado selecionado: ombro, quadril, joelho, tornozelo.
O lado é o de maior visibilidade média na entrada em `STANDING` e permanece
fixo até `reset`.

Métrica de transição: ângulo do joelho, `angle(hip, knee, ankle)`.
Métricas observacionais, sem poder de contagem: ângulo do quadril
`angle(shoulder, hip, knee)` e inclinação do tronco em relação à vertical da
imagem.

Estados: `NOT_READY`, `STANDING`, `DESCENDING`, `BOTTOM`, `ASCENDING`,
`UNCERTAIN`, `PAUSED`.

| Transição | Condição de entrada |
| --- | --- |
| `STANDING` | joelho `>= standing_enter_deg` durante `min_state_ms` |
| saída de `STANDING` | joelho `<= standing_exit_deg` |
| `BOTTOM` | joelho `<= bottom_enter_deg` durante `min_state_ms` |
| saída de `BOTTOM` | joelho `>= bottom_exit_deg` |

Seeds: `standing_enter_deg` 160, `standing_exit_deg` 150, `bottom_enter_deg`
100, `bottom_exit_deg` 110. `standing_enter_deg` é maior que `standing_exit_deg`.
`bottom_exit_deg` é maior que `bottom_enter_deg`.

Fases intermediárias, sem limiar próprio:

- Sair de `STANDING` entra em `DESCENDING`.
- Sair de `BOTTOM` entra em `ASCENDING`.
- Voltar a `STANDING` sem ter passado por `BOTTOM` emite `REP_INCOMPLETE`.
- Entrar de novo em `STANDING` vindo de `ASCENDING`, depois de `BOTTOM`, emite
  `REP_COMPLETED` se `min_cycle_ms` desde o completo anterior foi cumprido.

Perda de pose depois de entrar em `DESCENDING` ou `BOTTOM` emite
`REP_INCOMPLETE` e não incrementa o completo.

Feedback possível, por `rule_id`: `framing.joints_hidden`,
`rep.not_fully_observed`, `capture.unstable_view`,
`consistency.smaller_range`. O último só compara com a mediana das repetições
completas da própria sessão, com pelo menos três completos e qualidade
`GOOD`. O texto descreve amplitude observada menor. Não diz que a profundidade
está errada.

## Push-up — `push_up`

Vista lateral, corpo no quadro. Landmarks obrigatórios do lado selecionado:
ombro, cotovelo, punho, quadril, tornozelo.

Métrica de transição: ângulo do cotovelo, `angle(shoulder, elbow, wrist)`.
A linha ombro–quadril–tornozelo é observacional.

Estados: `NOT_READY`, `TOP`, `LOWERING`, `BOTTOM`, `RISING`, `UNCERTAIN`,
`PAUSED`.

Seeds: `top_enter_deg` 155, `top_exit_deg` 145, `bottom_enter_deg` 90,
`bottom_exit_deg` 105. Topo usa o mesmo par entrada/saída do ângulo alto, e
fundo usa o par do ângulo baixo.

- Sair de `TOP` entra em `LOWERING`.
- Sair de `BOTTOM` entra em `RISING`.
- Voltar a `TOP` sem `BOTTOM` emite `REP_INCOMPLETE`.
- `RISING` → `TOP` depois de `BOTTOM` emite `REP_COMPLETED`, respeitando
  `min_cycle_ms`.

Incompleto também se a descida começou e a pose se perdeu antes do retorno.

`rule_id`: `framing.arm_hidden`, `framing.prefer_side_view`,
`rep.not_fully_observed`, `consistency.smaller_range`.

Contato com o chão, carga e estabilidade de tronco não são conclusões deste
vídeo.

## Biceps curl — `biceps_curl`

Vista lateral ou frontal. O usuário escolhe `left` ou `right` antes da sessão.
Landmarks obrigatórios: ombro, cotovelo e punho desse braço.

Métrica de transição: ângulo do cotovelo. Deslocamento do cotovelo em relação
ao ombro é observacional e só vira evento com qualidade `GOOD` e amostras
suficientes. Não estima carga.

Estados: `NOT_READY`, `EXTENDED`, `FLEXING`, `FLEXED`, `EXTENDING`,
`UNCERTAIN`, `PAUSED`.

Seeds: `extended_enter_deg` 150, `extended_exit_deg` 140, `flexed_enter_deg`
60, `flexed_exit_deg` 75.

- Sair de `EXTENDED` entra em `FLEXING`.
- Sair de `FLEXED` entra em `EXTENDING`.
- Voltar a `EXTENDED` sem `FLEXED` emite `REP_INCOMPLETE`.
- `EXTENDING` → `EXTENDED` depois de `FLEXED` emite `REP_COMPLETED`,
  respeitando `min_cycle_ms`.

`rule_id`: `framing.arm_hidden`, `rep.partial_movement`,
`consistency.elbow_drift`.

## Jumping jack — `jumping_jack`

Vista recomendada: frontal, corpo inteiro. Vista lateral não mede abertura no
plano da imagem e deixa a feature de pernas `null`.

Landmarks obrigatórios: ombro, cotovelo, quadril e tornozelo, dos dois lados.
Punhos são opcionais. Índices MediaPipe: ombros 11 e 12, cotovelos 13 e 14,
quadris 23 e 24, tornozelos 27 e 28.

Métricas de transição, as duas obrigatórias ao mesmo tempo:

- `arm_elevation_deg`: `angle(hip, shoulder, elbow)` de cada lado. Com os dois
  lados válidos, vale o mínimo. Um braço só não abre a fase. Com um lado
  ausente, usa-se o lado visível e a qualidade fica no máximo `LIMITED`.
- `leg_spread_ratio`: `|ankle_left.x - ankle_right.x| / |hip_left.x - hip_right.x|`.
  Só o eixo horizontal. Se `|hip_left.x - hip_right.x|` for menor que
  `min_hip_span_x`, a razão fica `null` e a qualidade do exercício vai a
  `INSUFFICIENT`. Isso cobre câmera lateral e quadril degenerado.

O espelho troca o sinal de `x` dos dois lados; o módulo da diferença não muda.

Estados: `NOT_READY`, `CLOSED`, `OPENING`, `OPEN`, `CLOSING`, `UNCERTAIN`,
`PAUSED`.

| Fase | As duas features precisam |
| --- | --- |
| `CLOSED` | braço `<= closed_arm_enter_deg` e abertura `<= closed_spread_enter` |
| saída de `CLOSED` | qualquer uma das duas sair da faixa fechada |
| `OPEN` | braço `>= open_arm_enter_deg` e abertura `>= open_spread_enter` |
| saída de `OPEN` | qualquer uma das duas sair da faixa aberta |

Seeds, todas `unvalidated_seed`: `closed_arm_enter_deg` 40,
`closed_arm_exit_deg` 55, `open_arm_enter_deg` 140, `open_arm_exit_deg` 125,
`closed_spread_enter` 1.15, `closed_spread_exit` 1.40, `open_spread_enter`
1.90, `open_spread_exit` 1.65, `min_hip_span_x` 0.08. Este exercício substitui
os tempos comuns por `min_state_ms` 40 e `min_cycle_ms` 350, e substitui o
salto comum por `max_jump_normalized` 0.45. O movimento real desloca tornozelo
e cotovelo mais do que o jitter de um agachamento; o gate continua rejeitando
teleporte, sem apagar o ciclo só porque o membro andou.

- Sair de `CLOSED` entra em `OPENING`.
- Sair de `OPEN` entra em `CLOSING`.
- Voltar a `CLOSED` sem ter passado por `OPEN` emite `REP_INCOMPLETE`.
- `CLOSING` → `CLOSED` depois de `OPEN` emite `REP_COMPLETED`, respeitando
  `min_cycle_ms`.
- Uma amostra isolada na faixa aberta não cumpre `min_state_ms` e não é
  promovida a repetição.

`rule_id`: `framing.full_body_front`, `framing.prefer_front_view`,
`rep.partial_movement`, `consistency.smaller_range`.

O texto de movimento parcial cobre o caso em que só os braços ou só as pernas
atravessam a faixa. Altura do salto, perda de contato com o chão e simetria
fina entre os lados não são conclusões desta vista.

## Regras de não emissão

- Métrica sem landmark suficiente permanece `null`.
- Ângulo não é rotulado como certo ou errado.
- Um ciclo incompleto não entra em `completed_repetitions`.
- A vista da câmera é metadado da sessão.
- Mensagem concorrente perde para a prioridade: captura e visibilidade,
  observabilidade da repetição, repetição concluída, consistência.
- Voz obedece cooldown por classe de mensagem e um interruptor imediato.
