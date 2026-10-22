const form = document.getElementById('contactForm');

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
