// Desativação total do botão flutuante de suporte no canto inferior direito
// Conforme solicitado, todo o suporte é unificado na página oficial: https://app.nzaidi.ao/cliente/#suporte

export function inicializarChatSuporte(): void {
  const chatWrapper = document.getElementById("nzaidi-chat-suporte-wrapper");
  if (chatWrapper) {
    chatWrapper.remove();
  }
}
