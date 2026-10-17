# Tarefa: `wave-2-exercise-fsms`

- Estado: proposed
- Onda: 2 — Máquinas de estado dos exercícios
- Responsável / ferramenta / papel: não assumida
- Requisitos do escopo: §§6, 7.4, RF-07, ADR-010
- Dependências: [Onda 1](wave-1-kinematics.md) em `done`
- Arquivos permitidos: `frontend/features/exercise-engine/`, testes do motor, `shared/exercise-configs/`, `shared/fixtures/` de repetição, `docs/exercise-spec.md` se uma transição precisar de esclarecimento normativo. Cartão, workboard e ADR.
- Plano: [Onda 2](../../implementation-plan.md).

## Objetivo verificável

Agachamento, flexão, rosca e polichinelo contam um ciclo sintético completo e rejeitam os casos de borda da spec.

## Contratos e decisões

Configuração versionada por exercício. Seeds permanecem `unvalidated_seed`. Eventos usam os tipos do contrato da Onda 0 e os `rule_id` da spec. Recuperação de `UNCERTAIN` não incrementa. Lado da rosca é entrada da sessão.

Dividir em um cartão por exercício se o diff deixar de ter uma verificação única.

## Critérios de pronto

- [ ] Cada id completa exatamente uma repetição no ciclo desenhado para as seeds.
- [ ] Jitter no limiar, parcial, pausa e perda de pose têm os resultados da spec.
- [ ] Flag de espelho não altera contagem.
- [ ] Troca de lado no meio da rosca não ocorre.
- [ ] No `jumping_jack`, só braços ou só pernas emitem `REP_INCOMPLETE`.
- [ ] Abertura horizontal igual com espelho ligado e desligado.
- [ ] Revisão registrada, sem claim de acurácia em vídeo humano.

## Validação planejada

Sequências de features com timestamps controlados. Inspecionar a lista de eventos, não só o inteiro final.

## Fora desta tarefa

Webcam, voz, persistência, port Python e calibração das seeds em pessoa real.

## Evidências e revisão

- Arquivos/diff/commit:
- Comandos executados e resultados:
- Testes não executados e motivo:
- Artefatos/manifests:
- Limitações e desvios:
- Conclusão da revisão:
- Próxima ação:
