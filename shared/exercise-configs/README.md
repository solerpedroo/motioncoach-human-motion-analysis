# Parâmetros comuns do motor

`common.json` versão 0.1.0 materializa as seeds de `docs/exercise-spec.md`:
visibilidade 0,50; alfa EMA 0,40; gap de 200 ms; salto 2D de 0,20;
permanência de 80 ms e ciclo mínimo de 400 ms.

São `unvalidated_seed`, não limites biomecânicos. A Onda 1 só consome
qualidade e suavização. Tempos de permanência e ciclo serão consumidos pela
FSM da Onda 2. O polichinelo terá suas substituições conforme a especificação.
Este arquivo não é uma configuração completa de exercício.

`common.schema.json` reutiliza os campos e definições do contrato normativo
1.0.0, sem duplicar restrições numéricas. O Vitest resolve esses `$ref`
localmente e valida a configuração, sem acesso à rede. `CommonEngineConfig`
é um subconjunto tipado de `ExerciseConfig`, que usa o mesmo contrato.

Mudança de seed requer nova versão de configuração e revisão explícita das
fixtures; um resultado de teste não deve ser afrouxado para manter a suíte
verde. O status só muda conforme o protocolo da avaliação.
