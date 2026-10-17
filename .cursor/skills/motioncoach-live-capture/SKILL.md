---
name: motioncoach-live-capture
description: Liga webcam, MediaPipe Pose Landmarker e overlay do MotionCoach sem enviar frames. Use when implementing live workout, getUserMedia, camera permissions, skeleton overlay, pose inference in the browser, or Web Workers for video frames.
---

# Captura ao vivo

## Fonte

Plano, Onda 3 e Onda 4. ADR-004 e ADR-007. Privacidade em `docs/privacy.md`.

O motor de repetição já está testado antes desta skill. Esta camada entrega landmarks e desenha o estado. Ela não redefine transição.

## Implementação

- `getUserMedia({ video, audio: false })`.
- Pose Landmarker em modo VIDEO, `num_poses=1`, asset com versão e hash no ADR da onda.
- Uma carga de modelo por sessão. Liberar câmera em stop, troca e unmount.
- Fila de inferência com um frame: o mais recente substitui o atrasado.
- Features no quadro original. Espelho e overlay compartilham a transformação de desenho.
- Overlay por `requestAnimationFrame`. Métrica pesada fica fora do callback de pose.
- Tentar Web Worker. Se o runtime impedir, registrar fallback e throttling num ADR. Não deixar a fila crescer.
- Estados de tela com saída: permissão negada, sem pose, baixa confiança, pausa e falha de modelo.

## Verificação

Teste de ciclo de vida com stream falso na CI. Smoke com câmera é manual e separado. Confirmar que o fluxo ao vivo não faz POST de frame. FPS mostrado é o medido na sessão.
