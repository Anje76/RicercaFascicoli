// Database locale con supporto ai codici 21, 44, 45
let fascicoli = JSON.parse(localStorage.getItem('fascicoli_db')) || [
  { id: 1, anno: "2026", numero: "452", stato: "21", operatore: "Michele" },
  { id: 2, anno: "2025", numero: "105", stato: "44", operatore: "Angelo" },
  { id: 3, anno: "2024", numero: "88", stato: "45", operatore: "Michele" },
  { id: 4, anno: "2023", numero: "12", stato: "21", operatore: "Angelo" }
];

// Mappatura Codici -> Denominazione Estesa
function getStatoFormatted(codice) {
  const cod = String(codice).trim();
  if (cod === '21' || cod.toLowerCase().includes('noti')) return '21 - NOTI';
  if (cod === '44' || cod.toLowerCase().includes('ignoti')) return '44 - IGNOTI';
  if (cod === '45' || cod.toLowerCase().includes('fncr') || cod.toLowerCase().includes('f.n.c.r')) return '45 - F.N.C.R.';
  return `${cod} - NOTI`;
}

// Convertitore da testo/valore al codice standard (21, 44, 45)
function parseStatoCode(val) {
  const str = String(val).toLowerCase().trim();
  if (str.includes('44') || str.includes('ignot')) return '44';
  if (str.includes('45') || str.includes('fncr') || str.includes('f.n.c.r')) return '45';
  return '21'; // Default NOTI
}

// Calcolo dinamico dello sfondo scheda in base al tipo e all'anno
function getCardBgClass(statoCode, anno) {
  const code = parseStatoCode(statoCode);
  
  // 1. IGNOTI (44) -> Sfondo azzurro
  if (code === '44') {
    return 'bg-sky-100 border-sky-300 text-sky-950 shadow-xs';
  }
  
  // 2. F.N.C.R. (45) -> Sfondo rosso
  if (code === '45') {
    return 'bg-red-100 border-red-300 text-red-950 shadow-xs';
  }
  
  // 3. NOTI (21) -> Colore dipendente dall'anno
  if (code === '21') {
    const a = String(anno).trim();
    if (a === '2026') return 'bg-emerald-100 border-emerald-300 text-emerald-950 shadow-xs'; // Verde chiaro
    if (a === '2025') return 'bg-amber-100 border-amber-300 text-amber-950 shadow-xs';    // Giallo
    if (a === '2024') return 'bg-purple-100 border-purple-300 text-purple-950 shadow-xs';  // Viola chiaro
    return 'bg-white border-slate-200 text-slate-800 shadow-xs';                            // Altri anni -> Bianco
  }

  return 'bg-white border-slate-200 text-slate-800 shadow-xs';
}

// Inizializzazione Riconoscimento Vocale
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'it-IT';
  recognition.continuous = false;
  recognition.interimResults = false;
}

function startSpeech(mode) {
  if (!recognition) {
    alert("Riconoscimento vocale non supportato. Usa Chrome o Safari.");
    return;
  }
  
  const statusBadge = document.getElementById('status-badge');
  const transcriptOutput = document.getElementById('transcript-output');
  
  statusBadge.textContent = "Ascolto...";
  statusBadge.className = "text-xs bg-red-500 px-2.5 py-1 rounded-full text-white animate-pulse font-medium";
  transcriptOutput.textContent = "Parla ora...";

  recognition.start();

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    transcriptOutput.textContent = `"${text}"`;
    
    statusBadge.textContent = "Elaborazione...";
    statusBadge.className = "text-xs bg-amber-500 px-2.5 py-1 rounded-full text-white font-medium";

    if (mode === 'add') parseAndAdd(text);
    else if (mode === 'search') parseAndSearch(text);
  };

  recognition.onerror = () => {
    statusBadge.textContent = "Errore";
    statusBadge.className = "text-xs bg-slate-500 px-2.5 py-1 rounded-full text-white font-medium";
    transcriptOutput.textContent = "Riconoscimento fallito. Riprova.";
  };

  recognition.onend = () => {
    if (statusBadge.textContent === "Ascolto...") {
      statusBadge.textContent = "Pronto";
      statusBadge.className = "text-xs bg-indigo-500 px-2.5 py-1 rounded-full text-white font-medium";
    }
  };
}

