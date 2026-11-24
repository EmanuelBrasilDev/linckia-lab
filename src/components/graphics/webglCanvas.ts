export function mountWebGLCanvas(host: HTMLElement, className: string) {
  const canvas = document.createElement("canvas");
  canvas.className = className;
  host.append(canvas);
  return canvas;
}

export function releaseWebGLCanvas(
  canvas: HTMLCanvasElement,
  context: WebGLRenderingContext | WebGL2RenderingContext | null,
) {
  // A rota pode continuar no cache do React. O contexto pertence só à sua
  // sessão ativa, então removemos a superfície e liberamos a alocação da GPU.
  canvas.remove();
  if (!context || context.isContextLost()) return;
  const release = context.getExtension("WEBGL_lose_context");
  if (release) release.loseContext();
  else {
    canvas.width = 1;
    canvas.height = 1;
  }
}
