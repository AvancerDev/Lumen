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

// --- Bangs: catalogo locale (kagisearch/bangs, MIT) ---
let bangsPromise = null;

function ensureBangs() {
    if (!bangsPromise) {
        bangsPromise = (typeof fetch === 'function' ? fetch('bangs.json') : Promise.reject(new Error('fetch non disponibile')))
            .then(res => res.json())
            .then(list => {
                const byTrigger = new Map();
                for (const bang of list) {
                    for (const trg of [bang.t, ...(bang.ts || [])]) {
                        if (!byTrigger.has(trg)) byTrigger.set(trg, bang);
                    }
                }
                return { list, byTrigger };
            })
            .catch(() => null);
    }
    return bangsPromise;
}

const BANG_DEFAULT_FLAGS = ['open_base_path', 'open_snap_domain', 'url_encode_placeholder', 'url_encode_space_to_plus'];

// Risolve un bang in un URL: placeholder {{{s}}}, flag fmt, template relativi e regex $1/$2
function resolveBangUrl(bang, rawQuery) {
    const query = (rawQuery || '').trim();
    const flags = new Set(Array.isArray(bang.fmt) ? bang.fmt : BANG_DEFAULT_FLAGS);

    // Bang senza query: apri la home (flag open_snap_domain / open_base_path)
    if (!query) {
        if (flags.has('open_snap_domain') && bang.ad) return `https://${bang.ad}/`;
        if (flags.has('open_base_path')) return `https://${bang.d}/`;
    }

    const encode = (value) => {
        if (flags.has('url_encode_placeholder')) {
            let out = encodeURIComponent(value);
            if (flags.has('url_encode_space_to_plus')) out = out.replace(/%20/g, '+');
            return out;
        }
        if (flags.has('url_encode_space_to_plus')) return value.replace(/ /g, '+');
        return value;
    };

    let url;
    if (bang.x) {
        // Bang con regex: $1, $2... sono i gruppi catturati dalla query
        const match = query.match(new RegExp(bang.x));
        if (match) {
            const groups = match.slice(1);
            url = bang.u.replace(/\$(\d+)/g, (all, n) => encode(groups[Number(n) - 1] ?? ''));
        } else {
            url = bang.u.replace(/\$(\d+)/g, (all, n) => (n === '1' ? encode(query) : ''));
        }
    } else {
        url = bang.u.split('{{{s}}}').join(encode(query));
    }

    // Template relativi (bangs interni Kagi): risolve sul dominio dichiarato
    if (url.startsWith('/')) url = `https://${bang.d}${url}`;
    return url;
}

