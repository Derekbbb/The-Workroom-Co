const form = document.getElementById('contactForm');

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const button = form.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    button.textContent = 'Enquiry sent';
    button.disabled = true;

    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
      form.reset();
    }, 1500);
  });
}
