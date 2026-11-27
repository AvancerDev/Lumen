// --- FUNZIONI DI BASE ---

// 1. Imposta il tema iniziale e recupera le impostazioni
function applyTheme(themeName) {
    const body = document.body;
    // Rimuove tutti i temi esistenti per resettare
    body.className = body.className.replace(/theme-\w+/g, '');
    // Aggiunge il nuovo tema
    body.classList.add(`theme-${themeName}`);
}

// 2. Genera l'orologio
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeString = `${hours}:${minutes}:${seconds}`;

    // Trova l'elemento clock esistente o crealo
    let clockElement = document.getElementById('lumen-clock');
    if (!clockElement) {
        clockElement = document.createElement('div');
        clockElement.id = 'lumen-clock';
        // Lo inseriamo subito sotto il body, ma questo sarà migliorato nel setup
        document.body.prepend(clockElement);
    }
    clockElement.textContent = timeString;
}

// 3. Genera la barra di ricerca e i selettori
function createSearchBar(userName, favoriteSites) {
    // Creiamo la struttura principale della barra
    const searchBar = document.createElement('div');
    searchBar.id = 'lumen-search-bar';

    // A. Selettori di motore
    const selectorContainer = document.createElement('div');
    selectorContainer.innerHTML = `
    <button class="search-selector-btn active" data-engine="google">G</button>
    <button class="search-selector-btn" data-engine="bing">B</button>
    <button class="search-selector-btn" data-engine="duckduckgo">DDG</button>
    `;

    // B. Input di ricerca
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'lumen-search-input';
    searchInput.placeholder = 'Cerca su Lumen...';

    // C. Pulsante Aggiungi Sito
    const addSiteBtn = document.createElement('button');
    addSiteBtn.id = 'lumen-add-site-btn';
    addSiteBtn.innerHTML = '+';

    // Assemblaggio
    searchBar.appendChild(selectorContainer);
    searchBar.appendChild(searchInput);
    searchBar.appendChild(addSiteBtn);

    // --- Aggiungi Event Listener alla Barra ---

    // Gestisce il click sui selettori di motore
    selectorContainer.querySelectorAll('.search-selector-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            selectorContainer.querySelectorAll('.search-selector-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            // Qui potresti aggiungere logica per salvare il motore preferito nel storage
            console.log(`Motore di ricerca selezionato: ${this.dataset.engine}`);
        });
    });

    // Gestisce l'aggiunta di un nuovo sito
    addSiteBtn.addEventListener('click', () => {
        const newSite = prompt("Inserisci l'URL completo del sito da aggiungere (es. facebook.com):");
        if (newSite) {
            // Qui dovresti usare chrome.storage.local.set per salvare il nuovo sito
            alert(`Aggiunto sito: ${newSite}. (Ricorda di salvarlo dal Popup!)`);
            // Potresti aggiornare anche l'input di siti preferiti qui
        }
    });

    // Aggiungiamo la barra al body (assicuriamoci che sia prima dell'orologio o sopra)
    document.body.prepend(searchBar);
}


// --- FUNZIONE PRINCIPALE DI INIEZIONE ---
async function initializeLumen() {
    // 1. Recupera tutte le impostazioni salvate dal Background Script (tramite chrome.storage)
    const settings = await chrome.storage.local.get(['userName', 'selectedTheme', 'favoriteSites']);

    const userName = settings.userName || 'Amico'; // Default se non trovato
    const themeName = settings.selectedTheme || 'light'; // Default
    const favoriteSites = settings.favoriteSites || 'youtube.com\ngithub.com';

    // 2. Applica il tema
    applyTheme(themeName);

    // 3. Crea la barra di ricerca e aggiunge gli event listener
    createSearchBar(userName, favoriteSites);

    // 4. Aggiorna l'orologio e impostiamo l'intervallo
    updateClock();
    setInterval(updateClock, 1000);

    // 5. Mostra il saluto (creando l'elemento greeting se non esiste)
    let greetingElement = document.getElementById('lumen-greeting');
    if (!greetingElement) {
        greetingElement = document.createElement('div');
        greetingElement.id = 'lumen-greeting';
        document.body.prepend(greetingElement); // Mettilo sopra tutto
    }
    greetingElement.textContent = `Buongiorno, ${userName}! ☀️`;
}

// Avvia l'iniezione di Lumen!
initializeLumen();
