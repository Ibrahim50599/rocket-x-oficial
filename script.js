// ====================================================================
// script.js - LÓGICA COMPLETA E PROFISSIONAL DO ROCKET X
// (Parte 2: Integração de Áudio Dinâmico e Parallax Aprimorado)
// ====================================================================

// --- 1. VARIÁVEIS GLOBAIS DE ESTADO ---
let saldo = 1000;
const CREDITOS_POR_ANUNCIO = 20;
const CREDITOS_BONUS_DIARIO = 50;
const BETTING_TIME_MS = 6000; // Tempo de aposta de 6 segundos

let multiplicador = 1.00;
let crashPoint = 0;
let gameInterval;
let gameRunning = false;
let bettingPhase = true;
let timeRemaining = 0;

let history = [];
const MAX_HISTORY = 8;
let simulatedPlayers = 0;
let musicStarted = false;

// Estrutura para Gerenciar as Duas Apostas
let slots = {
    1: {
        apostaAtual: 0,
        sacado: false,
        sacadoMulti: 0,
        isApostando: false
    },
    2: {
        apostaAtual: 0,
        sacado: false,
        sacadoMulti: 0,
        isApostando: false
    }
};

// --- 2. REFERÊNCIAS DOM (HTML) ---
const saldoDisplay = document.getElementById('saldo');
const multiDisplay = document.getElementById('multiplicador-display');
const msgDisplay = document.getElementById('message');
const btnGanharCreditos = document.getElementById('ganhar-creditos');
const rocket = document.getElementById('rocket');
const flame = document.querySelector('#rocket .flame');
// REFERÊNCIAS PARA AS NOVAS CAMADAS DE ESTRELAS
const starsLayer1 = document.getElementById('stars-layer-1');
const starsLayer2 = document.getElementById('stars-layer-2');
const starsLayer3 = document.getElementById('stars-layer-3');
const historyList = document.getElementById('history-list');
const playersCountDisplay = document.getElementById('players-count');

// Array de Referências para os Painéis
const betPanels = [
    null,
    {
        input: document.querySelector('.aposta-panel[data-slot="1"] .aposta-input'),
        btnApostar: document.querySelector('.btn-apostar[data-slot="1"]'),
        btnSacar: document.querySelector('.btn-sacar[data-slot="1"]'),
        statusMsg: document.getElementById('status-1')
    },
    {
        input: document.querySelector('.aposta-panel[data-slot="2"] .aposta-input'),
        btnApostar: document.querySelector('.btn-apostar[data-slot="2"]'),
        btnSacar: document.querySelector('.btn-sacar[data-slot="2"]'),
        statusMsg: document.getElementById('status-2')
    }
];

// --- 3. REFERÊNCIAS DE ÁUDIO (WEBAUDIO API DINÂMICA) ---
const crashSound = document.getElementById('crash-sound');
const winSound = document.getElementById('win-sound');
const bgMusic = document.getElementById('background-music');

// Web Audio API para Som Dinâmico do Foguete
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let rocketNoise = null;
let rocketGain = null;
let rocketFilter = null;
// --------------------------------------------------------

// --- 4. FUNÇÕES AUXILIARES ---

function playSound(audioElement) {
    // Tenta resumir o contexto no primeiro clique de áudio para iOS/Chrome Mobile
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    audioElement.currentTime = 0;
    audioElement.volume = 0.5;
    audioElement.play().catch(e => console.warn('Aviso: Áudio bloqueado ou erro ao tocar.'));
}

function startMusic() {
    bgMusic.volume = 0.3;
    playSound(bgMusic); // Reutiliza a função playSound para garantir o resume
}

function atualizarSaldo(valor) {
    saldo = Math.max(0, Math.floor(valor));
    saldoDisplay.textContent = `Capital: ${saldo} Créditos`;
    localStorage.setItem('rocketXSaldo', saldo);
}

function atualizarHistorico(novoResultado) {
    history.unshift(novoResultado);
    if (history.length > MAX_HISTORY) {
        history.pop();
    }

    historyList.innerHTML = '';
    history.forEach(result => {
        const li = document.createElement('li');
        li.textContent = `${result.toFixed(2)}x`;

        let resultClass;
        if (result < 2.0) resultClass = 'low-result';
        else if (result < 5.0) resultClass = 'mid-result';
        else resultClass = 'high-result';

        li.className = resultClass;
        historyList.appendChild(li);
    });
    localStorage.setItem('rocketXHistory', JSON.stringify(history));
}

