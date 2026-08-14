// Stato locale
let fascicoli = JSON.parse(localStorage.getItem('fascicoli_db')) || [
  { id: 1, numero: "452", anno: "2026", stato: "Noti", operatore: "Michele" },
  { id: 2, numero: "105", anno: "2025", stato: "Ignoti", operatore: "Angelo" }
];

// Inizializzazione Riconoscimento Vocale
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'it-IT';
  recognition.continuous = false;
  recognition.interimResults = false;
} else {
  alert("Il tuo browser non supporta il riconoscimento vocale. Usa Google Chrome o Safari.");
}

// Avvio ascolto
function startSpeech(mode) {
  if (!recognition) return;
  
  const statusBadge = document.getElementById('status-badge');
  const transcriptOutput = document.getElementById('transcript-output');
  
  statusBadge.textContent = "Ascolto in corso...";
  statusBadge.className = "text-xs bg-red-500 px-2 py-1 rounded-full animate-pulse";
  transcriptOutput.textContent = "Parla ora...";

  recognition.start();

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    transcriptOutput.textContent = `"${text}"`;
    
    statusBadge.textContent = "Elaborazione...";
    statusBadge.className = "text-xs bg-amber-500 px-2 py-1 rounded-full";

    if (mode === 'add') {
      parseAndAdd(text);
    } else if (mode === 'search') {
      parseAndSearch(text);
    }
  };

  recognition.onerror = () => {
    statusBadge.textContent = "Errore";
    statusBadge.className = "text-xs bg-slate-500 px-2 py-1 rounded-full";
    transcriptOutput.textContent = "Riconoscimento fallito. Riprova.";
  };

  recognition.onend = () => {
    if (statusBadge.textContent === "Ascolto in corso...") {
      statusBadge.textContent = "Pronto";
      statusBadge.className = "text-xs bg-indigo-500 px-2 py-1 rounded-full";
    }
  };
}

// Estrazione Dati per Inserimento
function parseAndAdd(text) {
  const textLower = text.toLowerCase();
  
  // Regex per il numero del fascicolo
  const numMatch = textLower.match(/(?:fascicolo|numero|n°|n)?\s*(\d+)/i);
  // Regex per l'anno (es. 2024, 2025, 2026)
  const annoMatch = textLower.match(/(20\d{2})/);
  
  const numero = numMatch ? numMatch[1] : null;
  const anno = annoMatch ? annoMatch[1] : new Date().getFullYear().toString();
  
  // Riconoscimento opzioni obbligate
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
}

// Estrazione Dati per Ricerca Vocale
function parseAndSearch(text) {
  const textLower = text.toLowerCase();
  const numMatch = textLower.match(/\d+/);
  
  if (!numMatch) {
    speak("Specifica un numero di fascicolo da cercare.");
    return;
  }

  const numCercato = numMatch[0];
  const trovati = fascicoli.filter(f => f.numero === numCercato);

  if (trovati.length > 0) {
    const f = trovati[0];
    speak(`Trovato! Fascicolo ${f.numero} del ${f.anno}, stato ${f.stato}, operatore ${f.operatore}.`);
    
    // Evidenzia visivamente il fascicolo
    renderList();
    const el = document.getElementById(`card-${f.id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    speak(`Nessun fascicolo numero ${numCercato} trovato in archivio.`);
  }
}

// Sintesi Vocale (Text-To-Speech)
function speak(phrase) {
  const statusBadge = document.getElementById('status-badge');
  statusBadge.textContent = "Pronto";
  statusBadge.className = "text-xs bg-indigo-500 px-2 py-1 rounded-full";

  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = 'it-IT';
    window.speechSynthesis.speak(utterance);
  }
}

// Salvataggio nel browser
function saveData() {
  localStorage.setItem('fascicoli_db', JSON.stringify(fascicoli));
}

function clearAllData() {
  if (confirm("Sei sicuro di voler cancellare tutti i fascicoli?")) {
    fascicoli = [];
    saveData();
    renderList();
  }
}

// Rendering UI divisa per Anno
function renderList() {
  const container = document.getElementById('years-container');
  container.innerHTML = '';

  if (fascicoli.length === 0) {
    container.innerHTML = `<p class="text-center text-slate-400 text-sm py-6">Nessun fascicolo presente in archivio.</p>`;
    return;
  }

  // Raggruppa per anno
  const grouped = {};
  fascicoli.forEach(f => {
    if (!grouped[f.anno]) grouped[f.anno] = [];
    grouped[f.anno].push(f);
  });

  // Ordina gli anni in modo decrescente
  const anniOrdinati = Object.keys(grouped).sort((a, b) => b - a);

  anniOrdinati.forEach(anno => {
    const groupEl = document.createElement('div');
    groupEl.className = 'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden';
    
    const itemsHtml = grouped[anno]
      .sort((a, b) => a.numero - b.numero)
      .map(f => `
        <div id="card-${f.id}" class="p-3 bg-slate-50 rounded-lg flex justify-between items-center border border-slate-100">
          <div>
            <span class="font-bold text-slate-800">Fasc. n° ${f.numero}</span>
            <span class="text-xs text-slate-500 block">Anno: ${f.anno}</span>
          </div>
          <div class="flex gap-2">
            <span class="px-2 py-1 text-xs font-semibold rounded-md ${f.stato === 'Noti' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}">${f.stato}</span>
            <span class="px-2 py-1 text-xs font-semibold rounded-md ${f.operatore === 'Michele' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}">${f.operatore}</span>
          </div>
        </div>
      `).join('');

    groupEl.innerHTML = `
      <div class="bg-slate-100 px-4 py-2 border-b border-slate-200 font-bold text-slate-700 text-sm flex justify-between items-center">
        <span>Anno ${anno}</span>
        <span class="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">${grouped[anno].length}</span>
      </div>
      <div class="p-3 space-y-2">
        ${itemsHtml}
      </div>
    `;
    
    container.appendChild(groupEl);
  });
}

// Render iniziale all'avvio
renderList();