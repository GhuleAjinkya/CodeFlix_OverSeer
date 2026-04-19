document.addEventListener("DOMContentLoaded", () => {
    // 1. Check window.location.search for ?session_id=
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = urlParams.get('session_id');
    
    // 2. If found, IMMEDIATELY save to localStorage
    if (sessionIdFromUrl) {
        localStorage.setItem('session_id', sessionIdFromUrl);
        // 3. THEN redirect to http://localhost:5500/frontend/dashboard.html
        window.location.href = 'http://localhost:5500/frontend/dashboard.html';
        return; // stop execution so we don't do anything else while redirecting
    }
    
    const sessionId = localStorage.getItem('session_id');
    const isLoginPage = window.location.pathname.endsWith('login.html');
    const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
    
    // 4 & 5. If no session_id in URL and none in localStorage, redirect to login
    if (!sessionId && !isLoginPage) {
        window.location.href = 'http://localhost:5500/frontend/login.html';
    } else if (sessionId && (isLoginPage || isIndexPage)) {
        // If logged in but on login/index page, redirect to dashboard
        window.location.href = 'http://localhost:5500/frontend/dashboard.html';
    }
});
