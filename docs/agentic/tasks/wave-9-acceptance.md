# Tarefa: `wave-9-acceptance`

- Estado: done
- Onda: 9 — Aceitação e portfólio
- Responsável / ferramenta / papel: Cursor / implementação e validação
- Requisitos do escopo: §§21, 23 e 26
- Dependências: [Onda 7](wave-7-reports.md) em `done` para o critério de uso. [Onda 8](wave-8-evaluation.md) em `done` para qualquer número científico no README.
- Arquivos permitidos: `docs/mvp-acceptance.md`, `README.md`, `docs/privacy.md`, `docs/architecture.md`, materiais de demonstração autorizados, LICENSE se o inventário permitir a escolha, testes de regressão que faltarem para cobrir um critério. Sem feature nova.
- Plano: [Onda 9](../../implementation-plan.md).

## Objetivo verificável

O checklist da seção 26 fica preenchido com evidência, e o README permite rodar o projeto do zero.

## Contratos e decisões

Cada critério aponta comando, teste ou inspeção. Inspeção visual diz o que foi visto e o que não foi automatizado. Métrica da Onda 8 só entra se aquela onda estiver `done`. Screenshot e vídeo de demonstração usam material autorizado.

LICENSE espera o inventário de MediaPipe, modelos e datasets. Não herdar licença de outro repositório.

## Critérios de pronto

- [x] Fluxo ao vivo aceito pelo usuário (ADR-022) e fluxo de upload coberto pela suíte sintética, ambos anotados em `docs/mvp-acceptance.md`.
- [x] CI local de lint, teste e build verde em 2026-10-17.
- [x] README em inglês cobre instalação, limites, privacidade e o que não foi medido.
- [x] Textos de produto não certificam postura segura.
- [x] Workboard não aponta onda seguinte.

## Validação planejada

Clone limpo ou instalação equivalente, regressão automatizada e um ensaio manual dos dois modos. Registrar máquina, versões e verificações puladas.

## Fora desta tarefa

Conta, pagamento, chat, deploy em nuvem e experimento E.

## Evidências e revisão

Verificação local em 2026-10-17, Fedora, Python 3.12.15, Node 24.21.0, npm 11.19.0.

- Python: Ruff, schema e `pytest` com **174 passed**, 1 skipped.
- Frontend: lint, typecheck, **286 passed**, paridade e build.
- Aceitação: [docs/mvp-acceptance.md](../../mvp-acceptance.md).
- Não executado: pose real opt-in, GitHub Actions, screenshot de pessoa e vídeo de demonstração.
- `LICENSE` não foi escolhida. Os termos do asset Lite não foram reauditados.
- A Onda 8 entrou como `done` só pelo ADR-023. Nenhum número humano foi criado.
- Conclusão: critérios de portfólio desta onda registrados, com as ausências acima explícitas.
- Próxima ação: nenhuma onda no plano.
