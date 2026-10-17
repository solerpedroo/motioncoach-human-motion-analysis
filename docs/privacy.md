# Privacidade e retenção

Estado: política de engenharia do MVP em 2026-10-17. Não é parecer jurídico.
Deployment fora de localhost precisa revisar esta página contra o ambiente real.

## Webcam

- O navegador pede câmera em contexto seguro, por ação do usuário.
- A permissão não grava e não envia vídeo.
- O botão de desligar a câmera permanece visível e encerra os tracks ao parar,
  trocar de dispositivo ou sair da página.
- Microfone não é solicitado. Voz opcional usa uma voz inglesa local do
  navegador quando disponível; sem ela, o texto permanece ativo. Mudo, pausa,
  parada e saída interrompem fala, sem fila para reproduzir depois.
- Preferências locais não guardam imagem.

## Gravação

Gravar a sessão é uma ação separada, desligada por padrão. Salvar o arquivo é
outra confirmação. O fluxo ao vivo do MVP funciona sem essas duas ações.

## Histórico

Implementado na Onda 4: resumo só entra no IndexedDB pelo clique “Save summary
in this browser”. Recarregar ou sair sem salvar perde o resumo. Não se restaura
câmera/sessão ativa. O usuário pode apagar uma sessão ou todos os resumos em
My training. São guardados contadores, métricas, metadados e eventos; nenhum
frame ou landmark. A confirmação de salvar ocorre somente após commit local.

Preferências não são persistidas nesta versão; voz recomeça desligada ao abrir
a página. Browser/origem controlam esse armazenamento, que pode ser apagado ou
evicto. Uma cópia já aberta em outra aba pode continuar em memória até sair.
Resumos não são backup nem sincronização de conta.

## Upload

- O arquivo vai para diretório privado, com nome opaco.
- Não há listagem pública nem URL estável adivinhável tratada como autenticação
  forte. O identificador é não sequencial; em localhost de usuário único isso
  ainda é um controle limitado, e a interface deve dizer isso.
- O worker apaga arquivos de jobs `COMPLETED`, `FAILED` e `CANCELLED` 24 horas
  depois de `finished_at` (`MOTIONCOACH_TTL_HOURS`). Jobs na fila ou em
  processamento não entram nessa limpeza. `DELETE /api/jobs/{id}` remove o
  arquivo antes disso.
- Vídeo enviado não entra em treino de modelo.
- Exportação padrão traz JSON, CSV e gráficos. Frames brutos ficam de fora.
- Log de erro não inclui imagem, caminho absoluto do usuário nem stack para o
  cliente.

## Texto do produto

A interface e os relatórios repetem o limite: estimativa condicionada à
visibilidade e ao ângulo da câmera, sem diagnóstico e sem garantia de segurança.
Dor, tontura ou desconforto são motivo para interromper e procurar orientação
profissional. Essa frase é informação de limite, não aconselhamento personalizado.
