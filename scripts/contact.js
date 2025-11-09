// Contact page specific interactions
const contactForm = document.getElementById('contact-form');

if (contactForm) {
    contactForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = {
            firstName: document.getElementById('first-name')?.value.trim(),
            lastName: document.getElementById('last-name')?.value.trim(),
            email: document.getElementById('email')?.value.trim(),
            phone: document.getElementById('phone')?.value.trim(),
            message: document.getElementById('message')?.value.trim()
        };

        try {
            console.log('Form submitted:', formData);
            alert('Thank you for your message! We will get back to you soon.');
            contactForm.reset();
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('There was an error submitting the form. Please try again.');
        }
    });
}
