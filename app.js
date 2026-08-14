// Database locale con supporto ai codici 21, 44, 45
let fascicoli = JSON.parse(localStorage.getItem('fascicoli_db')) || [
  { id: 1, anno: "2026", numero: "1112", stato: "21", operatore: "Angelo" },
  { id: 2, anno: "2026", numero: "452", stato: "21", operatore: "Michele" },
  { id: 3, anno: "2026", numero: "120", stato: "44", operatore: "Michele" },
  { id: 4, anno: "2025", numero: "105", stato: "44", operatore: "Angelo" },
  { id: 5, anno: "2024", numero: "88", stato: "45", operatore: "Michele" }
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

// Restituisce la priorità numerica per l'ordinamento (1: 21, 2: 44, 3: 45)
function getPriorityOrder(statoCode) {
  const code = parseStatoCode(statoCode);
  if (code === '21') return 1;
  if (code === '44') return 2;
  if (code === '45') return 3;
  return 1;
}

// Calcolo dinamico dello sfondo scheda in base al tipo e all'anno
function getCardBgClass(statoCode, anno) {
  const code = parseStatoCode(statoCode);
  
  // 1. IGNOTI (44) -> Sfondo azzurro
  if (code === '44') {
    return 'bg-sky-100 border-sky-300 text-sky-950 shadow-2xs';
  }
  
  // 2. F.N.C.R. (45) -> Sfondo rosso
  if (code === '45') {
    return 'bg-red-100 border-red-300 text-red-950 shadow-2xs';
  }
  
  // 3. NOTI (21) -> Colore dipendente dall'anno
  if (code === '21') {
    const a = String(anno).trim();
    if (a === '2026') return 'bg-emerald-100 border-emerald-300 text-emerald-950 shadow-2xs'; // Verde chiaro
    if (a === '2025') return 'bg-amber-100 border-amber-300 text-amber-950 shadow-2xs';    // Giallo
    if (a === '2024') return 'bg-purple-100 border-purple-300 text-purple-950 shadow-2xs';  // Viola chiaro
    return 'bg-white border-slate-200 text-slate-800 shadow-2xs';                            // Altri anni -> Bianco
  }

  return 'bg-white border-slate-200 text-slate-800 shadow-2xs';
}

// Generatore Badge Operatore Compatto (Angelo: Blu/Cremisi; Michele: Nero/Rosso)
function getOperatoreBadge(operatore) {
  const opClean = String(operatore || '').trim().toLowerCase();
  
  if (opClean.includes('angelo')) {
    return `<span class="inline-block uppercase font-black text-[10px] sm:text-[11px] tracking-wider px-2 py-0.5 rounded shadow-2xs leading-none" style="background-color: #2563eb !important; color: #ffffff !important; border: 1.5px solid #dc2626 !important;">ANGELO</span>`;
  }
  
  return `<span class="inline-block uppercase font-black text-[10px] sm:text-[11px] tracking-wider px-2 py-0.5 rounded shadow-2xs leading-none" style="background-color: #000000 !important; color: #ffffff !important; border: 1.5px solid #dc2626 !important;">MICHELE</span>`;
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

function processExcelWorkbook(data) {
  try {
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonRows.length === 0) {
      alert("Il file Excel è vuoto.");
      return;
    }

    let nuoviInseriti = 0;

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
        
        let operatore = 'Michele';
        if (operatoreRaw.toLowerCase().includes('angelo')) {
          operatore = 'Angelo';
        }

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

// --- MODALE UNIFICATO PER MODIFICA RECORD ---
let currentEditingId = null;

function closeModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  currentEditingId = null;
}

function openEditModal(id) {
  currentEditingId = id;
  const f = fascicoli.find(x => x.id === id);
  if (!f) return;

  document.getElementById('modal-title').textContent = `Modifica Fascicolo`;

  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <form onsubmit="saveRecordEdit(event)" class="space-y-3 text-left">
      <div>
        <label class="block text-xs font-bold text-slate-500 mb-1">Anno</label>
        <input type="number" id="edit-anno" value="${f.anno}" required class="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold">
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-500 mb-1">Numero Fascicolo</label>
        <input type="text" id="edit-numero" value="${f.numero}" required class="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold">
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-500 mb-1">Tipo Fascicolo</label>
        <select id="edit-stato" class="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold">
          <option value="21" ${parseStatoCode(f.stato) === '21' ? 'selected' : ''}>21 - NOTI</option>
          <option value="44" ${parseStatoCode(f.stato) === '44' ? 'selected' : ''}>44 - IGNOTI</option>
          <option value="45" ${parseStatoCode(f.stato) === '45' ? 'selected' : ''}>45 - F.N.C.R.</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-500 mb-1">Operatore</label>
        <select id="edit-operatore" class="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold">
          <option value="Angelo" ${String(f.operatore).toLowerCase().includes('angelo') ? 'selected' : ''}>Angelo</option>
          <option value="Michele" ${!String(f.operatore).toLowerCase().includes('angelo') ? 'selected' : ''}>Michele</option>
        </select>
      </div>
      <div class="pt-2 flex gap-2">
        <button type="submit" class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md">Salva Modifiche</button>
        <button type="button" onclick="closeModal()" class="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-sm">Annulla</button>
      </div>
    </form>
  `;

  document.getElementById('edit-modal').classList.remove('hidden');
}

function saveRecordEdit(e) {
  e.preventDefault();
  const f = fascicoli.find(x => x.id === currentEditingId);
  if (f) {
    f.anno = document.getElementById('edit-anno').value.trim();
    f.numero = document.getElementById('edit-numero').value.trim();
    f.stato = document.getElementById('edit-stato').value;
    f.operatore = document.getElementById('edit-operatore').value;

    saveData();
    renderList();
    closeModal();
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

// Rendering lista ultrasolitario e compatto
function renderList() {
  const container = document.getElementById('years-container');
  container.innerHTML = '';

  if (fascicoli.length === 0) {
    container.innerHTML = `<div class="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-300">
      <i class="fa-regular fa-folder-open text-3xl text-slate-300 mb-2"></i>
      <p class="text-slate-400 text-sm">Archivio vuoto.<br>Usa il pulsante "Aggiungi" o importa un file Excel.</p>
    </div>`;
    return;
  }

  // Raggruppamento per Anno
  const grouped = {};
  fascicoli.forEach(f => {
    if (!grouped[f.anno]) grouped[f.anno] = [];
    grouped[f.anno].push(f);
  });

  // Ordinamento Anno Decrescente
  const anniOrdinati = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

  anniOrdinati.forEach(anno => {
    const groupEl = document.createElement('div');
    groupEl.className = 'bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden';
    
    const itemsHtml = grouped[anno]
      .sort((a, b) => {
        // Priorità Tipi: 21 (prio 1) -> 44 (prio 2) -> 45 (prio 3)
        const prioA = getPriorityOrder(a.stato);
        const prioB = getPriorityOrder(b.stato);

        if (prioA !== prioB) {
          return prioA - prioB;
        }

        // A parità di tipo, ordinamento per Numero Fascicolo DECRESCENTE
        return Number(b.numero) - Number(a.numero);
      })
      .map(f => `
        <div id="card-${f.id}" class="px-3 py-2 rounded-lg border transition-all duration-300 flex items-center justify-between gap-2 ${getCardBgClass(f.stato, f.anno)}">
          
          <!-- Dati in Sequenza Inline: ANNO / NUMERO / TIPO - DENOMINAZIONE ANGELO -->
          <div class="flex items-center gap-1.5 flex-wrap font-black text-sm sm:text-base leading-tight">
            <span class="text-slate-900">${f.anno}</span>
            <span class="opacity-30">/</span>
            <span class="text-base sm:text-lg underline underline-offset-2 font-black">${f.numero}</span>
            <span class="opacity-30">/</span>
            <span class="font-bold">${getStatoFormatted(f.stato)}</span>
            ${getOperatoreBadge(f.operatore)}
          </div>

          <!-- Comandi Rapidi: Modifica (Icona Matita) ed Elimina -->
          <div class="flex items-center gap-1 shrink-0">
            <button onclick="openEditModal(${f.id})" title="Modifica Fascicolo" class="p-1.5 bg-white/80 hover:bg-white text-indigo-700 border border-slate-300/80 rounded-md shadow-2xs transition-transform active:scale-95">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
            <button onclick="deleteFascicolo(${f.id})" title="Elimina" class="p-1.5 bg-white/80 hover:bg-white text-red-600 border border-slate-300/80 rounded-md shadow-2xs transition-transform active:scale-95">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>

        </div>
      `).join('');

    groupEl.innerHTML = `
      <div class="bg-slate-100 px-3 py-1.5 border-b border-slate-200 font-extrabold text-slate-700 text-xs flex justify-between items-center">
        <span class="flex items-center gap-1.5"><i class="fa-solid fa-calendar-days text-indigo-500"></i> Anno ${anno}</span>
        <span class="text-[11px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">${grouped[anno].length} fascicol${grouped[anno].length === 1 ? 'o' : 'i'}</span>
      </div>
      <div class="p-2 space-y-1.5">
        ${itemsHtml}
      </div>
    `;
    
    container.appendChild(groupEl);
  });
}

// Inizializzazione
renderList();