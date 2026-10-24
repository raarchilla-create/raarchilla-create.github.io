/* A fictional, browser-only restaurant management game. */
const ShiftGame = (() => {
  const events = [
    {
      time: '21:15',
      title: ['Eight walk-ins, no reservation', 'Ocho personas sin reserva'],
      story: ['The dining room is almost full. The group wants a table now, and the kitchen is already busy.',
        'La sala está casi llena. El grupo quiere mesa ya y cocina tiene las comandas acumulándose.'],
      choices: [
        {label: ['Seat them immediately', 'Sentarlos ahora'], impact: [-18, -20, 16],
          reply: ['The sale is yours, but tickets stack up and one table starts watching the clock.',
            'La venta entra, pero se acumulan comandas y una mesa empieza a mirar el reloj.'],
          mood: ['worried', 'stressed'], queue: 3},
        {label: ['Give an honest wait and split the party', 'Dar una espera realista y dividir el grupo'], impact: [6, -4, 5],
          reply: ['Some guests wait. The team keeps the pace and can explain what happens next.',
            'Parte del grupo espera. El equipo mantiene el ritmo y puede explicar qué pasará después.'],
          mood: ['happy', 'focused'], queue: 2},
        {label: ['Decline the walk-ins', 'Rechazar el grupo'], impact: [8, 9, -14],
          reply: ['The current service is protected. The group leaves, along with a possible sale.',
            'El servicio actual queda protegido. El grupo se marcha y se pierde una posible venta.'],
          mood: ['neutral', 'calm'], queue: 0}
      ]
    },
    {
      time: '21:35',
      title: ['One cook is missing', 'Falta un cocinero'],
      story: ['The hot section is falling behind. The waiter needs a reliable time for the next two tables.',
        'La partida caliente se retrasa. Sala necesita un tiempo fiable para las próximas dos mesas.'],
      choices: [
        {label: ['Jump on the pass and coordinate', 'Entrar al pase y coordinar'], impact: [11, 1, -5],
          reply: ['Orders move again. You help the team, though you cannot stay on the pass forever.',
            'Las comandas vuelven a salir. Ayudas al equipo, aunque no puedes quedarte en el pase para siempre.'],
          mood: ['happy', 'focused'], queue: 1},
        {label: ['Ask the team to stretch the shift', 'Pedir al equipo que alargue el turno'], impact: [9, -18, -11],
          reply: ['The wait shrinks tonight. The extra hours and fatigue will still need an answer tomorrow.',
            'La espera baja esta noche. Las horas extra y el cansancio seguirán ahí mañana.'],
          mood: ['neutral', 'stressed'], queue: 1},
        {label: ['Pause complex dishes temporarily', 'Pausar temporalmente los platos complejos'], impact: [-5, 15, 9],
          reply: ['The menu is shorter, but the kitchen regains control and communicates realistic times.',
            'La carta se acorta, pero cocina recupera el control y comunica tiempos realistas.'],
          mood: ['neutral', 'calm'], queue: 2}
      ]
    },
    {
      time: '22:05',
      title: ['The signature dish is nearly gone', 'Se acaba el plato estrella'],
      story: ['There are two portions left. Three tables are about to order and the POS still shows the dish.',
        'Quedan dos raciones. Tres mesas están a punto de pedir y el TPV aún muestra el plato.'],
      choices: [
        {label: ['Sell the last portions first', 'Vender primero las últimas raciones'], impact: [-14, -9, 9],
          reply: ['Two guests get it. The next table orders something you can no longer serve.',
            'Dos clientes lo disfrutan. La siguiente mesa pide algo que ya no puedes servir.'],
          mood: ['worried', 'stressed'], queue: 3},
        {label: ['Tell the room and suggest an alternative', 'Avisar a sala y proponer una alternativa'], impact: [13, 7, -6],
          reply: ['Guests know before ordering. The waiter turns a stock problem into a clear recommendation.',
            'Los clientes lo saben antes de pedir. Sala convierte el problema de stock en una recomendación clara.'],
          mood: ['happy', 'focused'], queue: 1},
        {label: ['Improvise a substitute without warning', 'Improvisar un sustituto sin avisar'], impact: [-17, -12, 8],
          reply: ['The plate looks similar, but it is not what was promised. The table notices.',
            'El plato se parece, pero no es lo prometido. La mesa se da cuenta.'],
          mood: ['angry', 'stressed'], queue: 2}
      ]
    }
  ];
  const clamp = n => Math.max(0, Math.min(100, n));
  const initial = () => ({round: 0, phase: 'intro', service: 70, team: 70, margin: 70,
    history: [], guestMood: 'neutral', staffMood: 'calm', queue: 0});
  function choose(state, choiceIndex) {
    if (state.phase !== 'choice' || state.round >= events.length) return state;
    const choice = events[state.round].choices[choiceIndex];
    if (!choice) return state;
    return {...state, phase: 'feedback', service: clamp(state.service + choice.impact[0]),
      team: clamp(state.team + choice.impact[1]), margin: clamp(state.margin + choice.impact[2]),
      guestMood: choice.mood[0], staffMood: choice.mood[1], queue: choice.queue,
      history: [...state.history, choiceIndex]};
  }
  function next(state) {
    if (state.phase === 'intro') return {...state, phase: 'choice'};
    if (state.phase !== 'feedback') return state;
    const round = state.round + 1;
    return {...state, round, phase: round >= events.length ? 'end' : 'choice'};
  }
  function ending(state) {
    const entries = [['service', state.service], ['team', state.team], ['margin', state.margin]];
    entries.sort((a, b) => a[1] - b[1]);
    return entries[0][0];
  }
  return {events, initial, choose, next, ending};
})();

