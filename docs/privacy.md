# Privacidade e retenção

Estado: política de engenharia do MVP em 2026-10-17. Não é parecer jurídico.
Deployment fora de localhost precisa revisar esta página contra o ambiente real.

## Webcam

- O navegador pede câmera em contexto seguro, por ação do usuário.
- A permissão não grava e não envia vídeo.
- O botão de desligar a câmera permanece visível e encerra os tracks ao parar,
  trocar de dispositivo ou sair da página.
- Microfone não é solicitado. Voz opcional usa síntese do navegador.
- Preferências locais não guardam imagem.

## Gravação

Gravar a sessão é uma ação separada, desligada por padrão. Salvar o arquivo é
outra confirmação. O fluxo ao vivo do MVP funciona sem essas duas ações.

## Histórico

Resumo da sessão só entra no IndexedDB com opt-in. O usuário pode apagar uma
sessão e apagar todos os dados locais. `localStorage` guarda preferências de
interface, idioma e toggles, sem frame e sem landmark.

## Upload

- O arquivo vai para diretório privado, com nome opaco.
- Não há listagem pública nem URL estável adivinhável tratada como autenticação
  forte. O identificador é não sequencial; em localhost de usuário único isso
  ainda é um controle limitado, e a interface deve dizer isso.
- Partida de retenção, a confirmar na Onda 6: apagar em até 24 horas após a
  conclusão, com exclusão antecipada.
- Vídeo enviado não entra em treino de modelo.
- Exportação padrão traz JSON, CSV e gráficos. Frames brutos ficam de fora.
- Log de erro não inclui imagem, caminho absoluto do usuário nem stack para o
  cliente.

## Texto do produto

A interface e os relatórios repetem o limite: estimativa condicionada à
visibilidade e ao ângulo da câmera, sem diagnóstico e sem garantia de segurança.
Dor, tontura ou desconforto são motivo para interromper e procurar orientação
profissional. Essa frase é informação de limite, não aconselhamento personalizado.
