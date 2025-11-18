document.addEventListener('DOMContentLoaded', () => {
  // Elementos
  const taskInput = document.getElementById("taskInput");
  const addBtn = document.getElementById("addBtn");
  const taskList = document.getElementById("taskList");
  const clearDone = document.getElementById("clearDone");
  const clearAll = document.getElementById("clearAll");

  const notifSound = document.getElementById("notifSound");
  const alarmSound = document.getElementById("alarmSound");
  const themeToggle = document.getElementById("themeToggle");
  const notifyBox = document.getElementById("notify");

  const clockEl = document.getElementById("clock");
  const alarmHour = document.getElementById("alarmHour");
  const alarmMinute = document.getElementById("alarmMinute");
  const setAlarm = document.getElementById("setAlarm");
  const clearAlarm = document.getElementById("clearAlarm");

  // Segurança: checar existência
  if (!taskList || !addBtn || !taskInput || !notifyBox || !clockEl) {
    console.error("Elemento crucial não encontrado no DOM.");
    return;
  }

  // Notificação visual
  function notify(msg, color = null) {
    notifyBox.textContent = msg;
    notifyBox.style.background = color || getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#5a55ff';
    notifyBox.classList.add('show');
    setTimeout(() => notifyBox.classList.remove('show'), 2400);
  }

  // Som: tenta tocar o <audio>, se falhar usa WebAudio beep
  function playSound(audioEl) {
    if (!audioEl) return;
    audioEl.play().catch(() => {
      // fallback simples: beep
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 880;
        g.gain.value = 0.05;
        o.connect(g); g.connect(ctx.destination);
        o.start();
        setTimeout(()=>{ o.stop(); ctx.close(); }, 220);
      } catch(e) { /* silently fail */ }
    });
  }

  // Relógio (Horário de Brasília)
  function getBrasiliaNow() {
    // usa toLocaleString com timeZone — compatível na maioria dos navegadores modernos
    const now = new Date();
    const br = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    return br;
  }

  function pad(v){ return String(v).padStart(2,'0'); }
  let alarmTime = null;
  let alarmActive = false;

  function updateClock() {
    const now = getBrasiliaNow();
    const h = pad(now.getHours()), m = pad(now.getMinutes()), s = pad(now.getSeconds());
    clockEl.textContent = `${h}:${m}:${s}`;

    if (alarmActive && alarmTime === `${h}:${m}`) {
      alarmActive = false;
      playSound(alarmSound);
      notify(`⏰ Despertador: ${alarmTime}`, 'linear-gradient(90deg,#ff6b6b,#ff8e6b)');
      // piscar título da página como sinal extra
      const original = document.title;
      let blink = 0;
      const intr = setInterval(()=> {
        document.title = (blink++ % 2 === 0) ? `⏰ ${alarmTime} — The Leaders` : original;
        if (blink > 8) { clearInterval(intr); document.title = original; }
      }, 600);
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Preencher selects do alarm
  for (let i=0;i<24;i++){
    const o = document.createElement('option'); o.value=o.textContent=pad(i);
    alarmHour.appendChild(o);
  }
  for (let i=0;i<60;i++){
    const o = document.createElement('option'); o.value=o.textContent=pad(i);
    alarmMinute.appendChild(o);
  }

  setAlarm.addEventListener('click', () => {
    const h = alarmHour.value; const m = alarmMinute.value;
    alarmTime = `${h}:${m}`;
    alarmActive = true;
    notify(`Despertador ativo ${alarmTime}`, 'linear-gradient(90deg,#2ec27e,#4ce0b3)');
    playSound(notifSound);
  });

  clearAlarm.addEventListener('click', () => {
    alarmActive = false; alarmTime = null;
    notify('Despertador cancelado', 'linear-gradient(90deg,#ff6b6b,#ff8e6b)');
  });

  // Tarefas
  let tasks = [];
  function loadTasks(){
    try {
      const raw = localStorage.getItem('theleaders:tasks');
      tasks = raw ? JSON.parse(raw) : [];
    } catch(e){ tasks = [];}
  }
  function saveTasks(){
    try { localStorage.setItem('theleaders:tasks', JSON.stringify(tasks)); } catch(e){ console.warn(e); }
  }

  function renderTasks(){
    taskList.innerHTML = '';
    if (!tasks.length) {
      const li = document.createElement('li'); li.className='muted'; li.textContent='Nenhuma tarefa — adicione algo ✨';
      taskList.appendChild(li); return;
    }
    tasks.forEach((t, idx) => {
      const li = document.createElement('li'); li.className='task';
      const left = document.createElement('div'); left.className='left';
      const txt = document.createElement('div'); txt.className='text'; txt.textContent = t.text;
      if (t.done) { li.classList.add('completed'); }
      left.appendChild(txt);

      const actions = document.createElement('div'); actions.className='actions';
      const doneBtn = document.createElement('button'); doneBtn.title='Marcar/Desmarcar';
      doneBtn.innerText = t.done ? '✅' : '✔️';
      doneBtn.onclick = () => { tasks[idx].done = !tasks[idx].done; saveTasks(); renderTasks(); notify(t.done ? 'Desmarcado' : 'Marcado como feito', t.done ? 'linear-gradient(90deg,#ffb199,#ff7b7b)' : 'linear-gradient(90deg,#2ec27e,#4ce0b3)'); playSound(notifSound); };

      const delBtn = document.createElement('button'); delBtn.title='Remover'; delBtn.innerText = '🗑️';
      delBtn.onclick = () => { tasks.splice(idx,1); saveTasks(); renderTasks(); notify('Tarefa removida','linear-gradient(90deg,#ff6b6b,#ff8e6b)'); playSound(notifSound); };

      actions.appendChild(doneBtn); actions.appendChild(delBtn);
      li.appendChild(left); li.appendChild(actions);
      taskList.appendChild(li);
    });
  }

  // Adição
  function addTaskFromInput(){
    const text = (taskInput.value || '').trim();
    if (!text) { notify('Digite uma tarefa antes', 'linear-gradient(90deg,#ff6b6b,#ff8e6b)'); return; }
    tasks.unshift({ text, done:false, created: Date.now() });
    saveTasks(); renderTasks(); taskInput.value=''; playSound(notifSound); notify('Tarefa adicionada','linear-gradient(90deg,#2ec27e,#4ce0b3)');
  }

  addBtn.addEventListener('click', addTaskFromInput);
  taskInput.addEventListener('keydown', (e)=> { if (e.key==='Enter') addTaskFromInput(); });

  clearDone && clearDone.addEventListener('click', ()=> {
    tasks = tasks.filter(t => !t.done); saveTasks(); renderTasks(); notify('Concluídas removidas','linear-gradient(90deg,#ff9a9a,#ff6b6b)');
  });

  clearAll && clearAll.addEventListener('click', ()=> {
    if (!confirm('Deseja realmente limpar todas as tarefas?')) return;
    tasks = []; saveTasks(); renderTasks(); notify('Lista limpa','linear-gradient(90deg,#ff6b6b,#ff8e6b)');
  });

  // Tema
  themeToggle.addEventListener('click', ()=> {
    const isDark = document.body.classList.toggle('dark');
    themeToggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    notify(isDark ? 'Modo escuro' : 'Modo claro');
  });

  // Inicialização
  loadTasks(); renderTasks();
});    const h = String(time.getHours()).padStart(2, "0");
    const m = String(time.getMinutes()).padStart(2, "0");
    const s = String(time.getSeconds()).padStart(2, "0");

    clock.textContent = `${h}:${m}:${s}`;

    // Verificar despertador
    if (alarmActive && alarmTime === `${h}:${m}`) {
        alarmSound.play();
        notify("⏰ Despertador tocando!", "var(--danger)");
        alarmActive = false;
    }
}
setInterval(updateClock, 1000);

