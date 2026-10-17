# Sessão local — Onda 4

O motor de contagem continua independente de React e HTTP. O hook da câmera
compõe `createExerciseAnalyzer`, `createFeedbackEngine` e `createSessionRecorder`.
A integração entrega cada resultado/evento uma vez; o rAF apenas lê o snapshot
para desenhar/atualizar a UI. O campo reservado `feedback_candidates` do contador
puro permanece vazio; candidatos e arbitragem são a saída explícita do motor de
feedback, sem modificar transições nem as fixtures de contagem da Onda 2.

## Resumo

A sessão começa quando o worker está pronto, excluindo espera por permissão e
carga do modelo. Usa relógio monotônico para cálculos e ISO para identificar o
início. Eventos persistidos são relativos ao início e incluem pausas no eixo
temporal. `duration_ms` é tempo decorrido; `active_duration_ms` exclui pausas.

Cobertura é a soma dos intervalos entre duas observações analisáveis,
consecutivas, sem interpolação e com gap até `max_gap_ms`, dividida pelo tempo
ativo. GOOD ou LIMITED permitem cobertura se as features de transição existem.
Pausa, falta de pose e gap longo quebram o intervalo. Não se extrapola a última
pose até Stop. Sem tempo ativo, cobertura e ritmo são null.

Completos/incompletos vêm da FSM. `discarded_repetitions` é um **subconjunto**
dos incompletos: ciclos interrompidos por perda/invalidade de dados. Não estima
quantas repetições a pessoa fez fora do quadro. Ciclos curtos e pausa não entram
nessa categoria. Ritmo é completos por minuto ativo. Duração média usa ciclos
com início/fim observados. Amplitude média usa a primeira feature angular de
transição em ciclos inteiramente GOOD, sem rotular amplitude recomendada.

Stop/falha finalizam uma vez, preservam a última fase observada e adicionam
SESSION_FINISHED. Eventos são limitados aos 5.000 mais recentes; agregados
continuam completos e `events_omitted` informa omissão. O resumo traz algoritmo
0.4.0, versões das configurações e versão/hash do modelo. Hash da configuração
permanece null; não se declara um hash não calculado. Avaliação é not_evaluated.

## Persistência

`LocalSession` versão 1 é envelope local do SessionSummary 1.0.0 com fase e
métricas agregadas. Schema em `shared/schemas/local-session.schema.json`,
referenciando o contrato normativo. Ajv valida tanto escrita quanto leitura;
campos extras (inclusive frames/landmarks) são rejeitados.

IndexedDB: banco `motioncoach-local-sessions`, versão 1, object store
`summaries`, chave `summary.id`. Toda operação fecha a conexão, trata erros de
abertura/transação e espera **commit** antes de confirmar sucesso. Mudança de
versão fecha a conexão; bloqueio por outra aba oferece recuperação.

Nenhuma escrita em Start/Pause/Stop/unmount. `save(record, consent)` exige
consentimento; a UI só passa true no clique “Save summary in this browser”.
Não há preferência que habilite salvamento automático. Reload perde o resumo
volátil e nunca restaura câmera ou sessão ativa. Dashboard/detalhe leem apenas
resumos escolhidos pelo usuário. Delete remove uma chave; Clear limpa todas.
Registro corrompido produz erro, sem exclusão silenciosa, com ação de limpar.

IndexedDB não é backup: depende do navegador/origem e pode ser apagado/evicto.
Uma cópia já aberta em outra aba pode permanecer em memória após exclusão.
Não há gravação, upload, localStorage, sincronização ou exportação nesta onda.

## Validação

Relógio/alto-falante falsos, fake-indexeddb 6.2.6 na CI e fixtures sintéticas.
O smoke opt-in `test:pose-browser` usa IndexedDB real e câmera sintética do
Chromium: sair sem salvar, salvar/recarregar, detalhe e exclusões individual e
total. Não mede acurácia nem substitui o smoke físico pendente da Onda 3.
