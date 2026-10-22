const form = document.getElementById('contactForm');

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const message = [
      `Your name: ${formData.get('name')}`,
      `Company: ${formData.get('company') || 'Not provided'}`,
      `What would you like support with?: ${formData.get('support')}`,
      `What’s taking up too much of your time?: ${formData.get('time') || 'Not provided'}`,
      `Preferred meeting days or times: ${formData.get('availability') || 'Not provided'}`,
      `Anything else: ${formData.get('details') || 'Not provided'}`,
    ].join('\n\n');
    const subject = encodeURIComponent('Request a meeting');
    const body = encodeURIComponent(message);

    document.getElementById('formStatus').textContent =
      'Your email app is opening with your meeting request.';
    window.location.href = `mailto:chrissy@theworkroomco.com?subject=${subject}&body=${body}`;
  });
}