/* -------------------- CONFIGURAR DESPERTADOR -------------------- */
for (let i = 0; i < 24; i++) {
    const opt = document.createElement("option");
    opt.value = opt.textContent = String(i).padStart(2, "0");
    alarmHour.appendChild(opt);
}

for (let i = 0; i < 60; i++) {
    const opt = document.createElement("option");
    opt.value = opt.textContent = String(i).padStart(2, "0");
    alarmMinute.appendChild(opt);
}

setAlarm.onclick = () => {
    alarmTime = `${alarmHour.value}:${alarmMinute.value}`;
    alarmActive = true;
    notify(`Despertador ajustado para ${alarmTime} ✔`, "var(--success)");
};

clearAlarm.onclick = () => {
    alarmActive = false;
    alarmTime = null;
    notify("Despertador cancelado.", "var(--danger)");
};

/* -------------------- TAREFAS -------------------- */
window.onload = () => {
    const saved = JSON.parse(localStorage.getItem("tasks")) || [];
    saved.forEach(text => addTask(text, false));
};

function addTask(text = null, playSound = true) {
    const taskText = text || taskInput.value.trim();
    if (!taskText) return notify("Digite uma tarefa!", "var(--danger)");

    const li = document.createElement("li");
    li.className = "task";
    li.textContent = taskText;

    li.addEventListener("click", () => {
        li.classList.toggle("completed");
        saveTasks();
        notify("Tarefa concluída ✔", "var(--success)");
    });

    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑";
    delBtn.className = "del";
    delBtn.onclick = () => {
        li.remove();
        saveTasks();
        notify("Tarefa removida", "var(--danger)");
    };

    li.appendChild(delBtn);
    taskList.appendChild(li);

    if (playSound) notifSound.play();

    taskInput.value = "";
    saveTasks();
    notify("Tarefa adicionada ✔");
}

