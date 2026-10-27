const form = document.getElementById('contactForm');
const adminLogin = document.getElementById('adminLogin');
const adminCrmLink = document.getElementById('adminCrmLink');

if (adminLogin && adminCrmLink) {
  let identityBound;

  const setupIdentity = () => {
    identityBound ??= window.loadNetlifyIdentity().then((identity) => {
      if (!identity) return null;

      const updateAdminLinks = (user) => {
        const roles = user?.app_metadata?.roles ?? user?.roles;
        const isAdmin = Array.isArray(roles) && roles.includes('admin');
        adminCrmLink.hidden = !isAdmin;
        adminLogin.hidden = isAdmin;
      };

      identity.on('init', updateAdminLinks);
      identity.on('login', (user) => {
        updateAdminLinks(user);
        identity.close();
      });
      identity.on('logout', () => updateAdminLinks(null));
      identity.init();
      return identity;
    });
    return identityBound;
  };

  adminLogin.hidden = false;
  adminLogin.addEventListener('click', () => {
    setupIdentity().then((identity) => identity?.open('login'));
  });

  // A returning admin already has a stored session, so restore their CRM button.
  if (localStorage.getItem('gotrue.user')) setupIdentity();
}

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const status = document.getElementById('formStatus');
    const formData = new FormData(form);
    const body = new URLSearchParams(formData);

    submitButton.disabled = true;
    status.textContent = 'Sending your meeting request…';

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Form submission failed with status ${response.status}`);
        }

        status.textContent = 'Thank you. Your meeting request has been sent.';
        form.reset();
      })
      .catch((error) => {
        console.error('Unable to submit meeting request:', error);
        status.textContent = 'We couldn’t send your request. Please try again in a moment.';
      })
      .finally(() => {
        submitButton.disabled = false;
      });
  });
}