// 💰 FUNÇÃO DE MONETIZAÇÃO (SIMULADA - ANÚNCIO)
function ganharCreditosAnuncio() {
    if (gameRunning || bettingPhase) {
        msgDisplay.innerHTML = '<span class="error">Aguarde o ciclo de aposta/voo terminar.</span>';
        return;
    }

    btnGanharCreditos.disabled = true;
    msgDisplay.innerHTML = '<span class="warning">📺 Exibindo Anúncio Recompensado... (5s)</span>';

    setTimeout(() => {
        atualizarSaldo(saldo + CREDITOS_POR_ANUNCIO);
        msgDisplay.innerHTML = `<span class="success">🥳 Sucesso! Você recebeu ${CREDITOS_POR_ANUNCIO} créditos de Combustível.</span>`;
        btnGanharCreditos.disabled = false;
        playSound(winSound);

        if (!gameRunning) startBettingPhase();
    }, 5000);
}

// 🎁 FUNÇÕES DE BÔNUS DIÁRIO
function verificarEaplicarBonusDiario() {
    const ultimaRecargaTimestamp = localStorage.getItem('rocketXDailyBonusTime');
    const agora = Date.now();
    const VINTE_QUATRO_HORAS_MS = 24 * 60 * 60 * 1000;

    if (!ultimaRecargaTimestamp || (agora - parseInt(ultimaRecargaTimestamp) >= VINTE_QUATRO_HORAS_MS)) {
        aplicarBonusDiario();
    }
}

function aplicarBonusDiario() {
    atualizarSaldo(saldo + CREDITOS_BONUS_DIARIO);
    localStorage.setItem('rocketXDailyBonusTime', Date.now()); // Salva o tempo atual

    alert(`🎉 BÔNUS DIÁRIO! Você recebeu ${CREDITOS_BONUS_DIARIO} créditos!`);
}

// ---------------------------------------------------------
// NOVO: GERAÇÃO E CONTROLE DO RUÍDO DO FOGUETE (WEBAUDIO API)
// ---------------------------------------------------------

function startRocketThrustSound() {
    if (rocketNoise) return;

    // 1. Cria o Buffer de Ruído (White Noise)
    const bufferSize = audioContext.sampleRate * 1.5;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    // 2. Cria as fontes e nós
    rocketNoise = audioContext.createBufferSource();
    rocketNoise.buffer = buffer;
    rocketNoise.loop = true;
    
    rocketFilter = audioContext.createBiquadFilter(); 
    rocketFilter.type = 'bandpass';
    rocketFilter.frequency.value = 100;
    
    rocketGain = audioContext.createGain(); 
    rocketGain.gain.setValueAtTime(0, audioContext.currentTime);

    // 3. Conecta os nós: Ruído -> Filtro -> Ganho -> Destino
    rocketNoise.connect(rocketFilter);
    rocketFilter.connect(rocketGain);
    rocketGain.connect(audioContext.destination);

    // 4. Inicia o som com um Fade-In suave
    rocketNoise.start();
    // Inicia o volume em 0.4 e sobe para o primeiro impulso em 1.5s
    rocketGain.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 1.5); 
}

function updateRocketThrustSound(multi) {
    if (!rocketGain || !rocketFilter) return;

    // Aumenta o volume e a frequência do filtro (pitch/cor do som) à medida que o multi sobe
    // A intensidade é calculada para ser perceptível e emocionante
    const intensity = Math.min(1, (multi - 1.0) / 10); // Limita a intensidade em 10x
    
    // Volume (começa em 0.4, vai até 0.8)
    rocketGain.gain.setValueAtTime(0.4 + intensity * 0.4, audioContext.currentTime);

    // Frequência do filtro (muda o pitch do ruído, de 100Hz para 4000Hz)
    const newFrequency = 100 + intensity * 3900;
    rocketFilter.frequency.linearRampToValueAtTime(newFrequency, audioContext.currentTime + 0.1);
}

