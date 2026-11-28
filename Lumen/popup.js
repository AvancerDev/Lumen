// --- Navigazione (wrappata così il codice resta testabile) ---
function navigateTo(url) {
    window.location.href = url;
}

// --- App Google integrate (massimo 20) ---
const GOOGLE_APPS = [
    { name: 'Gmail', url: 'https://mail.google.com/', aliases: ['mail', 'googlemail', 'posta', 'email', 'e-mail'] },
    { name: 'YouTube', url: 'https://www.youtube.com/', aliases: ['yt', 'video', 'videos'] },
    { name: 'Gemini', url: 'https://gemini.google.com/', aliases: ['bard', 'googlegemini'] },
    { name: 'Drive', url: 'https://drive.google.com/', aliases: ['gdrive', 'googledrive'] },
    { name: 'Maps', url: 'https://maps.google.com/', aliases: ['gmaps', 'googlemaps', 'mappe'] },
    { name: 'Photos', url: 'https://photos.google.com/', aliases: ['googlephotos', 'foto', 'fotos'] },
    { name: 'Calendar', url: 'https://calendar.google.com/', aliases: ['cal', 'agenda', 'calendario', 'googlecalendar'] },
    { name: 'Keep', url: 'https://keep.google.com/', aliases: ['notes', 'note', 'appunti', 'googlekeep'] },
    { name: 'Docs', url: 'https://docs.google.com/', aliases: ['documenti', 'googledocs'] },
    { name: 'Sheets', url: 'https://sheets.google.com/', aliases: ['fogli', 'googlesheets', 'tabelle'] },
    { name: 'Slides', url: 'https://slides.google.com/', aliases: ['presentazioni', 'googleslides'] },
    { name: 'Meet', url: 'https://meet.google.com/', aliases: ['googlemeet', 'videochiamate', 'riunioni'] },
    { name: 'Classroom', url: 'https://classroom.google.com/', aliases: ['googleclassroom'] },
    { name: 'Translate', url: 'https://translate.google.com/', aliases: ['traduttore', 'traduzioni', 'googletranslate'] },
    { name: 'Contacts', url: 'https://contacts.google.com/', aliases: ['contatti', 'rubrica'] },
    { name: 'Play Store', url: 'https://play.google.com/', aliases: ['play', 'store', 'googleplay', 'appstore'] },
    { name: 'News', url: 'https://news.google.com/', aliases: ['notizie', 'googlenews'] },
    { name: 'Tasks', url: 'https://tasks.google.com/', aliases: ['task', 'attivita', 'todo'] },
    { name: 'Earth', url: 'https://earth.google.com/', aliases: ['googleearth'] },
    { name: 'Forms', url: 'https://forms.google.com/', aliases: ['form', 'moduli', 'googleforms', 'questionari'] },
    { name: 'Chrome Web Store', url: 'https://chromewebstore.google.com/', aliases: ['webstore', 'chromestore', 'estensioni', 'extensions'] }
];

