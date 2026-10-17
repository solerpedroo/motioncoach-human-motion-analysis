# Tarefa: `wave-2-exercise-fsms`

- Estado: done
- Onda: 2 — Máquinas de estado dos exercícios
- Responsável / ferramenta / papel: Codex / implementação e revisão sequenciais, 2026-10-17
- Requisitos do escopo: §§6, 7.4, RF-07, ADR-010
- Dependências: [Onda 1](wave-1-kinematics.md) em `done`
- Arquivos permitidos: `frontend/features/exercise-engine/`, testes do motor, `shared/exercise-configs/`, `shared/fixtures/` de repetição, `docs/exercise-spec.md` se uma transição precisar de esclarecimento normativo. Cartão, workboard e ADR. `frontend/next.config.ts` para permitir os imports normativos de `shared/` no bundler do monorepo. Atualizações de estado no README, arquitetura, AGENTS e plano no encerramento.
- Plano: [Onda 2](../../implementation-plan.md).

## Objetivo verificável

Agachamento, flexão, rosca e polichinelo contam um ciclo sintético completo e rejeitam os casos de borda da spec.

## Contratos e decisões

Configuração versionada por exercício. Seeds permanecem `unvalidated_seed`. Eventos usam os tipos do contrato da Onda 0 e os `rule_id` da spec. Recuperação de `UNCERTAIN` não incrementa. Lado da rosca é entrada da sessão.

O executor é único e declarativo para os quatro exercícios; a regressão verifica
os quatro IDs em conjunto. Não foi necessário separar implementações por exercício.

## Critérios de pronto

- [x] Cada id completa exatamente uma repetição no ciclo desenhado para as seeds.
- [x] Jitter no limiar, parcial, pausa e perda de pose têm os resultados da spec.
- [x] Flag de espelho não altera contagem.
- [x] Troca de lado no meio da rosca não ocorre.
- [x] No `jumping_jack`, só braços ou só pernas emitem `REP_INCOMPLETE`.
- [x] Abertura horizontal igual com espelho ligado e desligado.
- [x] Revisão registrada, sem claim de acurácia em vídeo humano.

## Validação planejada

Sequências de features com timestamps controlados. Inspecionar a lista de eventos, não só o inteiro final.

## Fora desta tarefa

Webcam, voz, persistência, port Python e calibração das seeds em pessoa real.

## Evidências e revisão

- Data: 2026-10-17; Codex, implementação e revisão sequenciais.
- Dependência Onda 1 confirmada em `done`; árvore inicial limpa, base `d4f5156`.
  Alterações locais, sem novo commit.
- Implementação: `exercise-config.ts`, `exercise-fsm.ts`,
  `exercise-analyzer.ts`, `exercise-features.ts` e `feature-processor.ts` em
  `frontend/features/exercise-engine/`. A API angular `kinematics.ts` delega
  ao processador comum e mantém seus contratos/fixtures da Onda 1.
- Quatro configurações executáveis 0.1.0 e binding anatômico em
  `shared/exercise-configs/`. Todas `unvalidated_seed`; schema de domínio
  continua 1.0.0. Sem nova dependência ou alteração de lockfiles.
- Fixtures em `shared/fixtures/repetitions/`: 36 casos de features/ações,
  total de 588 passos, e quatro sequências de landmarks com 184 frames.
  Oráculos de contagem, fases e eventos definidos a partir da spec; nenhum
  gerado chamando a implementação. Landmarks construídos por trigonometria,
  sem imagem, vídeo ou modelo.
- Decisões e correções normativas no ADR-013. Readquisição após pausa passa a
  ser explícita; o fallback unilateral do polichinelo foi removido da métrica
  conjunta para respeitar os obrigatórios e o ADR-010.
- `turbopack.root` configurado para o monorepo, permitindo imports de `shared/`
  fora da pasta do lockfile npm. Documentação da versão instalada consultada.

Comandos executados:

