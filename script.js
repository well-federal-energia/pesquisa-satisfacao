// Login simples + Stepper de 4 perguntas e envio JSON
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginCard = document.getElementById('loginCard');
  const formCard = document.getElementById('formCard');
  const loginError = document.getElementById('loginError');
  const loginBtn = loginForm.querySelector('button[type="submit"]');
  const sectorRadios = document.querySelectorAll('input[name="sector"]');
  const sectorBanner = document.getElementById('evaluatedSector');
  const sectorNameEl = document.getElementById('sectorName');
  const welcomeUser = document.getElementById('welcomeUser');

  const stepper = document.getElementById('stepper');
  const progressBar = document.getElementById('progressBar');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const finalReview = document.getElementById('finalReview');
  const jsonPreview = document.getElementById('jsonPreview');
  const sendBtn = document.getElementById('sendBtn');
  const editBtn = document.getElementById('editBtn');
  const sendError = document.getElementById('sendError');
  const thankYouCard = document.getElementById('thankYouCard');
  const thankYouDetails = document.getElementById('thankYouDetails');
  const anotherBtn = document.getElementById('anotherBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  const DEMO_EMAIL = 'demo@user.com';

  // Step state
  const questions = [
    'As dúvidas são sanadas no atendimento?',
    'Como você avalia o atendimento prestado pela nossa equipe?',
    'As informações repassadas são claras e precisas?',
    'De modo geral, como você avalia o atendimento do setor?'
  ];
  let currentStep = 0;
  let answers = [null, null, null, null];
  let userEmail = null;
  let userSector = null;
  let stepperInitialized = false; // evita múltiplos listeners caso startStepper seja chamado várias vezes



  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const sector = document.querySelector('input[name="sector"]:checked')?.value || '';

    if(!email || !sector){
      loginError.textContent = 'Por favor, preencha e-mail e selecione o setor.';
      loginError.classList.remove('hidden');
      return;
    }

    // Validação via API antes de seguir
    const VALIDATION_URL = 'https://default5fe263d140174ff88b763ccd84ecfb.05.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/06c51dda4ff041138fd59683e778d902/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=5oO6GpISvndzvDl9dtIcUs3kul11GvD2mRsorgmipVw';

    loginError.classList.add('hidden');
    const originalText = loginBtn ? loginBtn.textContent : 'Entrar';
    if(loginBtn){ loginBtn.disabled = true; loginBtn.textContent = 'Validando...'; }

    fetch(VALIDATION_URL, {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, sector })
    }).then(r => {
      if(r.ok){
        // validação OK (200)
        userEmail = email; userSector = sector; loginSuccess();
        return;
      }
      // erro HTTP: ler corpo e extrair apenas mensagem.error quando disponível
      return r.text().then(text => {
        let msg = text || `Erro ${r.status}`;
        try{
          const parsed = text ? JSON.parse(text) : null;
          if(parsed){
            if(parsed.mensagem){
              if(typeof parsed.mensagem === 'object' && parsed.mensagem.error) msg = parsed.mensagem.error;
              else if(typeof parsed.mensagem === 'string'){
                try{ const inner = JSON.parse(parsed.mensagem); if(inner && inner.error) msg = inner.error; else msg = parsed.mensagem; }catch(e){ msg = parsed.mensagem; }
              }
            } else if(parsed.error) msg = parsed.error;
            else if(parsed.message) msg = parsed.message;
          }
        }catch(e){}
        loginError.textContent = msg; loginError.classList.remove('hidden');
        throw new Error(msg);
      });
    }).catch(err => {
      console.error('Validation error:', err);
      const msg = err && err.message ? err.message : String(err);
      loginError.textContent = msg;
      loginError.classList.remove('hidden');
    }).finally(() => { if(loginBtn){ loginBtn.disabled = false; loginBtn.textContent = originalText; } });
  });

  function loginSuccess(){
    loginError.classList.add('hidden');
    loginCard.classList.add('hidden');
    formCard.classList.remove('hidden');
    welcomeUser.textContent = `Bem-vindo(a), ${userEmail}`;
    if(sectorBanner && sectorNameEl){ sectorNameEl.textContent = userSector; sectorBanner.classList.remove('hidden'); }
    startStepper();
  }

  function startStepper(){
    answers = [null, null, null, null];
    currentStep = 0;
    stepper.classList.remove('hidden');
    // ensure review is hidden and actions are visible when starting
    finalReview.classList.add('hidden');
    const actions = document.querySelector('.step-actions'); if(actions) actions.classList.remove('hidden');
    showStep(0);

    // add event listeners only once
    if(!stepperInitialized){
      stepper.addEventListener('change', (e)=>{
        if(e.target && e.target.type === 'radio'){
          answers[currentStep] = e.target.value;
          // visual
          const labels = document.querySelectorAll('.step[data-step="'+currentStep+'"] .step-radios label');
          labels.forEach(l => l.classList.remove('selected'));
          if(e.target.parentElement) e.target.parentElement.classList.add('selected');
        }
      });

      prevBtn.addEventListener('click', () => {
        if(currentStep>0) showStep(currentStep-1);
      });

      nextBtn.addEventListener('click', () => {
        const sel = document.querySelector('.step[data-step="'+currentStep+'"] input[type=radio]:checked');
        if(!sel){ alert('Por favor, selecione uma opção antes de avançar.'); return; }
        answers[currentStep] = sel.value;
        if(currentStep < questions.length - 1) showStep(currentStep+1);
        else showReview();
      });

      editBtn.addEventListener('click', () => { finalReview.classList.add('hidden'); stepper.classList.remove('hidden'); const a = document.querySelector('.step-actions'); if(a) a.classList.remove('hidden'); showStep(0); });

      // sendBtn listener (kept as-is)
      sendBtn.addEventListener('click', () => {
        const payload = { email: userEmail, sector: userSector, answers: {}, ts: new Date().toISOString() };
        answers.forEach((v,i)=> payload.answers[`q${i+1}`] = Number(v));

        // UI: loading state
        const originalText = sendBtn.textContent;
        sendBtn.disabled = true; sendBtn.textContent = 'Enviando...';
        if(sendError) sendError.classList.add('hidden');

        fetch('https://default5fe263d140174ff88b763ccd84ecfb.05.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/2a82697868e34297b821f4e4c0bd7b41/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=wVLUnV-PeFjPmDvsQxWwbdyxLkzdiBnOgDQOhfJ6JAQ', {
          method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
        }).then(r=>{
          // sucesso HTTP (2xx)
          if(r.ok) return r.text().then(txt => {
            let parsed = null;
            try{ parsed = txt ? JSON.parse(txt) : null; }catch(e){ parsed = txt; }
            console.log('API response:', parsed);
            // show thank you screen
            stepper.classList.add('hidden'); finalReview.classList.add('hidden');
            // note: do NOT hide `formCard` because `thankYouCard` is inside it
            if(thankYouCard){ thankYouDetails.textContent = `E-mail: ${userEmail} — Setor: ${userSector}`; thankYouCard.classList.remove('hidden'); }
          });
          // erro HTTP: extrair apenas mensagem.error se disponível
          return r.text().then(text => {
            let msg = text || `Erro ${r.status}`;
            try{
              const parsed = text ? JSON.parse(text) : null;
              if(parsed){
                if(parsed.mensagem){
                  if(typeof parsed.mensagem === 'object' && parsed.mensagem.error) msg = parsed.mensagem.error;
                  else if(typeof parsed.mensagem === 'string'){
                    try{ const inner = JSON.parse(parsed.mensagem); if(inner && inner.error) msg = inner.error; else msg = parsed.mensagem; }catch(e){ msg = parsed.mensagem; }
                  }
                } else if(parsed.error) msg = parsed.error;
                else if(parsed.message) msg = parsed.message;
              }
            }catch(e){}
            throw new Error(msg);
          });
        }).catch(err=>{
          console.error('Erro ao enviar:', err);
          const msg = err && err.message ? err.message : String(err);
          if(sendError) { sendError.textContent = msg; sendError.classList.remove('hidden'); }
        }).finally(()=>{ sendBtn.disabled = false; sendBtn.textContent = originalText; });
      });

      anotherBtn && anotherBtn.addEventListener('click', ()=>{ if(thankYouCard) thankYouCard.classList.add('hidden'); formCard.classList.remove('hidden'); finalReview.classList.add('hidden'); const a = document.querySelector('.step-actions'); if(a) a.classList.remove('hidden'); startStepper(); });

      logoutBtn.addEventListener('click', ()=>{ // reset
        stepper.classList.add('hidden'); if(thankYouCard) thankYouCard.classList.add('hidden'); formCard.classList.add('hidden'); loginCard.classList.remove('hidden');
        if(sectorBanner) sectorBanner.classList.add('hidden'); document.querySelectorAll('input[name="sector"]').forEach(i => i.checked = false);
        document.getElementById('email').value = '';
      });

      stepperInitialized = true;
    }
  }

  function showStep(step){
    // ensure actions are visible when showing a step
    const actions = document.querySelector('.step-actions'); if(actions) actions.classList.remove('hidden');

    const steps = document.querySelectorAll('.step'); steps.forEach(s => s.classList.add('hidden'));
    const el = document.querySelector('.step[data-step="'+step+'"]'); if(el) el.classList.remove('hidden');
    currentStep = step;
    // restore selection
    const selVal = answers[step];
    if(selVal){ const r = document.querySelector('.step[data-step="'+step+'"] input[type=radio][value="'+selVal+'"]'); if(r) r.checked=true; const labels = document.querySelectorAll('.step[data-step="'+step+'"] .step-radios label'); labels.forEach(lbl=>lbl.classList.remove('selected')); const chosen = document.querySelector('.step[data-step="'+step+'"] input[type=radio]:checked'); if(chosen && chosen.parentElement) chosen.parentElement.classList.add('selected'); }

    // progress
    const pct = Math.round(((step) / questions.length) * 100);
    progressBar.style.width = pct + '%';

    prevBtn.style.display = step === 0 ? 'none' : 'inline-flex';
    nextBtn.textContent = step === questions.length - 1 ? 'Finalizar' : 'Próxima';
  }

  function showReview(){
    const steps = document.querySelectorAll('.step'); steps.forEach(s=>s.classList.add('hidden'));
    document.querySelector('.step-actions').classList.add('hidden');
    finalReview.classList.remove('hidden');
    const payload = { email: userEmail, sector: userSector, answers: {} }; answers.forEach((v,i)=> payload.answers[`q${i+1}`] = Number(v));
    jsonPreview.textContent = JSON.stringify(payload, null, 2);
  }

});