// Normalizza una stringa per il confronto (minuscole, senza accenti/spazi/punteggiatura)
function normalizeAppKey(str) {
    return (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

// Cerca un'app Google tra le 20 integrate: esatto → inizio → contiene
function findGoogleApp(input) {
    const key = normalizeAppKey(input);
    if (!key) return null;

    for (const app of GOOGLE_APPS) {
        if (normalizeAppKey(app.name) === key) return app;
        if (app.aliases.some(alias => normalizeAppKey(alias) === key)) return app;
    }

    if (key.length >= 2) {
        for (const app of GOOGLE_APPS) {
            if (normalizeAppKey(app.name).startsWith(key)) return app;
            if (app.aliases.some(alias => normalizeAppKey(alias).startsWith(key))) return app;
        }
        for (const app of GOOGLE_APPS) {
            if (normalizeAppKey(app.name).includes(key)) return app;
            if (app.aliases.some(alias => normalizeAppKey(alias).includes(key))) return app;
        }
    }

    return null;
}

// Storage: chrome.storage dentro l'estensione, fallback per anteprima/apertura diretta
const storageArea = (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync)
    ? chrome.storage.sync
    : {
        get: (keys, callback) => callback({}),
        set: (items, callback) => { if (callback) callback(); }
    };

document.addEventListener('DOMContentLoaded', () => {
    let currentEngine = 'google';

    // Riferimenti elementi UI
    const clockEl = document.getElementById('lumen-clock');
    const greetingEl = document.getElementById('lumen-greeting');
    const searchInput = document.getElementById('lumen-search-input');
    const searchSubmit = document.getElementById('lumen-search-submit');
    const favoritesGrid = document.getElementById('lumen-favorites-grid');
    const highlightEl = document.getElementById('lumen-input-highlight');
    const gappsHint = document.getElementById('gapps-hint');
    const gappsHintCount = document.getElementById('gapps-hint-count');
    const gappsListPanel = document.getElementById('gapps-list-panel');
    const gappsListTitle = document.getElementById('gapps-list-title');
    const gappsListChips = document.getElementById('gapps-list-chips');
    const searchBar = document.getElementById('lumen-search-bar');
    const toastEl = document.getElementById('lumen-toast');

    // Modal impostazioni
    const modal = document.getElementById('lumen-settings-modal');
    const toggleSettingsBtn = document.getElementById('lumen-toggle-settings');
    const closeSettingsBtn = document.getElementById('close-settings');
    const saveSettingsBtn = document.getElementById('save-settings');

    const nameInput = document.getElementById('user-name');
    const sitesTextarea = document.getElementById('favorite-sites');
    const themeButtons = document.querySelectorAll('.theme-btn');

    // 1. Orologio in tempo reale
    function updateClock() {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString();
    }
    setInterval(updateClock, 1000);
    updateClock();

    // 2. Carica impostazioni salvate
    function loadSettings() {
        storageArea.get(['userName', 'selectedTheme', 'favoriteSites'], (data) => {
            const name = data.userName || 'Amico';
            const hour = new Date().getHours();
            let timeGreeting = 'Buongiorno';
            if (hour >= 13 && hour < 18) timeGreeting = 'Buon pomeriggio';
            else if (hour >= 18) timeGreeting = 'Buonasera';

            greetingEl.textContent = `${timeGreeting}, ${name}! ☀️`;
            nameInput.value = data.userName || '';

            // Applica tema
            const theme = data.selectedTheme || 'light';
            document.body.className = `theme-${theme}`;
            themeButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === theme);
            });

            // Siti preferiti di default se vuoti
            const defaultSites = "Google | https://google.com\nGitHub | https://github.com\nYouTube | https://youtube.com\nReddit | https://reddit.com";
            sitesTextarea.value = data.favoriteSites !== undefined ? data.favoriteSites : defaultSites;

            renderFavorites(sitesTextarea.value);
        });
    }

    // 3. Renderizza i preferiti nella griglia
    function renderFavorites(text) {
        favoritesGrid.innerHTML = '';
        const lines = text.split('\n');
        lines.forEach(line => {
            if (!line.trim()) return;
            const parts = line.split('|');
            const title = parts[0] ? parts[0].trim() : 'Sito';
            const url = parts[1] ? parts[1].trim() : (parts[0] ? parts[0].trim() : '#');

            const finalUrl = url.startsWith('http') ? url : `https://${url}`;

            const tile = document.createElement('a');
            tile.className = 'lumen-tile';
            tile.href = finalUrl;
            tile.textContent = title;
            favoritesGrid.appendChild(tile);
        });
    }

    // 4. Motori di ricerca (nomi completi)
    document.querySelectorAll('.search-selector-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.search-selector-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentEngine = e.target.dataset.engine;
        });
    });

    // --- Evidenziazione dei comandi gapps e /yt nella barra ---
    // "gapps" (senza slash) e "/yt" vengono evidenziati mentre l'utente li scrive.
    const COMMAND_HIGHLIGHT_RE = /^(\/?gapps|\/yt)(?=\s|$)/i;

    function syncHighlightScroll() {
        highlightEl.style.transform = `translateX(${-searchInput.scrollLeft}px)`;
    }

    function updateInputHighlight() {
        const value = searchInput.value;
        const match = value.match(COMMAND_HIGHLIGHT_RE);

        highlightEl.textContent = '';
        if (match) {
            const keyword = document.createElement('span');
            keyword.className = 'gapps-keyword';
            keyword.textContent = match[1];
            highlightEl.appendChild(keyword);
            highlightEl.appendChild(document.createTextNode(value.slice(match[1].length)));
        } else {
            highlightEl.textContent = value;
        }
        syncHighlightScroll();

        const active = !!match;
        searchBar.classList.toggle('gapps-active', active);
        // Il suggerimento gapps appare solo per il comando gapps
        const gappsMode = active && /gapps/i.test(match[1]);
        gappsHint.classList.toggle('hidden', !gappsMode);
        // La lista si chiude non appena l'utente modifica il testo
        gappsListPanel.classList.add('hidden');
    }

    searchInput.addEventListener('input', updateInputHighlight);
    searchInput.addEventListener('scroll', syncHighlightScroll);
    updateInputHighlight();
    gappsHintCount.textContent = GOOGLE_APPS.length;

    // --- Toast di notifica ---
    let toastTimer = null;
    function showToast(message) {
        toastEl.textContent = message;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3500);
    }

    // --- Lista delle app Google (gapps --list) ---
    function showGappsList() {
        gappsListTitle.textContent = `App Google disponibili (${GOOGLE_APPS.length})`;
        gappsListChips.innerHTML = '';
        GOOGLE_APPS.forEach(app => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'gapps-chip';
            chip.textContent = app.name;
            chip.title = app.url;
            chip.addEventListener('click', () => navigateTo(app.url));
            gappsListChips.appendChild(chip);
        });
        gappsListPanel.classList.remove('hidden');
    }

    function performSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        // GApps: apri un'app Google — "gapps gmail" (senza slash)
        const gappsMatch = query.match(/^\/?gapps(\s+|$)/i);
        if (gappsMatch) {
            const appRequest = query.slice(gappsMatch[0].length).trim();
            if (!appRequest) {
                showToast('Scrivi il nome di un’app Google, es. “gapps gmail”');
                return;
            }
            if (/^--list$/i.test(appRequest)) {
                showGappsList();
                return;
            }
            const app = findGoogleApp(appRequest);
            if (app) {
                navigateTo(app.url);
            } else {
                showToast(`App non trovata: “${appRequest}”. Prova: gmail, drive, youtube, maps…`);
            }
            return;
        }

        // /yt: cerca su YouTube — "/yt gatto buffo"
        if (/^\/yt(\s+|$)/i.test(query)) {
            const ytQuery = query.replace(/^\/yt\s*/i, '').trim();
            navigateTo(ytQuery
                ? `https://www.youtube.com/results?search_query=${encodeURIComponent(ytQuery)}`
                : 'https://www.youtube.com/');
            return;
        }

        let searchUrl = '';
        if (query.startsWith('http://') || query.startsWith('https://') || query.includes('.')) {
            searchUrl = query.startsWith('http') ? query : `https://${query}`;
        } else {
            if (currentEngine === 'bing') {
                searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
            } else if (currentEngine === 'duckduckgo') {
                searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
            } else if (currentEngine === 'brave') {
                searchUrl = `https://search.brave.com/search?q=${encodeURIComponent(query)}`;
            } else {
                searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            }
        }
        navigateTo(searchUrl);
    }

    searchSubmit.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

        // 5. Gestione Modale Impostazioni
        toggleSettingsBtn.addEventListener('click', () => modal.classList.remove('hidden'));
        closeSettingsBtn.addEventListener('click', () => modal.classList.add('hidden'));

        themeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                themeButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                document.body.className = `theme-${e.target.dataset.theme}`;
            });
        });

        saveSettingsBtn.addEventListener('click', () => {
            const activeThemeBtn = document.querySelector('.theme-btn.active');
            const selectedTheme = activeThemeBtn ? activeThemeBtn.dataset.theme : 'light';

            storageArea.set({
                userName: nameInput.value.trim(),
                                    selectedTheme: selectedTheme,
                                    favoriteSites: sitesTextarea.value
            }, () => {
                modal.classList.add('hidden');
                loadSettings();
            });
        });

        loadSettings();
});
