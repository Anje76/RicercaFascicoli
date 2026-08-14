// Database locale sincronizzato con LocalStorage
let fascicoli = JSON.parse(localStorage.getItem('fascicoli_db')) || [
  { id: 1, numero: "452", anno: "2026", stato: "Noti", operatore: "Michele" },
  { id: 2, numero: "105", anno: "2025", stato: "Ignoti", operatore: "Angelo" },
  { id: 3, numero: "88", anno: "2024", stato: "Noti", operatore: "Michele" }
];

// Inizializzazione Riconoscimento Vocale
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'it-IT';
  recognition.continuous = false;
  recognition.interimResults = false;
}

// Avvio ascolto
function startSpeech(mode) {
  if (!recognition) {
    alert("Riconoscimento vocale non supportato sul tuo browser. Usa Chrome o Safari.");
    return;
  }
  
  const statusBadge = document.getElementById('status-badge');
  const transcriptOutput = document.getElementById('transcript-output');
  
  statusBadge.textContent = "Ascolto in corso...";
  statusBadge.className = "text-xs bg-red-500 px-2.5 py-1 rounded-full text-white animate-pulse font-medium";
  transcriptOutput.textContent = "Parla ora...";

  recognition.start();

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    transcriptOutput.textContent = `"${text}"`;
    
    statusBadge.textContent = "Elaborazione...";
    statusBadge.className = "text-xs bg-amber-500 px-2.5 py-1 rounded-full text-white font-medium";

    if (mode === 'add') {
      parseAndAdd(text);
    } else if (mode === 'search') {
      parseAndSearch(text);
    }
  };

  recognition.onerror = () => {
    statusBadge.textContent = "Errore";
    statusBadge.className = "text-xs bg-slate-500 px-2.5 py-1 rounded-full text-white font-medium";
    transcriptOutput.textContent = "Riconoscimento non riuscito. Riprova.";
  };

  recognition.onend = () => {
    if (statusBadge.textContent === "Ascolto in corso...") {
      statusBadge.textContent = "Pronto";
      statusBadge.className = "text-xs bg-indigo-500 px-2.5 py-1 rounded-full text-white font-medium";
    }
  };
}

// Estrazione Dati per Inserimento Vocale
function parseAndAdd(text) {
  const textLower = text.toLowerCase();
  
  const numMatch = textLower.match(/(?:fascicolo|numero|n°|n)?\s*(\d+)/i);
  const annoMatch = textLower.match(/(20\d{2})/);
  
  const numero = numMatch ? numMatch[1] : null;
  const anno = annoMatch ? annoMatch[1] : new Date().getFullYear().toString();
  
  const stato = textLower.includes('ignot') ? 'Ignoti' : 'Noti';
  const operatore = textLower.includes('angelo') ? 'Angelo' : 'Michele';

  if (!numero) {
    speak("Non ho capito il numero del fascicolo. Riprova.");
    return;
  }

  const nuovoFascicolo = { id: Date.now(), numero, anno, stato, operatore };
  fascicoli.push(nuovoFascicolo);
  saveData();
  renderList();
  
  speak(`Registrato fascicolo ${numero} del ${anno} per ${operatore}`);
  
  // Evidenzia visivamente il fascicolo appena inserito
  setTimeout(() => highlightCard(nuovoFascicolo.id), 300);
}

// Estrazione Dati e Ricerca Vocale con Evidenziazione Lampeggiante
function parseAndSearch(text) {
  const textLower = text.toLowerCase();
  const numMatch = textLower.match(/\d+/);
  
  if (!numMatch) {
    speak("Specifica il numero di fascicolo da cercare.");
    return;
  }

  const numCercato = numMatch[0];
  const trovati = fascicoli.filter(f => f.numero === numCercato);

  if (trovati.length > 0) {
    const f = trovati[0];
    speak(`Trovato! Fascicolo ${f.numero} del ${f.anno}, stato ${f.stato}, operatore ${f.operatore}.`);
    
    renderList();
    setTimeout(() => highlightCard(f.id), 200);
  } else {
    speak(`Nessun fascicolo numero ${numCercato} trovato.`);
  }
}

// Funzione per animare e far lampeggiare il fascicolo trovato
function highlightCard(id) {
  const card = document.getElementById(`card-${id}`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('highlight-found');
    // Forziamo il reflow per riattivare l'animazione
    void card.offsetWidth; 
    card.classList.add('highlight-found');
  }
}

// Sintesi Vocale (Text-To-Speech)
function speak(phrase) {
  const statusBadge = document.getElementById('status-badge');
  statusBadge.textContent = "Pronto";
  statusBadge.className = "text-xs bg-indigo-500 px-2.5 py-1 rounded-full text-white font-medium";

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = 'it-IT';
    window.speechSynthesis.speak(utterance);
  }
}