// Primi N bang che combaciano con il token: esatto → prefisso trigger → nome sito
function suggestBangs(cat, token, limit = 8) {
    const t = token.toLowerCase();
    const exact = [], prefixed = [], byName = [];
    for (const [trg, bang] of cat.byTrigger) {
        if (trg === t) exact.push({ trigger: trg, bang });
        else if (trg.startsWith(t)) prefixed.push({ trigger: trg, bang });
        else if (bang.s.toLowerCase().includes(t)) byName.push({ trigger: trg, bang });
    }
    const byLen = (a, b) => a.trigger.length - b.trigger.length || a.trigger.localeCompare(b.trigger);
    prefixed.sort(byLen);
    byName.sort(byLen);

    const seen = new Set();
    const out = [];
    for (const item of [...exact, ...prefixed, ...byName]) {
        if (seen.has(item.bang)) continue;
        seen.add(item.bang);
        out.push(item);
        if (out.length >= limit) break;
    }
    return out;
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
    const bangHint = document.getElementById('bang-hint');
    const bangSuggestions = document.getElementById('bang-suggestions');
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

    async function updateInputHighlight() {
        const value = searchInput.value;
        const cmdMatch = value.match(COMMAND_HIGHLIGHT_RE);
        const bangMatch = value.match(/^!(\S*)(?=\s|$)/);
        const keyword = cmdMatch ? cmdMatch[1] : (bangMatch ? bangMatch[0] : '');

        highlightEl.textContent = '';
        if (keyword) {
            const span = document.createElement('span');
            span.className = 'gapps-keyword';
            span.textContent = keyword;
            highlightEl.appendChild(span);
            highlightEl.appendChild(document.createTextNode(value.slice(keyword.length)));
        } else {
            highlightEl.textContent = value;
        }
        syncHighlightScroll();

        const active = !!(cmdMatch || bangMatch);
        searchBar.classList.toggle('gapps-active', active);

        // Il suggerimento gapps appare solo per il comando gapps
        const gappsMode = !!cmdMatch && /gapps/i.test(cmdMatch[1]);
        gappsHint.classList.toggle('hidden', !gappsMode);
        // La lista gapps si chiude non appena l'utente modifica il testo
        gappsListPanel.classList.add('hidden');

        // Stato bang: si nasconde tutto, poi si mostra il caso giusto
        bangHint.classList.add('hidden');
        bangSuggestions.classList.add('hidden');
        if (!bangMatch) return;

        const token = bangMatch[1].toLowerCase();
        const cat = await ensureBangs();
        if (searchInput.value !== value) return; // digitazione superata
        if (!cat) {
            bangHint.textContent = 'Catalogo bangs non disponibile.';
            bangHint.classList.remove('hidden');
            return;
        }
        if (!token) {
            bangHint.innerHTML = `💡 Scrivi un bang — es. <b>!gh</b>, <b>!w</b>, <b>!yt</b> (${cat.byTrigger.size.toLocaleString('it-IT')} trigger disponibili)`;
            bangHint.classList.remove('hidden');
            return;
        }
        const typedQuery = /\s/.test(value.slice(bangMatch[0].length));
        const exact = cat.byTrigger.get(token);
        if (exact && typedQuery) {
            bangHint.innerHTML = `🔍 <b>${escapeHtml(exact.s)}</b> — premi Invio per aprire`;
            bangHint.classList.remove('hidden');
            return;
        }
        const items = suggestBangs(cat, token, 8);
        if (items.length) {
            renderBangSuggestions(items);
        } else {
            bangHint.textContent = `Nessun bang per “!${token}” — prova un altro trigger`;
            bangHint.classList.remove('hidden');
        }
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

    // --- Suggerimenti bang ---
    function renderBangSuggestions(items) {
        bangSuggestions.innerHTML = '';
        for (const { trigger, bang } of items) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'bang-suggestion';

            const trg = document.createElement('span');
            trg.className = 'bang-sug-trigger';
            trg.textContent = `!${trigger}`;

            const site = document.createElement('span');
            site.className = 'bang-sug-site';
            site.textContent = bang.s;

            const domain = document.createElement('span');
            domain.className = 'bang-sug-domain';
            domain.textContent = bang.d;

            btn.append(trg, site, domain);
            btn.addEventListener('click', () => executeBang(bang));
            bangSuggestions.appendChild(btn);
        }
        bangSuggestions.classList.remove('hidden');
    }

    function executeBang(bang) {
        const value = searchInput.value;
        const m = value.match(/^!(\S*)(?:\s+|$)/);
        const rest = m ? value.slice(m[0].length).trim() : '';
        navigateTo(resolveBangUrl(bang, rest));
    }

    async function performSearch() {
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

        // Bangs: "!gh arena" — catalogo locale kagisearch/bangs
        const bangMatch = query.match(/^!(\S*)(?:\s+|$)/);
        if (bangMatch) {
            const token = bangMatch[1].toLowerCase();
            const rest = query.slice(bangMatch[0].length).trim();
            const cat = await ensureBangs();
            if (!cat) {
                showToast('Catalogo bangs non disponibile.');
                return;
            }
            const bang = cat.byTrigger.get(token);
            if (bang) {
                navigateTo(resolveBangUrl(bang, rest));
            } else {
                const near = suggestBangs(cat, token, 3);
                showToast(near.length
                    ? `Bang “!${token}” sconosciuto — forse: ${near.map(n => '!' + n.trigger).join(', ')}`
                    : `Bang “!${token}” sconosciuto.`);
            }
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