function stopRocketThrustSound() {
    if (rocketNoise) {
        // Fade-out rápido
        rocketGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
        
        // Para o buffer source (o som) após o fade-out
        setTimeout(() => {
            if (rocketNoise) {
                rocketNoise.stop();
                rocketNoise.disconnect();
                rocketNoise = null;
                rocketGain = null;
                rocketFilter = null;
            }
        }, 500);
    }
}


// --- 5. LÓGICA DO CICLO DO JOGO E ANIMAÇÃO ---

function startBettingPhase() {
    clearInterval(gameInterval);
    bettingPhase = true;
    gameRunning = false;
    timeRemaining = BETTING_TIME_MS / 1000;

    multiDisplay.textContent = '1.00x';
    multiDisplay.className = 'status-bet-ready';

    // Reseta e habilita as slots
    for (let slotId = 1; slotId <= 2; slotId++) {
        slots[slotId] = { apostaAtual: 0, sacado: false, sacadoMulti: 0, isApostando: false }; // Reseta o objeto
        betPanels[slotId].btnApostar.disabled = false;
        betPanels[slotId].btnSacar.disabled = true;
        betPanels[slotId].input.disabled = false;
        betPanels[slotId].statusMsg.textContent = 'PRONTO';
        betPanels[slotId].btnApostar.textContent = 'APOSTAR'; 
    }

    // Reseta Animação do Foguete
    rocket.style.transition = 'none';
    rocket.style.setProperty('--rocket-y', '0px'); // Reseta a variável CSS de altura
    rocket.style.transform = 'translateX(-50%) translateY(0)';
    rocket.classList.remove('rocket-crashed', 'rocket-flying');
    flame.classList.remove('flame-active');

    // Reseta o Parallax das Estrelas
    starsLayer1.style.transform = 'translateY(0)';
    starsLayer2.style.transform = 'translateY(0)';
    starsLayer3.style.transform = 'translateY(0)';


    simulatedPlayers = Math.floor(Math.random() * 101) + 50;

    gameInterval = setInterval(updateBettingPhase, 1000);
}

function updateBettingPhase() {
    playersCountDisplay.textContent = `👥 ${simulatedPlayers} Pessoas Apostando (Lançamento em ${timeRemaining}s)`;

    if (timeRemaining <= 0) {
        clearInterval(gameInterval);
        msgDisplay.textContent = 'APOSTAS FECHADAS! Foguete decolando...';

        for (let slotId = 1; slotId <= 2; slotId++) {
            betPanels[slotId].btnApostar.disabled = true;
            betPanels[slotId].input.disabled = true;
        }

        setTimeout(() => iniciarRodada(), 1000);

    } else {
        msgDisplay.textContent = `APOSTE AGORA! Tempo restante: ${timeRemaining} segundos.`;
        timeRemaining--;
    }
}

function iniciarRodada() {
    clearInterval(gameInterval);
    gameRunning = true;
    bettingPhase = false;
    simulatedPlayers = 0; 
    playersCountDisplay.textContent = '🚀 FOGUETE VOANDO!';

    multiplicador = 1.00;
    multiDisplay.textContent = '1.00x';
    multiDisplay.className = 'status-flying';

    // Lógica aprimorada de crash point: 
    // Maior chance de cair baixo (85% para < 4.0x) e 15% de chance de subir alto
    let r = Math.random();
    if (r < 0.85) {
        crashPoint = parseFloat((Math.random() * 3 + 1.05).toFixed(2));
    } else {
        crashPoint = parseFloat((Math.random() * 10 + 4.0).toFixed(2));
    }

    // Ativa SACAR para slots ativas
    for (let slotId = 1; slotId <= 2; slotId++) {
        if (slots[slotId].isApostando) {
            betPanels[slotId].btnSacar.disabled = false;
            betPanels[slotId].statusMsg.textContent = 'VOANDO...';
        }
    }

    // Inicia Animação do Foguete e Fundo
    rocket.classList.add('rocket-flying');
    flame.classList.add('flame-active');
    
    // NOVO: Inicia o som do impulso dinâmico
    startRocketThrustSound();

    gameInterval = setInterval(updateGame, 50); // Loop mais rápido para animação super suave
}