addBtn.onclick = () => addTask();
clearAll.onclick = () => {
    taskList.innerHTML = "";
    saveTasks();
    notify("Lista limpa!", "var(--danger)");
};

function saveTasks() {
    const texts = [...document.querySelectorAll(".task")]
        .map(li => li.childNodes[0].textContent);

    localStorage.setItem("tasks", JSON.stringify(texts));
}

/* -------------------- TEMA -------------------- */
themeToggle.onclick = () => {
    document.body.classList.toggle("dark");
    themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
    notify("Tema alterado!");
};}

setAlarm.onclick = () => {
    alarmTime = `${alarmHour.value}:${alarmMinute.value}`;
    alarmActive = true;
    notify(`Despertador ajustado para ${alarmTime} ✔`, "var(--success)");
};

clearAlarm.onclick = () => {
    alarmActive = false;
    alarmTime = null;
    notify("Despertador cancelado.", "var(--danger)");
};

/* -------------------- TAREFAS -------------------- */
window.onload = () => {
    const saved = JSON.parse(localStorage.getItem("tasks")) || [];
    saved.forEach(text => addTask(text, false));
};

function addTask(text = null, playSound = true) {
    const taskText = text || taskInput.value.trim();
    if (!taskText) return notify("Digite uma tarefa!", "var(--danger)");

    const li = document.createElement("li");
    li.className = "task";
    li.textContent = taskText;

    li.addEventListener("click", () => {
        li.classList.toggle("completed");
        saveTasks();
        notify("Tarefa concluída ✔", "var(--success)");
    });

    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑";
    delBtn.className = "del";
    delBtn.onclick = () => {
        li.remove();
        saveTasks();
        notify("Tarefa removida", "var(--danger)");
    };

    li.appendChild(delBtn);
    taskList.appendChild(li);

    if (playSound) notifSound.play();

    taskInput.value = "";
    saveTasks();
    notify("Tarefa adicionada ✔");
}

addBtn.onclick = () => addTask();
clearAll.onclick = () => {
    taskList.innerHTML = "";
    saveTasks();
    notify("Lista limpa!", "var(--danger)");
};

function saveTasks() {
    const texts = [...document.querySelectorAll(".task")]
        .map(li => li.childNodes[0].textContent);

    localStorage.setItem("tasks", JSON.stringify(texts));
}

/* -------------------- TEMA -------------------- */
themeToggle.onclick = () => {
    document.body.classList.toggle("dark");
    themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
    notify("Tema alterado!");
};
