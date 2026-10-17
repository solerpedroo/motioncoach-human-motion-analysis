---
name: motioncoach-movement-engine
description: Implementa ângulos, suavização, quality gate e máquinas de estado de squat, push-up, biceps curl e jumping jack no MotionCoach. Use when editing exercise rules, repetition counting, landmarks, hysteresis, shared fixtures, polichinelo, or the TypeScript/Python movement engine.
---

# Motor de movimento

## Fonte

Norma: `docs/exercise-spec.md`. Decisões: ADR-004 e ADR-005. Contratos em `shared/`.

A primeira implementação executável é TypeScript em `frontend/features/exercise-engine`. O Python em `motioncoach/` só recebe essas regras na Onda 5 e tem de reproduzir as mesmas fixtures.

## Regras de implementação

- Configuração versionada em JSON. Sem limiar numérico dentro de componente ou rota.
- Ângulo 2D em B. Vetor nulo, ponto ausente ou visibilidade baixa → `null`.
- Suavizar só número finito. Filtro padrão `ema`. Não interpolar lacuna maior que `max_gap_ms`.
- Transição com histerese, permanência mínima e ciclo mínimo.
- `UNCERTAIN` readquire estado estável e não incrementa. Pausa não conta tempo nem completa ciclo.
- Perda de pose no meio do ciclo emite incompleto.
- Espelho é flag de desenho. O teste compara a mesma sequência com a flag ligada e desligada.
- `jumping_jack` só completa quando braços e pernas atravessam a faixa aberta juntos e voltam ao fechado. Usa `leg_spread_ratio` horizontal e o `max_jump_normalized` próprio da spec.
- Seeds ficam `unvalidated_seed`. Teste sintético é desenhado em torno da seed vigente.

## Verificação

Vitest na Onda 1–2. Na Onda 5, pytest da paridade contra o mesmo JSON. Inspecione a lista de eventos, não só o total. Um jitter no limiar que gera duas repetições reprova a onda.
