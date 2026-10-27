let identityPromise;

window.loadNetlifyIdentity = () => {
  if (identityPromise) return identityPromise;

  identityPromise = new Promise((resolve) => {
    const widgetUrl = 'https://identity.netlify.com/v1/netlify-identity-widget.js';
    const finish = () => resolve(window.netlifyIdentity || null);

    if (window.netlifyIdentity) {
      finish();
      return;
    }

    let script = document.querySelector(`script[src="${widgetUrl}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = widgetUrl;
      script.async = true;
      document.head.append(script);
    }

    script.addEventListener('load', finish);
    script.addEventListener('error', () => resolve(null));

    let attempts = 0;
    const poll = setInterval(() => {
      attempts += 1;
      if (window.netlifyIdentity) {
        clearInterval(poll);
        finish();
      } else if (attempts > 100) {
        clearInterval(poll);
        resolve(null);
      }
    }, 100);
  });

  return identityPromise;
};

// The CRM page needs Identity straight away; the public site loads it only on demand.
if (location.pathname.startsWith('/crm')) {
  window.netlifyIdentityReady = window.loadNetlifyIdentity();
}
