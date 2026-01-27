export const setupSubscriptionListener = () => {
  if (typeof window === 'undefined') return;

  window.addEventListener('subscription-required', ((event: CustomEvent) => {
    // Este evento é disparado pelo interceptor quando detecta erro 403
    // Pode ser usado para mostrar modais ou notificações
    console.log('Subscription required:', event.detail);
  }) as EventListener);
};