// Parsing Inserimento Vocale
function parseAndAdd(text) {
  const textLower = text.toLowerCase();
  
  const numMatch = textLower.match(/(?:fascicolo|numero|n°|n)?\s*(\d+)/i);
  const annoMatch = textLower.match(/(20\d{2})/);
  
  const numero = numMatch ? numMatch[1] : null;
  const anno = annoMatch ? annoMatch[1] : new Date().getFullYear().toString();
  
  let stato = '21';
  if (textLower.includes('ignot') || textLower.includes('44')) stato = '44';
  else if (textLower.includes('fncr') || textLower.includes('f.n.c.r') || textLower.includes('45')) stato = '45';

  const operatore = textLower.includes('angelo') ? 'Angelo' : 'Michele';

  if (!numero) {
    speak("Non ho capito il numero del fascicolo. Riprova.");
    return;
  }

  const nuovoFascicolo = { id: Date.now(), anno, numero, stato, operatore };
  fascicoli.push(nuovoFascicolo);
  saveData();
  renderList();
  
  speak(`Registrato fascicolo ${anno} ${numero} ${getStatoFormatted(stato)} per ${operatore}`);
  setTimeout(() => highlightCard(nuovoFascicolo.id), 300);
}

// Ricerca Vocale
function parseAndSearch(text) {
  const numMatch = text.match(/\d+/);
  if (!numMatch) {
    speak("Specifica un numero di fascicolo.");
    return;
  }

  const numCercato = numMatch[0];
  const trovati = fascicoli.filter(f => f.numero === numCercato);

  if (trovati.length > 0) {
    const f = trovati[0];
    speak(`Trovato! Fascicolo ${f.anno} ${f.numero} ${getStatoFormatted(f.stato)}, operatore ${f.operatore}.`);
    renderList();
    setTimeout(() => highlightCard(f.id), 200);
  } else {
    speak(`Nessun fascicolo numero ${numCercato} trovato.`);
  }
}

function highlightCard(id) {
  const card = document.getElementById(`card-${id}`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('highlight-found');
    void card.offsetWidth; 
    card.classList.add('highlight-found');
  }
}

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

// --- IMPORTAZIONE E PARSING EXCEL (.XLS / .XLSX) ---

function importExcelFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    processExcelWorkbook(data);
  };
  reader.readAsArrayBuffer(file);
}

async function importExcelFromRoot() {
  const statusBadge = document.getElementById('status-badge');
  statusBadge.textContent = "Download Excel...";
  statusBadge.className = "text-xs bg-amber-500 px-2.5 py-1 rounded-full text-white font-medium";

  try {
    let response = await fetch('./dati.xls');
    if (!response.ok) response = await fetch('./dati.xlsx');

    if (!response.ok) {
      throw new Error("File dati.xls o dati.xlsx non trovato nella cartella root.");
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    processExcelWorkbook(data);
    
  } catch (err) {
    alert("Impossibile caricare il file dalla root: " + err.message);
    statusBadge.textContent = "Pronto";
    statusBadge.className = "text-xs bg-indigo-500 px-2.5 py-1 rounded-full text-white font-medium";
  }
}

// Elaborazione sequenziale righe Excel: Colonna 0 (ANNO), 1 (NUMERO), 2 (STATO/CODICE 21/44/45), 3 (OPERATORE)
function processExcelWorkbook(data) {
  try {
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Converte in matrice 2D per mantenere rigorosamente l'ordine delle colonne
    const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonRows.length === 0) {
      alert("Il file Excel è vuoto.");
      return;
    }

    let nuoviInseriti = 0;

    // Salta la prima riga se contiene l'intestazione
    let startIdx = 0;
    if (jsonRows[0] && String(jsonRows[0][0]).toUpperCase().includes('ANN')) {
      startIdx = 1;
    }

    for (let i = startIdx; i < jsonRows.length; i++) {
      const row = jsonRows[i];
      if (!row || row.length === 0) continue;

      const annoRaw = row[0] !== undefined ? String(row[0]).trim() : '';
      const numeroRaw = row[1] !== undefined ? String(row[1]).trim() : '';
      const statoRaw = row[2] !== undefined ? String(row[2]).trim() : '';
      const operatoreRaw = row[3] !== undefined ? String(row[3]).trim() : '';

      if (numeroRaw) {
        const anno = annoRaw || new Date().getFullYear().toString();
        const numero = numeroRaw;
        const stato = parseStatoCode(statoRaw);
        const operatore = operatoreRaw || 'Michele';

        const giaEsistente = fascicoli.some(f => f.numero === numero && f.anno === anno);
        if (!giaEsistente) {
          fascicoli.push({
            id: Date.now() + Math.floor(Math.random() * 1000) + i,
            anno,
            numero,
            stato,
            operatore
          });
          nuoviInseriti++;
        }
      }
    }

    saveData();
    renderList();
    
    alert(`Importazione completata! Aggiunti ${nuoviInseriti} nuovi fascicoli.`);
    speak(`Importati ${nuoviInseriti} fascicoli da Excel.`);

  } catch (e) {
    alert("Errore nell'elaborazione del file Excel: " + e.message);
  }
}

