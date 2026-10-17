# Tarefa: `wave-3a-capture-runtime`

- Estado: done
- Onda: 3
- Responsável / ferramenta / papel: Codex / implementação e validação
- Requisitos do escopo e seção do plano: RF-03, RF-05; Onda 3
- Dependências: Onda 2 done; desdobramento documental na revisão do cartão pai
- Arquivos permitidos: features/pose-engine, workers, scripts de preparação,
  package/lock, exclusões de assets, testes de runtime e ADR-014

## Objetivo verificável

Possuir câmera e runtime de pose local com recursos limitados e cancelamento.

## Contratos e decisões

ADR-014. VIDEO, uma pose, Lite float16/1, SDK 1.1.1, hash fixo. Sem áudio,
POST de frames ou mudança de schema/configuração/FSM. Coordenadas originais;
confidence ausente vira null. Uma imagem em voo e nenhuma fila antiga.

## Implementação e critérios de pronto

- [x] Câmera, cancelamento tardio e troca liberam tracks.
- [x] Worker usa assets locais, fecha bitmap e limita processamento.
- [x] Erros e timeout oferecem retry; modelo com versão/hash documentados.
- [x] Testes de runtime e inferência real sobre câmera sintética passaram.

## Validação planejada e executada

Streams e worker falsos na CI; smoke real opt-in separado. Comandos, resultados
e artefatos no [cartão pai](wave-3-webcam-pose.md). Runtime: 20 testes novos;
smoke real confirmou SDK/WASM/modelo locais e GET-only.

## Fora desta tarefa

Interface de sessão, inspeção física e qualquer entrega da Onda 4.

## Evidências e revisão

- Arquivos/diff: implementados sequencialmente sob reivindicação do cartão pai.
- Comandos/resultados: pose:prepare, lint/typecheck/test/build e smoke de pose passaram.
- Testes não executados: inspeção física pertence à 3B e permanece pendente.
- Artefatos/manifests: model-manifest.json; SHA-256 e fonte no ADR-014.
- Limitações/desvios: carregador WASM clássico exigido pelo bootstrap Next.
- Conclusão: runtime aprovado nos limites deste cartão; não fecha a Onda 3.
- Próxima ação: completar a inspeção física da 3B.
