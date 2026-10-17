# Motor puro — fundação cinemática

Implementação TypeScript independente de React, câmera e HTTP. A especificação
é `docs/exercise-spec.md`; seeds em `shared/exercise-configs/common.json` e
fixtures em `shared/fixtures/kinematics/`. Nesta onda não há fase, repetição,
seleção de lado, pausa nem emissão de `SessionEvent`.

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
`continuity_broken`. A futura FSM deve invalidar o ciclo ao receber quebra de
continuidade e readquirir seu estado inicial; `can_transition` autoriza apenas
usar uma amostra. Não equivale a uma repetição nem dispensa a permanência
mínima. O processador não interpola landmarks e sua flag `interpolated` é falsa.

## Validação

Na raiz:

```bash
npm --prefix frontend test -- tests/kinematics.test.ts
```

Regressão, lint, typecheck e build usam os comandos já documentados no README
raiz. Nenhum teste desta área exige modelo ou navegador.
