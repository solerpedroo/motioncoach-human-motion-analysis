# Protocolo de avaliação

Estado: protocolo congelado para planejamento em 2026-10-17. Não há medição,
dataset baixado nem MAE. Número desta página que pareça resultado deve ser
tratado como parâmetro do protocolo, não como desempenho do sistema.

## O que cada número pode afirmar

| Fenômeno | Evidência mínima | Se a evidência falta |
| --- | --- | --- |
| Contagem | anotação de repetições completas por vídeo | `not_evaluated` |
| Instante da repetição | início e fim anotados | não calcular erro temporal |
| Pose | landmarks de referência ou inspeção declarada como qualitativa | não reportar erro de pose como zero |
| Feedback | revisão por critério, com avaliador identificado no protocolo | `not_evaluated` |
| Desempenho | relógio no ambiente real, warm-up fora da estatística | não publicar FPS de catálogo |

Erro de pose, erro de contagem e erro de feedback permanecem em tabelas
separadas.

## Métricas

- MAE de contagem por vídeo e por exercício.
- Pareamento um a um de `REP_COMPLETED` com a anotação, tolerância inicial
  500 ms. Esse valor fica congelado antes de ajustar thresholds no conjunto
  de teste. TP, FP e FN usam esse pareamento. Denominador vazio não vira 0
  nem 1; a taxa fica `null` e as contagens absolutas seguem visíveis.
- Erro de início e fim em milissegundos, só com limites temporais anotados.
- Cobertura: fração do tempo com qualidade suficiente para a regra.
- Latência mediana e p95, FPS efetivo de inferência, CPU e RAM quando o
  ambiente expuser esses contadores.
- Precisão de feedback somente com o protocolo de revisão. Taxa de alertas por
  minuto pode ser descritiva sem ser tratada como precisão.

## Separação dos dados

Unidade de split: pessoa e sessão. Vídeos da mesma pessoa não cruzam ajuste e
teste. Thresholds e seeds só mudam no desenvolvimento. A configuração é
congelada antes do teste. Relatório quebra por exercício, pessoa e condição
de câmera.

Fixtures sintéticas provam a FSM. Elas não são benchmark de acurácia humana.

## Paridade entre runtimes

A comparação TypeScript/Python usa a mesma sequência de landmarks e a mesma
configuração. O gate da Onda 5 é igualdade de contagem, tipos de evento e
timestamps exatos nas fixtures determinísticas. Desde a Onda 5, features e
valores contínuos usam tolerância absoluta 1e-9 e relativa 1e-9, por valor;
null, fase, qualidade, regra, motivo, contadores e estrutura são exatos. Diferença de
variante de modelo ou de amostragem de frames entra no manifest e impede
chamar as saídas de pose real de equivalentes. O gate compara rastros completos
das fixtures comuns, incluindo filtros, ações de pausa, lados, espelho e
feedback. Comando reproduzível: `npm --prefix frontend run test:parity`.
A tolerância não é a tolerância de 500 ms do pareamento com anotação humana e
não produz MAE/F1 de pessoas. Decisão no ADR-018.

## Experimentos do MVP

- **A — Contagem.** Cruzamento simples de limiar, limiar com suavização, e FSM
  com histerese. Métricas: MAE, F1 de eventos, duplicatas e falhas com
  interrupção.
- **B — Câmera.** Lateral, frontal e diagonal; oclusão parcial quando o
  conjunto tiver essa condição. Métricas: MAE, cobertura e tempo em
  `INSUFFICIENT`.
- **C — Variante de pose.** Lite e Full, mesmas regras e mesmos vídeos. Métricas:
  FPS, latência p95, cobertura, erro de contagem e estabilidade angular.
- **D — Filtro.** Sem filtro, EMA, média móvel e One Euro em sinal sintético
  com jitter conhecido. Repetir em vídeo real só quando o conjunto existir.
  Métricas: variabilidade em trecho estável e deslocamento do timestamp do evento.
- **E — Modelo temporal aprendido.** Fora do MVP.

A, B e C fecham a Onda 8 somente com material anotado e autorizado. D não
substitui esse gate. Não declarar significância com poucas sessões.

## Manifest de uma medição

Hash do vídeo, hash da anotação, configuração resolvida, versão do algoritmo,
variante e hash do modelo, hardware, commit e indicador de árvore suja.
Resultados por sessão, não só a média. Falhas e exclusões entram no relatório.
