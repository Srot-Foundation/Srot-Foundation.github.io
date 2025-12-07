// Contact page specific interactions
const contactForm = document.getElementById('contact-form');

if (contactForm) {
    contactForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submissionEndpoint = 'https://script.google.com/macros/s/AKfycbz2OZdDQzHM5wnHfWhKUe5WTzmIUTRuhLFCGxiJX3BsvmpOH1Q4N6s2ujFOXJDTyBvvWg/exec';
        const formData = new FormData(contactForm);

        // Build a combined name field for the Apps Script endpoint/sheet
        const firstNameInput = document.getElementById('first-name');
        const lastNameInput = document.getElementById('last-name');
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');

        const firstName = (firstNameInput?.value || '').trim();
        const lastName = (lastNameInput?.value || '').trim();
        const fullName = `${firstName} ${lastName}`.trim();
        formData.set('name', fullName);

        const submitButton = contactForm.querySelector('.submit-button');
        const statusEl = document.getElementById('form-status');
        const emailValue = (emailInput?.value || '').trim();
        const phoneValue = (phoneInput?.value || '').trim();

        // Simple front-end validation
        const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
        const phoneValid = /^\+?[0-9\s()-]{7,20}$/.test(phoneValue);
        if (!emailValid) {
            alert('Please enter a valid email address.');
            emailInput?.focus();
            return;
        }
        if (!phoneValid) {
            alert('Please enter a valid phone number (digits with optional +, spaces, or dashes).');
            phoneInput?.focus();
            return;
        }

        try {
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Sending...';
            }
            statusEl?.classList.add('form-status--visible');

            await fetch(submissionEndpoint, {
                method: 'POST',
                mode: 'no-cors',
                body: formData
            });

            alert('Thank you for your message! We will get back to you soon.');
            contactForm.reset();
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('There was an error submitting the form. Please try again.');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Send message';
            }
            statusEl?.classList.remove('form-status--visible');
        }
    });
}
