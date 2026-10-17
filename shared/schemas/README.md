# Contratos compartilhados — 1.0.0

`contracts.schema.json` é a especificação normativa JSON Schema 2020-12.
`$defs` publica os modelos; o objeto raiz é só um catálogo para geração de
adapters, não um payload HTTP. `PoseQuality` é a enumeração inline em
`properties.pose_quality` do catálogo.

O adaptador Pydantic é comparado estruturalmente com o schema no pytest e em
`uv run python -m motioncoach.contracts.schema --check`. TypeScript é gerado
por `npm run contracts:generate` em `frontend/`; `contracts:check` detecta
arquivo desatualizado. Mudanças começam pela especificação, atualizam os
adapters e precisam manter os dois checks verdes. O exportador Python ajuda a
preparar o diff; executá-lo não autoriza mudar a especificação sem revisão.

Regras de transporte:

- Objetos rejeitam campos extras; números são finitos e não coercivos.
- `x` e `y` em [0, 1], `z` finito; confiança anulável em [0, 1]. Índices 0–32.
- Lista de landmarks pode ser vazia ou abreviada, até 33 pontos. Ausência de
  ponto não vira coordenada zero. O quality gate chega na Onda 1.
- Features ausentes são anuláveis; ângulos presentes em [0, 180].
- Tempo em milissegundos não negativo; monotonicidade entre frames é uma
  regra temporal da Onda 1. Data de início exige fuso horário.
- Eventos incluem exercício, regra, qualidade e metadados tipados. Os exemplos
  abreviados do escopo ganham os campos obrigatórios e `schema_version`.
- Manifest de resumo inclui versão de configuração e modelo, lado e hashes
  anuláveis. Hash/modelo não selecionado não é fabricado.
- A configuração descreve features, thresholds com unidade, qualidade, EMA,
  tempos e mensagens. Seu schema não executa FSM. Seeds reais entram nas
  Ondas 1–2. A fixture não é configuração operacional completa.

JSON não representa NaN/Infinity. A matriz em `fixtures/contracts/invalid`
instrui os testes a injetá-los em memória, para também provar que adapters
recusam essas entradas antes de serializar.


## Envelope local da Onda 4

`local-session.schema.json` versão de armazenamento 1 referencia o
SessionSummary normativo 1.0.0 e acrescenta fase final/métricas agregadas.
Não altera HTTP nem os adaptadores de contratos Python. O frontend valida o
envelope inteiro em leitura/escrita. Propriedades extras são rejeitadas,
incluindo imagens, frames ou landmarks. Detalhes no README de session-store.