// Persistenza Dati
function saveData() {
  localStorage.setItem('fascicoli_db', JSON.stringify(fascicoli));
}

function clearAllData() {
  if (confirm("Vuoi cancellare tutto l'archivio locale?")) {
    fascicoli = [];
    saveData();
    renderList();
  }
}

// --- GESTIONE MODALI E CAMBIO STATI ---
let currentEditingId = null;

function closeModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  currentEditingId = null;
}

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
  if (val === 'back') display.textContent = display.textContent.slice(0, -1);
  else if (val === 'clear') display.textContent = '';
  else if (display.textContent.length < 6) display.textContent += val;
}

function saveNumeroChange() {
  const newNum = document.getElementById('keypad-display').textContent.trim();
  if (!newNum) return alert("Inserisci un numero valido!");
  
  const f = fascicoli.find(x => x.id === currentEditingId);
  if (f) {
    f.numero = newNum;
    saveData();
    renderList();
    closeModal();
    highlightCard(f.id);
  }
}

// Rotazione Stato: 21 (NOTI) -> 44 (IGNOTI) -> 45 (F.N.C.R.)
function cycleStato(id) {
  const f = fascicoli.find(x => x.id === id);
  if (f) {
    if (f.stato === '21') f.stato = '44';
    else if (f.stato === '44') f.stato = '45';
    else f.stato = '21';

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

function deleteFascicolo(id) {
  if (confirm("Vuoi eliminare questo fascicolo?")) {
    fascicoli = fascicoli.filter(x => x.id !== id);
    saveData();
    renderList();
  }
}

// Rendering lista fascicoli con sequenza "Anno / Numero / Tipo" e sfondo colorato
function renderList() {
  const container = document.getElementById('years-container');
  container.innerHTML = '';

  if (fascicoli.length === 0) {
    container.innerHTML = `<div class="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300">
      <i class="fa-regular fa-folder-open text-3xl text-slate-300 mb-2"></i>
      <p class="text-slate-400 text-sm">Archivio vuoto.<br>Usa il pulsante "Aggiungi" o importa un file Excel.</p>
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
        <div id="card-${f.id}" class="p-3.5 rounded-xl border transition-all duration-300 ${getCardBgClass(f.stato, f.anno)}">
          
          <!-- Sequenza Anno / Numero / Tipo e Denominazione -->
          <div class="flex justify-between items-center mb-1.5">
            <div class="font-extrabold text-base tracking-tight flex items-center gap-1.5">
              <span>${f.anno}</span>
              <span class="opacity-40">/</span>
              <span class="text-lg underline underline-offset-2 decoration-2">${f.numero}</span>
              <span class="opacity-40">/</span>
              <span class="text-sm font-bold opacity-90">${getStatoFormatted(f.stato)}</span>
            </div>

            <!-- Pulsanti Modifica Stato ed Eliminazione -->
            <div class="flex items-center gap-1">
              <button onclick="cycleStato(${f.id})" title="Cambia Stato (21/44/45)" class="px-2 py-1 rounded-lg bg-white/80 hover:bg-white border border-black/10 text-xs font-bold active:scale-95 transition-transform shadow-2xs">
                <i class="fa-solid fa-arrows-rotate text-[10px]"></i>
              </button>
              <button onclick="deleteFascicolo(${f.id})" title="Elimina" class="p-1 text-black/40 hover:text-red-600 rounded-md">
                <i class="fa-solid fa-trash-can text-xs"></i>
              </button>
            </div>
          </div>

          <!-- Operatore indicato a parte in formato ridotto -->
          <div class="flex justify-between items-center pt-1.5 border-t border-black/10 text-xs">
            <span class="font-medium text-[11px] opacity-80 flex items-center gap-1">
              <i class="fa-solid fa-user text-[10px] opacity-60"></i> Operatore: <strong class="font-bold opacity-100">${f.operatore}</strong>
            </span>

            <div class="flex items-center gap-2 text-[11px]">
              <button onclick="openEditNumero(${f.id})" class="font-semibold hover:underline flex items-center gap-1 opacity-90">
                <i class="fa-solid fa-pen-to-square text-[10px]"></i> Modifica Num.
              </button>
              <button onclick="toggleOperatore(${f.id})" class="text-[10px] opacity-70 hover:opacity-100 underline">
                (Cambia Op.)
              </button>
            </div>
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

// Inizializzazione
renderList();