function updateGame() {
    if (!gameRunning) return;

    // Lógica de Crescimento (mais suave e rápido)
    multiplicador += 0.01 + (multiplicador / 500); // Crescimento um pouco mais acelerado
    multiplicador = parseFloat(multiplicador.toFixed(2));

    multiDisplay.textContent = `${multiplicador.toFixed(2)}x`;
    
    // NOVO: Atualiza a intensidade do som
    updateRocketThrustSound(multiplicador);

    // --- ANIMAÇÃO PROFISSIONAL: Foguete e Parallax ---
    const gameAreaHeight = document.getElementById('game-area').offsetHeight;
    const max_travel = gameAreaHeight / 2.5; // Máximo que o foguete sobe visualmente

    // Calcula a Posição Y (baseado no multiplicador - curva logarítmica para suavizar no início)
    // Usa Math.log para que o movimento seja mais lento no início e mais rápido depois
    let rocketY = Math.min(max_travel, (Math.log(multiplicador) * max_travel / Math.log(10)));
    if (multiplicador > 10) { // Garante que continue subindo lentamente após 10x
        rocketY = max_travel;
    }


    // Efeito de tremer (shake)
    // O tremor aumenta com o multiplicador para simular a intensidade
    const shakeIntensity = Math.min(3, (multiplicador - 1.0) / 2); // Max 3px de shake
    const shakeX = Math.sin(Date.now() / 50) * shakeIntensity;
    const shakeY = Math.cos(Date.now() / 60) * shakeIntensity;


    // Aplica Animação ao Foguete usando variáveis CSS (para a animação de explosão)
    rocket.style.setProperty('--rocket-y', rocketY + 'px');
    rocket.style.setProperty('--shake-x', shakeX + 'px');

    rocket.style.transform = `translateX(calc(-50% + ${shakeX}px)) translateY(-${rocketY}px)`;


    // Efeito Parallax nas Estrelas (velocidades diferentes para profundidade)
    starsLayer1.style.transform = `translateY(${rocketY * 0.8}px)`; // Mais devagar
    starsLayer2.style.transform = `translateY(${rocketY * 1.5}px)`; // Médio
    starsLayer3.style.transform = `translateY(${rocketY * 2.5}px)`; // Mais rápido
    // ---------------------------------------------------


    // Verifica o Ponto de Colapso
    if (multiplicador >= crashPoint) {
        endGame();
        return;
    }

    // Atualiza o texto dos botões de saque
    for (let slotId = 1; slotId <= 2; slotId++) {
        if (slots[slotId].isApostando && !slots[slotId].sacado) {
            const ganhoPrevisto = slots[slotId].apostaAtual * multiplicador;
            // Mostra o ganho total (aposta + lucro)
            betPanels[slotId].btnSacar.textContent = `SACAR ${ganhoPrevisto.toFixed(2)}`; 
        }
    }
}

function endGame() {
    gameRunning = false;
    clearInterval(gameInterval);
    
    // NOVO: Para o som do impulso dinâmico
    stopRocketThrustSound();

    playSound(crashSound);

    // Efeitos Visuais de Colapso
    multiDisplay.textContent = `${multiplicador.toFixed(2)}x`;
    multiDisplay.className = 'status-crashed';

    // Foguete desaparece com a explosão (CSS keyframes)
    rocket.classList.add('rocket-crashed'); 
    flame.classList.remove('flame-active');
    
    // Para o movimento de fundo (remove a transição suave das estrelas)
    starsLayer1.style.transition = 'none';
    starsLayer2.style.transition = 'none';
    starsLayer3.style.transition = 'none';

    // Atualiza o Histórico
    if (multiplicador > 1.00) {
        atualizarHistorico(multiplicador);
    }

    // Processa Perdas e Saques
    for (let slotId = 1; slotId <= 2; slotId++) {
        const slot = slots[slotId];

        if (slot.isApostando) {
            if (!slot.sacado) {
                // Perdeu, o saldo já foi deduzido na aposta
                betPanels[slotId].statusMsg.innerHTML = `<span class="error">❌ PERDEU! Colapsou em ${multiplicador.toFixed(2)}x.</span>`;
            } else {
                // Sacou, já atualizado no sacar()
                betPanels[slotId].statusMsg.innerHTML = `<span class="success">✅ SACADO em ${slot.sacadoMulti.toFixed(2)}x.</span>`;
            }
        }
    }

    // Agendamento para a próxima rodada
    msgDisplay.textContent = `COLAPSO em ${multiplicador.toFixed(2)}x! Fase de aposta iniciando...`;

    setTimeout(() => {
        // Volta a transição suave das estrelas para o próximo voo
        starsLayer1.style.transition = 'transform 0.1s linear';
        starsLayer2.style.transition = 'transform 0.1s linear';
        starsLayer3.style.transition = 'transform 0.1s linear';
        
        startBettingPhase();
    }, 4000);
}