```bash
npm --prefix frontend run format
npm --prefix frontend test -- tests/kinematics.test.ts
npm --prefix frontend test -- tests/exercise-fsms.test.ts
npm --prefix frontend test -- tests/kinematics.test.ts tests/exercise-fsms.test.ts
npm --prefix frontend run contracts:check
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend test
npm --prefix frontend run build
uv run --locked python -m motioncoach.contracts.schema --check
git diff --check
```

Validação Python adicional das configurações novas:

```bash
uv run --locked python - <<'PYTHON'
from pathlib import Path
from motioncoach.contracts import ExerciseConfig
for name in ('squat', 'push_up', 'biceps_curl', 'jumping_jack'):
    config = ExerciseConfig.model_validate_json(Path(f'shared/exercise-configs/{name}.json').read_text())
    assert config.id == name and config.validation_status == 'unvalidated_seed'
    print(f'{name}: shared configuration accepted by Pydantic 1.0.0 adapter')
PYTHON
```

Resultados finais:

- **201 testes Vitest em quatro arquivos**, incluindo **81 novos testes** de
  configuração, FSM e integração de landmarks. Os 60 testes cinemáticos da
  Onda 1 e os 60 da fundação permanecem aprovados.
- Eventos das fixtures comparados por tipo, timestamp, regra, qualidade e
  índice; estados completos básicos conferidos frame a frame. Eventos e
  configurações também validados no schema normativo.
- Ciclo único, dois ciclos, parcial, jitter, rapidez excessiva, uma amostra
  aberta, pausa no extremo, gap, perda, interpolação e timestamp inválido
  têm regressão determinística. Interrupção gera um incompleto uma vez;
  readquisição não completa o ciclo antigo, mas permite um novo ciclo.
- Pipeline de landmarks dos quatro IDs conta um completo e zero incompletos
  nos exemplos, mantendo eventos/timestamps com espelho ligado/desligado.
  Polichinelo também teve coordenadas x refletidas em teste de invariância.
- Lado explícito da rosca e lado automático dos outros exercícios ficam
  fixos, mesmo com mudança de visibilidade ou perda. Candidato que muda antes
  da aquisição reinicia dwell. Reset inicia nova sessão.
- Braços/pernas isolados, um braço levantado só, sinais não simultâneos e
  sobreposição aparente por EMA não completam polichinelo. Braço ausente,
  quadril horizontal degenerado e vista lateral bloqueiam a análise.
- Biome sem diagnósticos; typecheck, tipos gerados e build Next 16.4.2
  aprovados. Adaptador Python sem deriva e quatro configs aceitas pelo
  Pydantic existente. `git diff --check` aprovado.

Durante a revisão, a vista lateral do polichinelo foi corrigida para retornar
ratio `null`, em vez de cair no erro de feature desconhecida. A escolha de
lado provisória foi separada da memória da FSM para não perder recuperação
nem carregar dwell de outro lado. Features inválidas no executor passaram a
ser anuladas, e os testes com landmarks usam trajetória gradual para respeitar
o gate de salto, sem afrouxar o limiar.

Limites e testes não executados:

- Sem câmera, navegador, MediaPipe, vídeo humano ou benchmark. Os resultados
  sintéticos não afirmam acurácia humana, amplitude adequada ou segurança.
- Python ainda só tem contratos: não houve port ou paridade de algoritmo.
  Suíte Python completa não foi repetida, pois API e pacote não mudaram;
  os schemas e as quatro configurações novas foram validados diretamente.
- Workflow remoto não executado; checks frontend da CI passaram localmente.
  Não foi necessário reinstalar dependências. A UI continua demonstrativa;
  o motor será conectado à captura na Onda 3.
- Feedback candidates está vazio; prioridade, cooldown, voz e resumo são da
  Onda 4. Seeds continuam `unvalidated_seed`; avaliação humana na Onda 8.

Conclusão da revisão: critérios da Onda 2 atendidos, com regras fora do React,
mesma configuração normativa e regressão dos quatro IDs. Onda 3 não iniciada.
Próxima ação: assumir [Onda 3](wave-3-webcam-pose.md) em novo diff.
