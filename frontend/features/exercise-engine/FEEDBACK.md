# Feedback observacional — Onda 4

`feedback.ts` recebe snapshot, timestamp monotônico e landmarks opcionais da
mesma amostra. `shared/exercise-configs/feedback.json` e seu schema fixam política
0.1.0, unvalidated_seed. Os rule_id e textos usam as configurações por exercício
e o catálogo canônico `messages/en.ts`. Nenhum limiar fica no componente.

## Arbitragem

Menor classe vem primeiro: captura/visibilidade, observabilidade da repetição,
completo e consistência. A prioridade do JSON do exercício desempata dentro da
classe, depois rule_id. Isso esclarece prioridades legadas, como capture com
valor 2 no squat: ainda precede eventos de repetição. Cooldown é por classe,
com duração da regra selecionada; a fronteira é inclusiva. Uma classe bloqueada
por cooldown não permite emitir concorrente inferior contraditório.

A saída contém candidatos, selected, issued e evento FEEDBACK_ISSUED quando
há nova notificação. A legenda pode continuar descrevendo a condição atual
sem repetir evento/fala. O evento guarda regra, fase, medida, qualidade e motivo;
a UI permite inspecionar esse contexto. Timestamps inválidos/duplicados são
ignorados. Pausa limpa observações pendentes.

## Gatilhos e limites

- Ausência/qualidade insuficiente: regra de enquadramento do exercício.
- Vista incompatível: regra declarada de vista, quando existe.
- Instabilidade: apenas sinal explícito LANDMARK_JUMP, sem inferir câmera instável
  de baixa visibilidade comum. É descrição de captura, não diagnóstico.
- Incompleto/completo: somente eventos emitidos pela FSM.
- Amplitude menor: comparar ciclos inteiramente GOOD e ao menos cinco amostras
  com mediana de **três completos anteriores** da própria sessão. Seed 0,8 da
  mediana; histórico limitado a 20 completos. No jack, as duas features são
  observadas, sem concluir altura de salto ou contato dos pés com o chão.
- Variação do cotovelo: rosca, mesmo braço fixo, média do vetor ombro→cotovelo em
  x/y normalizados em pelo menos cinco pontos visíveis por ciclo GOOD. Comparar
  com medianas das componentes de três completos anteriores. Distância acima
  da seed 0,08 gera observação de diferença do vetor, sem inferir carga ou
  recomendação biomecânica. Sem esses pontos, não há evento.

Consistência gera RANGE_VARIATION_OBSERVED com feature/valor, incluindo o caso
observacional de offset do cotovelo. Completo vence a arbitragem naquele frame;
a observação pode ser notificada depois de 1.500 ms, com validade de 4.000 ms,
se o dado atual seguir GOOD. Perda/pausa descarta o pendente. Essa espera evita
que a regra de menor prioridade nunca possa aparecer ou interrompa o completo.

## Voz

`voice.ts` depende só de SpeechPort e relógio injetáveis. Desligada por padrão,
sem fila. Uma fala ativa; uma observação de classe superior cancela fala antiga.
Pausa, Stop, saída e mute cancelam imediatamente. Não se reproduz backlog.
Limites: intervalo mínimo 1.500 ms e no máximo três inícios em janela de 15 s,
com os mesmos candidatos já submetidos ao cooldown visual. Liga/desliga não
reinicia o limite; o controller dura pela página.

O adaptador do navegador seleciona somente voz inglesa local (`localService`),
trata voiceschanged e falha recuperável. Sem voz local, apenas texto fica
ativo. Não usa SpeechRecognition nem solicita microfone. Falha de áudio não
interrompe contagem/visual. Fonte primária:
[cancel](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/cancel)
e [localService](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService).

Fixtures/testes sintéticos provam contratos de software, não precisão de alertas
em pessoas. Nenhum texto afirma postura correta, segurança, lesão ou carga.