// ----------------------------------------------------------------------
// FUNÇÕES DE INTERAÇÃO DO USUÁRIO
// ----------------------------------------------------------------------

function apostar(slotId) {
    const slot = slots[slotId];
    const panel = betPanels[slotId];
    let aposta = parseInt(panel.input.value);

    if (!bettingPhase) {
        panel.statusMsg.innerHTML = `<span class="warning">Aguarde a fase de aposta.</span>`;
        return;
    }

    // 1. Validação
    if (isNaN(aposta) || aposta < 1) {
        panel.statusMsg.innerHTML = `<span class="error">Aposta inválida.</span>`;
        return;
    }
    
    // Calcula o total já apostado nas duas slots
    const totalApostado = slots[1].isApostando ? slots[1].apostaAtual : 0;
    const apostaAtualOutroSlot = slots[2].isApostando ? slots[2].apostaAtual : 0;
    
    // Saldo restante após outras apostas
    const saldoRestante = saldo - totalApostado - apostaAtualOutroSlot;

    if (aposta > saldoRestante) {
        panel.statusMsg.innerHTML = `<span class="error">Saldo insuficiente! Você só tem ${saldoRestante} restantes.</span>`;
        return;
    }
    
    // 🎵 INICIA MÚSICA DE FUNDO NO PRIMEIRO CLIQUE (Desbloqueio de áudio)
    if (!musicStarted) {
        startMusic();
        musicStarted = true;
    }
    
    // 2. Deduz o saldo (apenas o valor da aposta atual)
    atualizarSaldo(saldo - aposta);

    // 3. Configura a slot
    slot.apostaAtual = aposta;
    slot.isApostando = true;

    // 4. Atualiza a UI
    panel.btnApostar.disabled = true;
    panel.btnApostar.textContent = 'APOSTADO!';
    panel.input.disabled = true;
    panel.statusMsg.textContent = 'APOSTADO! Aguardando o voo.';
}


function sacar(slotId) {
    const slot = slots[slotId];
    const panel = betPanels[slotId];

    if (!slot.isApostando || slot.sacado || !gameRunning) return;

    const ganhoTotal = slot.apostaAtual * multiplicador;
    atualizarSaldo(saldo + ganhoTotal);
    const lucro = ganhoTotal - slot.apostaAtual;

    slot.sacado = true;
    slot.sacadoMulti = multiplicador;

    panel.btnSacar.disabled = true;
    panel.btnSacar.textContent = `✅ ${multiplicador.toFixed(2)}x`;
    panel.statusMsg.innerHTML = `<span class="success">🤑 Ganho: +${lucro.toFixed(0)} créditos!</span>`;

    playSound(winSound);
}

// ----------------------------------------------------------------------
// 6. INICIALIZAÇÃO
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Carrega o saldo salvo ou usa o valor inicial de 1000
    const savedSaldo = localStorage.getItem('rocketXSaldo');
    atualizarSaldo(savedSaldo ? parseInt(savedSaldo) : 1000);

    // Carrega o histórico salvo
    const savedHistory = localStorage.getItem('rocketXHistory');
    if (savedHistory) {
        try { history = JSON.parse(savedHistory); } catch (e) { history = []; }
    }
    atualizarHistorico(1.00);
    
    // 🎁 VERIFICA E APLICA O BÔNUS DIÁRIO
    verificarEaplicarBonusDiario(); 

    // Inicia a primeira fase de aposta
    setTimeout(() => startBettingPhase(), 1000);
});
