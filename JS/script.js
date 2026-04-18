// ─── Theme Toggle ──────────────────────────────
const toggleBtn = document.getElementById('themeToggle');
const body = document.body;

// Default is dark — only apply light if explicitly saved
if (localStorage.getItem('theme') === 'light') {
  body.classList.add('light-mode');
  if (toggleBtn) toggleBtn.textContent = '☀️';
}

if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    body.classList.toggle('light-mode');
    const isLight = body.classList.contains('light-mode');
    toggleBtn.textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  });
}

// ─── Scroll Reveal ─────────────────────────────
const revealEls = document.querySelectorAll('.feature-card, .step, .contact-box');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const siblings = Array.from(entry.target.parentElement.children);
      const idx = siblings.indexOf(entry.target);
      entry.target.style.transitionDelay = `${idx * 0.09}s`;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealEls.forEach(el => observer.observe(el));

// ─── Navbar Scroll ─────────────────────────────
const navbar = document.querySelector('.navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.style.borderBottomColor = window.scrollY > 12
      ? 'rgba(56, 189, 248, 0.22)'
      : '';
  }, { passive: true });
}