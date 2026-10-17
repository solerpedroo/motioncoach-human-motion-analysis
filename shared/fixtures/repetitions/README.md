# Fixtures de repetição — Onda 2

Sinais sintéticos, sem vídeo ou medição humana. Configurações 0.1.0 em
`shared/exercise-configs/`, todas `unvalidated_seed`.

`features.json`: 36 casos, com 588 passos. Cada caso informa exercício,
versão, samples/ações e resultado esperado. Em quatro ciclos básicos há fase
esperada a cada frame. Nos demais há estado final, totais e lista ordenada de
eventos com tipo, timestamp, regra, qualidade e índice. Há ciclo completo,
parcial, jitter, perda, pausa no extremo, gap, ciclo rápido e dois ciclos.
Polichinelo também tem braços isolados, pernas isoladas, abertura não
simultânea e uma amostra aberta só.

`landmarks.json`: quatro sequências explícitas, total de 184 frames. Uma
sequência para cada exercício, com timestamp e coordenadas de imagem
normalizadas, sem depender de gerador de pose no runtime do teste. A rosca
seleciona o braço direito; os outros exercícios articulares escolhem o lado
mais visível. O oráculo pede exatamente um ciclo, nenhum incompleto, eventos
início/conclusão e lado esperado. Comparações com flag de espelho ligado e
desligado exigem a mesma lista de eventos, inclusive timestamps.

Oráculos das FSMs foram definidos a partir da especificação e seeds, sem
chamar o executor para produzir expectativas. Coordenadas sintéticas foram
construídas por trigonometria, com transições suaves para os exercícios
articulares respeitarem o gate de salto. Não são uma biomecânica de referência.
O polichinelo omite punhos opcionais, portanto pode ter `LIMITED` sem impedir
análise de seus pontos obrigatórios.

O Vitest valida configs/eventos no JSON Schema normativo, confere a sequência
e exercita interrupção, recuperação, lado fixo e espelho. A Onda 5 deverá
comparar as saídas Python/TypeScript nas mesmas sequências. Contagem e tipo de
evento têm oráculo; a tolerância de timestamps da paridade será fixada naquela
onda, sem transformar esses dados em benchmark humano.
