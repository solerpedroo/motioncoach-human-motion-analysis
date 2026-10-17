# Tarefa: `wave-0c-integration`

- Estado: done
- Onda: 0
- Responsável / ferramenta / papel: Codex / integração e revisão
- Requisitos: plano, Onda 0; ADR-009; cartão pai.
- Dependências: 0A e 0B implementadas.
- Arquivos permitidos: `.github/`, `.gitignore`, `.env.example`, `README.md`, `docs/architecture.md`, `docs/api-contract.md`, ADRs, cartões da Onda 0, workboard, `AGENTS.md` e estado do plano.

## Objetivo verificável

Instalação reproduzível, CI sem modelo ou vídeo, comandos reais documentados
e revisão dos critérios do cartão pai.

## Implementação e critérios de pronto

- [x] Lockfiles, reinstalação limpa e checks registrados.
- [x] Smoke HTTP de health e das rotas de interface.
- [x] Documentação de execução, versões e limites sincronizada.

## Validação planejada

Executar os comandos que a CI publicará, smoke local e revisão do diff.

## Fora desta tarefa

Deploy e início da Onda 1.

## Evidências e revisão

- Lockfiles e CI leve implementados. README registra instalação,
  desenvolvimento, produção, contratos, checks e smoke reais.
- Instalações limpas: `npm --prefix frontend ci` e ambientes uv separados
  `/tmp/motioncoach-wave0-full` e `/tmp/motioncoach-wave0-core`.
- Checks finais: Ruff, schema Python, pytest (54), Biome, tipos gerados,
  typecheck, Vitest (60), build e smoke HTTP aprovados.
- API e frontend com processos reais; health `200`, oito páginas `200`,
  OpenAPI só com health e `POST /api/videos` → `404`.
- CI remota ainda não executada, pois o diff é local. Inspeção visual real
  indisponível no ambiente; limitação registrada no README e cartão pai.
- ADR-011 fixa versões e decisões; arquitetura, contrato HTTP, AGENTS,
  plano e workboard sincronizados com a fundação implementada.
- `git diff --check` aprovado. Sem modelo, vídeo, deploy ou início da Onda 1.
- Evidência detalhada no [cartão pai](wave-0-foundation.md).
- Próxima ação: Onda 1 em novo diff.
