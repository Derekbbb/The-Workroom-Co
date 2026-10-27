const form = document.getElementById('contactForm');
const adminLogin = document.getElementById('adminLogin');
const adminCrmLink = document.getElementById('adminCrmLink');

if (adminLogin && adminCrmLink) {
  // Read the stored session directly so the public page never loads the Identity widget.
  try {
    const user = JSON.parse(localStorage.getItem('gotrue.user') || 'null');
    const roles = user?.app_metadata?.roles ?? user?.roles;
    const isAdmin = Array.isArray(roles) && roles.includes('admin');
    adminCrmLink.hidden = !isAdmin;
    adminLogin.hidden = isAdmin;
  } catch {
    adminLogin.hidden = false;
  }
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