// Persistenza LocalStorage
function saveData() {
  localStorage.setItem('fascicoli_db', JSON.stringify(fascicoli));
}

function clearAllData() {
  if (confirm("Vuoi davvero cancellare l'intero archivio?")) {
    fascicoli = [];
    saveData();
    renderList();
  }
}

// --- LOGICA MODALE E CORREZIONI TOUCH SCREEN ---
let currentEditingId = null;

function closeModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  currentEditingId = null;
}

// 1. Modifica Numero tramite Tastierino Numerico Soft
function openEditNumero(id) {
  currentEditingId = id;
  const f = fascicoli.find(x => x.id === id);
  if (!f) return;

  document.getElementById('modal-title').textContent = `Modifica Numero (Attuale: ${f.numero})`;
  
  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <div class="space-y-4">
      <div class="bg-slate-100 p-3 rounded-xl text-center">
        <span id="keypad-display" class="text-3xl font-extrabold tracking-widest text-indigo-700">${f.numero}</span>
      </div>
      
      <!-- Tastierino Numerico Touch -->
      <div class="grid grid-cols-3 gap-2">
        ${[1,2,3,4,5,6,7,8,9].map(n => `
          <button onclick="keypadPress('${n}')" class="py-3 bg-slate-100 active:bg-indigo-100 text-slate-800 text-xl font-bold rounded-xl shadow-sm border border-slate-200">${n}</button>
        `).join('')}
        <button onclick="keypadPress('back')" class="py-3 bg-red-50 text-red-600 active:bg-red-100 text-lg font-bold rounded-xl shadow-sm border border-red-100"><i class="fa-solid fa-delete-left"></i></button>
        <button onclick="keypadPress('0')" class="py-3 bg-slate-100 active:bg-indigo-100 text-slate-800 text-xl font-bold rounded-xl shadow-sm border border-slate-200">0</button>
        <button onclick="keypadPress('clear')" class="py-3 bg-amber-50 text-amber-600 active:bg-amber-100 text-sm font-bold rounded-xl shadow-sm border border-amber-100">C</button>
      </div>

      <button onclick="saveNumeroChange()" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md">Conferma Numero</button>
    </div>
  `;

  document.getElementById('edit-modal').classList.remove('hidden');
}

function keypadPress(val) {
  const display = document.getElementById('keypad-display');
  if (val === 'back') {
    display.textContent = display.textContent.slice(0, -1);
  } else if (val === 'clear') {
    display.textContent = '';
  } else {
    if (display.textContent.length < 6) {
      display.textContent += val;
    }
  }
}

function saveNumeroChange() {
  const newNum = document.getElementById('keypad-display').textContent.trim();
  if (!newNum) {
    alert("Inserisci un numero valido!");
    return;
  }
  const f = fascicoli.find(x => x.id === currentEditingId);
  if (f) {
    f.numero = newNum;
    saveData();
    renderList();
    closeModal();
    highlightCard(f.id);
  }
}

// 2. Modifica Anno tramite Selezione Rapida (Pillole Anni fino al 2020)
function openEditAnno(id) {
  currentEditingId = id;
  const f = fascicoli.find(x => x.id === id);
  if (!f) return;

  const currentYear = new Date().getFullYear();
  const anniDisponibili = [];
  for (let y = currentYear + 1; y >= 2020; y--) {
    anniDisponibili.push(y.toString());
  }

  document.getElementById('modal-title').textContent = "Seleziona Anno";
  
  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <div class="space-y-3">
      <p class="text-xs text-slate-500">Tocca l'anno desiderato per il fascicolo n° <strong>${f.numero}</strong>:</p>
      <div class="grid grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1">
        ${anniDisponibili.map(a => `
          <button onclick="selectAnno('${a}')" class="py-2.5 px-3 rounded-xl font-bold text-sm border ${a === f.anno ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-700 border-slate-200 active:bg-indigo-50'}">
            ${a} ${a === currentYear.toString() ? '<span class="text-[10px] font-normal block opacity-80">(Corrente)</span>' : ''}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('edit-modal').classList.remove('hidden');
}

function selectAnno(nuovoAnno) {
  const f = fascicoli.find(x => x.id === currentEditingId);
  if (f) {
    f.anno = nuovoAnno;
    saveData();
    renderList();
    closeModal();
    highlightCard(f.id);
  }
}

