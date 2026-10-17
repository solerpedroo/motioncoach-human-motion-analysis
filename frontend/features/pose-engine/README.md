# Captura local — Onda 3

`camera.ts` possui o stream e invalida pedidos antigos. Stop, troca e unmount
encerram todas as tracks, inclusive permissão resolvida depois do cancelamento.
A câmera só é solicitada após Start; áudio é sempre `false`.

`worker-client.ts` mantém um único frame em voo, incluindo criação assíncrona
do ImageBitmap. Enquanto ocupado, descarta a oportunidade de captura. Quando
livre, captura o vídeo atual: não há fila de imagens antigas. O worker fecha o
bitmap depois da inferência; cancelamento fecha bitmaps ainda não transferidos.
Inicialização, captura e inferência têm timeout de 30 segundos. Uma falha
encerra worker e câmera e oferece Retry.

`pose.worker.ts` usa VIDEO, uma pose, CPU e carregador WASM clássico compatível
com o bootstrap do Turbopack. O worker é criado uma vez por Start; Pause/Resume
mantêm o modelo. Não há fallback na thread da UI. Navegador sem Worker,
ImageBitmap ou OffscreenCanvas mostra uma saída antes de pedir câmera.

## Modelo

Versões, origem e SHA-256 estão em `shared/models/pose-landmarker-lite.json` (raiz do repositório) e no ADR-014.
`npm --prefix frontend run pose:prepare` verifica o hash do modelo e copia o
WASM do pacote travado para `public/pose/`. Sem `postinstall`, CDN em runtime ou
download na CI. Os assets gerados são ignorados pelo Git e pelo Biome.
A preparação é necessária uma vez por instalação/alteração de versão.
Não apagar o manifesto ao limpar assets.

## Coordenadas e relógio

A entrada é a imagem original, sem espelho. Landmarks mantêm índice, x/y/z,
visibility e presence (ausente vira null). Valores não finitos ou fora de
x/y 0–1 são omitidos, nunca aproximados para dentro da imagem. O motor recebe
landmarks e timestamp monotônico de captura; quality e features são calculadas
pelo motor existente. A configuração de vista/lado/exercício fica fixa entre
Start e Stop. Mirror é só transformação CSS comum ao vídeo e ao canvas.

Canvas e vídeo têm o mesmo retângulo e `object-fit: contain`; o canvas usa a
resolução nativa do vídeo. Desenho ocorre em requestAnimationFrame; juntas
sem visibilidade suficiente não são desenhadas. Sem resultado recente, o
overlay desaparece após 300 ms. Após 500 ms sem resultado aceito, a integração
entrega ausência de pose ao motor, invalida o ciclo e descarta respostas antigas.

Pause interrompe novas capturas e invalida o ciclo no motor. Respostas em voo
anteriores a Pause/Resume não podem alterar a FSM. Stop preserva os números na
tela até o próximo Start, que cria um novo motor e zera a sessão. Falha ou
track encerrada também invalida o ciclo ativo. Nenhuma imagem é persistida.

## Métricas

Janela móvel de 2.000 ms, sem amostras na fronteira antiga. FPS é
`(n - 1) / (último - primeiro) * 1000`, com pelo menos duas amostras.
Capture FPS conta mudanças de `video.currentTime` observadas pelo rAF, limitado
pela taxa de desenho do navegador; não é a taxa nominal do dispositivo.
Inference FPS usa chegadas de resultados aceitos. Latência é a média do tempo
`detectForVideo` medido dentro do worker; não inclui transporte ou desenho.
Pausa e Stop limpam as janelas. Zero amostras vira “Not measured”, sem valor
padrão. A UI atualiza métricas a cada 200 ms. Não são benchmarks humanos.

## Evidência

Testes de lifecycle, fila e integração usam streams, worker e landmarks
sintéticos. O smoke opt-in `test:pose-browser` usa o SDK e modelo reais com a
câmera sintética do Chromium, sem vídeo de pessoa. A CI não o executa.
O roteiro e a inspeção pendente com câmera física estão no cartão da Onda 3.
