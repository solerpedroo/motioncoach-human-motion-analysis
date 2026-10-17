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

## Configurações executáveis — Onda 2

`squat.json`, `push_up.json`, `biceps_curl.json` e `jumping_jack.json` têm o
formato `ExerciseConfig` do schema normativo 1.0.0 e versão própria 0.1.0.
Guardam as seeds resolvidas, landmarks, métricas, estados, transições,
histerese, tempos e identificadores das mensagens. Não há ajuste em vídeo
humano. `common.json` continua como referência de defaults; o polichinelo
substitui tempo de estado/ciclo e salto conforme a spec.

Os exercícios articulares usam o lado esquerdo como template canônico.
`side-bindings.json` mapeia os índices anatômicos para o lado direito; IDs de
features e condições são resolvidos em conjunto. Os índices bilaterais do
polichinelo não são trocados. O espelho de apresentação não participa disso.

A validação estrutural usa o JSON Schema nos testes TypeScript e o adaptador
Pydantic. A validação semântica no executor TypeScript confere referências,
unidades, dwell, ciclo, condições simultâneas de estado estável e separação de
limiares. O port dessa execução e dessas validações fica na Onda 5.

As três posições intermediárias de reversão e recuperação estão no próprio
JSON: voltar ao início sem extremo emite incompleto; recuperar de `UNCERTAIN`
exige novamente o início; voltar do retorno ao extremo não começa outro ciclo.
O evento de completo também depende das regras temporais comuns do executor.