// 3. Cambio Rapido Alternativo a 1 Tocco (Stato / Operatore)
function toggleStato(id) {
  const f = fascicoli.find(x => x.id === id);
  if (f) {
    f.stato = f.stato === 'Noti' ? 'Ignoti' : 'Noti';
    saveData();
    renderList();
    highlightCard(f.id);
  }
}

function toggleOperatore(id) {
  const f = fascicoli.find(x => x.id === id);
  if (f) {
    f.operatore = f.operatore === 'Michele' ? 'Angelo' : 'Michele';
    saveData();
    renderList();
    highlightCard(f.id);
  }
}

// 4. Eliminazione Singolo Fascicolo
function deleteFascicolo(id) {
  if (confirm("Vuoi eliminare questo fascicolo?")) {
    fascicoli = fascicoli.filter(x => x.id !== id);
    saveData();
    renderList();
  }
}

// Rendering UI mobile divisa per Anno
function renderList() {
  const container = document.getElementById('years-container');
  container.innerHTML = '';

  if (fascicoli.length === 0) {
    container.innerHTML = `<div class="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300">
      <i class="fa-regular fa-folder-open text-3xl text-slate-300 mb-2"></i>
      <p class="text-slate-400 text-sm">Archivio vuoto.<br>Usa il pulsante "Aggiungi" per registrare un fascicolo.</p>
    </div>`;
    return;
  }

  const grouped = {};
  fascicoli.forEach(f => {
    if (!grouped[f.anno]) grouped[f.anno] = [];
    grouped[f.anno].push(f);
  });

  const anniOrdinati = Object.keys(grouped).sort((a, b) => b - a);

  anniOrdinati.forEach(anno => {
    const groupEl = document.createElement('div');
    groupEl.className = 'bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden';
    
    const itemsHtml = grouped[anno]
      .sort((a, b) => Number(a.numero) - Number(b.numero))
      .map(f => `
        <div id="card-${f.id}" class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 transition-all duration-300">
          
          <div class="flex justify-between items-center mb-2">
            <!-- Tocco su Numero Fascicolo -->
            <button onclick="openEditNumero(${f.id})" class="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 active:bg-indigo-50 shadow-2xs">
              <span class="text-xs text-slate-400 font-semibold">Fasc. n°</span>
              <span class="font-black text-base text-slate-900">${f.numero}</span>
              <i class="fa-solid fa-pen-to-square text-[11px] text-indigo-500 ml-1"></i>
            </button>

            <!-- Tocco su Anno -->
            <button onclick="openEditAnno(${f.id})" class="text-xs font-semibold bg-slate-200 text-slate-700 px-2 py-1 rounded-md active:bg-slate-300 flex items-center gap-1">
              <span>${f.anno}</span>
              <i class="fa-solid fa-caret-down text-[10px]"></i>
            </button>
          </div>

          <div class="flex justify-between items-center pt-2 border-t border-slate-200/60">
            
            <!-- Voci alternative con cambio rapido a 1 Tocco -->
            <div class="flex gap-2">
              <button onclick="toggleStato(${f.id})" title="Tocca per cambiare stato" class="px-2.5 py-1 text-xs font-bold rounded-lg border flex items-center gap-1 transition-all active:scale-95 ${f.stato === 'Noti' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-amber-100 text-amber-800 border-amber-200'}">
                <span>${f.stato}</span>
                <i class="fa-solid fa-arrows-rotate text-[10px] opacity-60"></i>
              </button>

              <button onclick="toggleOperatore(${f.id})" title="Tocca per cambiare operatore" class="px-2.5 py-1 text-xs font-bold rounded-lg border flex items-center gap-1 transition-all active:scale-95 ${f.operatore === 'Michele' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}">
                <span>${f.operatore}</span>
                <i class="fa-solid fa-arrows-rotate text-[10px] opacity-60"></i>
              </button>
            </div>

            <!-- Pulsante Elimina -->
            <button onclick="deleteFascicolo(${f.id})" class="text-slate-400 hover:text-red-500 p-1 rounded-md">
              <i class="fa-solid fa-trash-can text-sm"></i>
            </button>

          </div>

        </div>
      `).join('');

    groupEl.innerHTML = `
      <div class="bg-slate-100 px-4 py-2.5 border-b border-slate-200 font-extrabold text-slate-700 text-sm flex justify-between items-center">
        <span class="flex items-center gap-1.5"><i class="fa-solid fa-calendar-days text-indigo-500"></i> Anno ${anno}</span>
        <span class="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold">${grouped[anno].length} fascicol${grouped[anno].length === 1 ? 'o' : 'i'}</span>
      </div>
      <div class="p-3 space-y-3">
        ${itemsHtml}
      </div>
    `;
    
    container.appendChild(groupEl);
  });
}

// Inizializzazione al caricamento
renderList();