window.initShift = ({getLang}) => {
  const root = document.getElementById('shiftGame');
  if (!root) return;
  const canvas = document.getElementById('shiftScene');
  const ctx = canvas.getContext('2d');
  const label = document.getElementById('shiftSceneLabel');
  const panel = document.getElementById('shiftPanel');
  const metrics = document.getElementById('shiftMetrics');
  const progress = document.getElementById('shiftProgress');
  const feedback = document.getElementById('shiftFeedback');
  const t = pair => pair[getLang() === 'es' ? 1 : 0];
  let state = ShiftGame.initial();
  let visible = true;
  let transitionAt = 0;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const colors = {navy:'#172b3e', wall:'#253b50', wallLight:'#314d61', floor:'#8b7769',
    tile:'#a99179', cream:'#f3e7cc', gold:'#e3b873', red:'#cf746a', green:'#8dbba0',
    skin:'#e6b48a', skinDark:'#b47c5e', coat:'#f4efe1', blue:'#4b718b', dark:'#172638'};
  const fill = (x,y,w,h,c) => {ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  const word = (str,x,y,color=colors.cream,size=9) => {
    ctx.fillStyle=color;ctx.font=`bold ${size}px monospace`;ctx.fillText(str,x,y);
  };
  function face(x,y,mood) {
    fill(x-5,y-2,2,2,colors.dark);fill(x+3,y-2,2,2,colors.dark);
    if (mood === 'happy') {fill(x-3,y+4,6,1,colors.dark);fill(x-2,y+5,4,1,colors.dark);}
    else if (mood === 'angry' || mood === 'stressed') {
      fill(x-4,y+5,7,1,colors.dark);fill(x-6,y-5,4,1,colors.dark);
    } else if (mood === 'worried') {fill(x-3,y+4,5,1,colors.dark);fill(x-2,y+5,3,1,colors.dark);}
    else fill(x-2,y+4,4,1,colors.dark);
  }
  function person(x,y,role,mood,bob=0,variant=0) {
    y=Math.round(y+bob);
    fill(x-9,y+31,19,3,'#14233666');
    fill(x-8,y+22,6,10,colors.dark);fill(x+3,y+22,6,10,colors.dark);
    const body=role==='chef'?colors.coat:role==='waiter'?colors.blue:
      [colors.red,colors.gold,colors.green,colors.blue][variant%4];
    fill(x-9,y+7,18,17,body);
    fill(x-12,y+9,4,13,colors.skin);fill(x+8,y+9,4,13,colors.skin);
    if(role==='chef'){fill(x-5,y+8,10,13,colors.blue);fill(x-9,y-12,18,5,colors.coat);fill(x-7,y-17,14,6,colors.coat);}
    if(role==='waiter'){fill(x-2,y+7,4,16,colors.cream);fill(x-6,y-12,12,4,colors.dark);}
    fill(x-8,y-9,16,17,variant%2?colors.skinDark:colors.skin);
    if(role==='guest')fill(x-9,y-13,18,5,variant%2?'#563b35':'#302d35');
    face(x,y,mood);
  }
  function bubble(x,y,symbol,color=colors.cream) {
    fill(x-9,y-12,18,17,colors.dark);fill(x-7,y-10,14,13,color);
    fill(x-1,y+3,4,4,color);word(symbol,x-4,y+1,colors.dark,11);
  }
  function scene(ms) {
    if (!ctx) return;
    const tick=reduced?0:ms/250;
    fill(0,0,480,270,colors.navy);
    fill(0,0,480,160,colors.wall);
    for(let i=0;i<16;i++)fill(i*30,156,1,114,i%2?colors.floor:colors.tile);
    fill(0,160,480,110,colors.floor);
    for(let y=185;y<270;y+=28)fill(0,y,480,1,'#6e5b52');
    fill(226,0,5,156,colors.dark);
    fill(12,17,203,29,colors.dark);word('KITCHEN / COCINA',23,36,colors.gold,11);
    fill(245,17,223,29,colors.dark);word('DINING ROOM / SALA',258,36,colors.gold,11);
    // Hood, shelves, pans and the busy ticket rail.
    fill(30,61,155,6,colors.dark);fill(39,67,10,44,colors.wallLight);
    fill(155,67,10,44,colors.wallLight);fill(55,77,22,8,colors.gold);
    fill(102,77,18,8,colors.cream);fill(142,77,12,8,colors.red);
    fill(11,123,207,25,colors.dark);fill(14,127,201,6,colors.gold);
    fill(102,116,48,8,colors.dark);fill(110,111,33,6,colors.cream);
    for(let i=0;i<Math.min(5,1+state.queue);i++){
      fill(160+i*10,55,8,17,colors.cream);fill(162+i*10,59,4,1,colors.red);
    }
    // Dining tables and empty place settings.
    for(const x of [294,385]){
      fill(x,203,65,7,colors.dark);fill(x+6,198,53,6,colors.cream);
      fill(x+30,210,5,27,colors.dark);fill(x+10,195,11,3,colors.gold);
      fill(x+43,195,11,3,colors.gold);
    }
    const wobble=(n)=>reduced?0:Math.sin(tick+n)*1.4;
    person(70,92,'chef',state.staffMood,wobble(0));
    person(153,92,'chef',state.staffMood,wobble(2),1);
    person(249+Math.round(Math.sin(tick/2)*Math.min(state.queue,3)*3),126,
      'waiter',state.staffMood,wobble(1),1);
    const guests=state.phase==='intro'?2:state.round===0?4:5;
    const arriving=Math.max(0,Math.min(1,(ms-transitionAt)/650));
    for(let i=0;i<guests;i++){
      const destination=[305,341,394,430,465][i];
      const x=destination+(i>=2?(1-arriving)*(490-destination):0);
      const y=i%2?165:158;
      const mood=i%3===0?state.guestMood:
        state.guestMood==='angry'?'worried':state.guestMood==='happy'?'neutral':state.guestMood;
      person(x,y,'guest',mood,wobble(i+3),i);
    }
    if(state.phase!=='intro'){
      const guestIcon=state.guestMood==='happy'?'♥':state.guestMood==='neutral'?'…':'!';
      const staffIcon=state.staffMood==='stressed'?'!':state.staffMood==='focused'?'✓':'…';
      bubble(337,133,guestIcon,state.guestMood==='happy'?colors.green:state.guestMood==='neutral'?colors.cream:colors.red);
      bubble(153,62,staffIcon,state.staffMood==='stressed'?colors.red:colors.green);
    }
    // Status strip belongs to the imagined game, not real business metrics.
    fill(0,248,480,22,colors.dark);
    word(state.phase==='intro'?'READY / LISTO':ShiftGame.events[Math.min(state.round,2)].time,
      14,263,colors.gold,10);
    word(t(['FICTIONAL SERVICE','SERVICIO FICTICIO']),300,263,colors.cream,9);
  }
  function animation(ms) {
    if (visible && !document.hidden) scene(ms);
    window.requestAnimationFrame(animation);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {visible=entries[0].isIntersecting;},
      {rootMargin:'120px'}).observe(canvas);
  }
  window.requestAnimationFrame(animation);
  function meter(name,value) {
    const names={service:['Service','Servicio'],team:['Team','Equipo'],margin:['Margin','Margen']};
    return '<div class="shift-meter"><div><span>'+t(names[name])+'</span><strong>'+value+'</strong></div>'+
      '<div class="shift-track"><span style="width:'+value+'%"></span></div></div>';
  }
  const button=(label,action,index='')=>'<button type="button" class="shift-button" data-shift="'+action+'"'+
    (index!==''?' data-choice="'+index+'"':'')+'>'+label+'</button>';
  function render() {
    metrics.innerHTML=meter('service',state.service)+meter('team',state.team)+meter('margin',state.margin);
    progress.textContent=state.phase==='intro'?t(['NEW GAME · 3 INCIDENTS','NUEVA PARTIDA · 3 INCIDENCIAS']):
      state.phase==='end'?t(['SHIFT COMPLETE','TURNO TERMINADO']):
      t(['INCIDENT','INCIDENCIA'])+' '+(state.round+1)+' / 3';
    if (state.phase==='intro') {
      panel.innerHTML='<p class="shift-time">21:00 · '+t(['SATURDAY SERVICE','SERVICIO DEL SÁBADO'])+'</p>'+
        '<h3>'+t(['Survive the shift','Sobrevive al turno'])+'</h3><p>'+t([
          'A full restaurant. A busy kitchen. Three decisions. Watch the team and guests react as you manage the service.',
          'Un restaurante lleno. Cocina a tope. Tres decisiones. Mira cómo reaccionan el equipo y los clientes mientras gestionas el servicio.'])+'</p>'+
        '<p class="shift-fine">'+t(['Fictional scenario · No timer · Your choices stay in this browser',
          'Escenario ficticio · Sin cronómetro · Tus decisiones se quedan en este navegador'])+'</p>'+
        button(t(['START SERVICE →','EMPEZAR SERVICIO →']),'next');
    } else if (state.phase==='choice') {
      const event=ShiftGame.events[state.round];
      panel.innerHTML='<p class="shift-time">'+event.time+' · '+t(['NEW INCIDENT','NUEVA INCIDENCIA'])+'</p>'+
        '<h3>'+t(event.title)+'</h3><p>'+t(event.story)+'</p><div class="shift-choices">'+
        event.choices.map((choice,i)=>button('<span class="shift-key">'+(i+1)+'</span>'+t(choice.label),'choose',i)).join('')+'</div>';
    } else if (state.phase==='feedback') {
      const choice=ShiftGame.events[state.round].choices[state.history.at(-1)];
      panel.innerHTML='<p class="shift-time">'+t(['AFTER YOUR DECISION','DESPUÉS DE TU DECISIÓN'])+'</p>'+
        '<h3>'+t(['The restaurant reacts','El restaurante reacciona'])+'</h3><p>'+t(choice.reply)+'</p>'+
        button(state.round===2?t(['SEE THE ENDING →','VER EL FINAL →']):
          t(['NEXT INCIDENT →','SIGUIENTE INCIDENCIA →']),'next');
    } else {
      const weakest=ShiftGame.ending(state);
      const endings={
        service:{title:['A service with friction','Un servicio con fricciones'],
          body:['The guest experience took the hardest hit. A clear handoff between kitchen, floor and POS would make the next shift less reactive.',
            'La experiencia del cliente sufrió más. Un traspaso claro entre cocina, sala y TPV haría el siguiente servicio menos reactivo.']},
        team:{title:['The team carried the cost','El equipo pagó el coste'],
          body:['The shift moved forward, but effort and fatigue absorbed the pressure. Look at staffing, prep and menu complexity before asking for more.',
            'El turno salió adelante, pero el esfuerzo y el cansancio absorbieron la presión. Revisaría plantilla, preparación y complejidad de carta antes de pedir más.']},
        margin:{title:['A calmer shift, with a trade-off','Un turno más tranquilo, con contrapartida'],
          body:['You protected the experience and the team. Now review demand, availability and contribution so those choices are financially sustainable.',
            'Protegiste la experiencia y al equipo. Ahora toca revisar demanda, disponibilidad y contribución para que esas decisiones sean sostenibles.']}
      };
      const end=endings[weakest];
      panel.innerHTML='<p class="shift-time">23:00 · '+t(['END OF SERVICE','FIN DE SERVICIO'])+'</p>'+
        '<h3>'+t(end.title)+'</h3><p>'+t(end.body)+'</p><div class="shift-take"><strong>'+t([
          'Rodrigo’s read','La lectura de Rodrigo'])+'</strong><p>'+t([
          'The useful question is not whether you survived tonight. It is what you would change in the process so the same decision is easier tomorrow.',
          'La pregunta útil no es si sobreviviste hoy. Es qué cambiarías en el proceso para que mañana esa decisión resulte más fácil.'])+'</p></div>'+
        button(t(['PLAY AGAIN ↺','JUGAR DE NUEVO ↺']),'restart');
    }
    label.textContent=t(['Fictional restaurant scene: two cooks, a waiter and guests. Current guest mood: ',
      'Escena ficticia de restaurante: dos cocineros, un camarero y clientes. Estado de los clientes: '])+
      t(({happy:['happy','contentos'],neutral:['neutral','neutrales'],worried:['worried','preocupados'],
        angry:['upset','descontentos']})[state.guestMood]);
    feedback.textContent=state.phase==='feedback'?t(ShiftGame.events[state.round].choices[state.history.at(-1)].reply):'';
    scene(0);
  }
  root.addEventListener('click',event=>{
    const control=event.target.closest('[data-shift]');
    if(!control || !root.contains(control))return;
    if(control.dataset.shift==='restart')state=ShiftGame.initial();
    else if(control.dataset.shift==='choose')state=ShiftGame.choose(state,Number(control.dataset.choice));
    else if(control.dataset.shift==='next')state=ShiftGame.next(state);
    transitionAt=window.performance?.now?.() || 0;
    render();
    panel.querySelector('button')?.focus({preventScroll:true});
  });
  window.renderShift=render;
  render();
};
