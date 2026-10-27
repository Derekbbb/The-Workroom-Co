window.netlifyIdentityReady = new Promise((resolve) => {
  const script = document.createElement('script');
  script.src = 'https://identity.netlify.com/v1/netlify-identity-widget.js';
  script.async = true;
  script.onload = () => resolve(window.netlifyIdentity || null);
  script.onerror = () => resolve(null);
  document.head.append(script);
});
