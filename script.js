// ====================================================================
// script.js - LÓGICA COMPLETA E PROFISSIONAL DO ROCKET X
// ====================================================================

// --- 1. VARIÁVEIS GLOBAIS DE ESTADO ---
let saldo = 1000;
const CREDITOS_POR_ANUNCIO = 20;
const CREDITOS_BONUS_DIARIO = 50; // NOVO: Valor do Bônus Diário
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
const starsBg = document.getElementById('stars-bg'); // NOVO: Fundo de estrelas
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

// --- 3. REFERÊNCIAS DE ÁUDIO ---
const crashSound = document.getElementById('crash-sound');
const winSound = document.getElementById('win-sound');
const bgMusic = document.getElementById('background-music');

// --- 4. FUNÇÕES AUXILIARES ---

function playSound(audioElement) {
    audioElement.currentTime = 0;
    audioElement.volume = 0.5;
    audioElement.play().catch(e => console.warn('Aviso: Áudio bloqueado.'));
}

function startMusic() {
    bgMusic.volume = 0.3;
    bgMusic.play().catch(e => console.warn('Aviso: Música de fundo bloqueada.'));
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

// 🎁 FUNÇÕES DE BÔNUS DIÁRIO (NOVO)

function verificarEaplicarBonusDiario() {
    const ultimaRecargaTimestamp = localStorage.getItem('rocketXDailyBonusTime');
    const agora = Date.now();
    const VINTE_QUATRO_HORAS_MS = 24 * 60 * 60 * 1000;

    // Se nunca recebeu, ou se já passaram 24h
    if (!ultimaRecargaTimestamp || (agora - parseInt(ultimaRecargaTimestamp) >= VINTE_QUATRO_HORAS_MS)) {
        aplicarBonusDiario();
    }
    // Caso contrário, não faz nada e o jogo inicia normalmente.
}

function aplicarBonusDiario() {
    atualizarSaldo(saldo + CREDITOS_BONUS_DIARIO);
    localStorage.setItem('rocketXDailyBonusTime', Date.now()); // Salva o tempo atual

    alert(`🎉 BÔNUS DIÁRIO! Você recebeu ${CREDITOS_BONUS_DIARIO} créditos!`);
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
    rocket.style.transform = 'translateX(-50%) translateY(0)';
    rocket.classList.remove('rocket-crashed', 'rocket-flying');
    flame.classList.remove('flame-active');
    starsBg.style.transform = 'translateY(0)'; // Reseta fundo

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

    // Gera crash point mais realista
    let r = Math.random();
    if (r < 0.8) {
        crashPoint = parseFloat((Math.random() * 3 + 1.05).toFixed(2));
    } else {
        crashPoint = parseFloat((Math.random() * 6 + 4.0).toFixed(2));
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

    gameInterval = setInterval(updateGame, 100);
}

function updateGame() {
    if (!gameRunning) return;

    // Lógica de Crescimento
    multiplicador += 0.01 + (multiplicador / 700);
    multiplicador = parseFloat(multiplicador.toFixed(2));

    multiDisplay.textContent = `${multiplicador.toFixed(2)}x`;

    // --- ANIMAÇÃO PROFISSIONAL: Foguete e Parallax ---
    const gameAreaHeight = document.getElementById('game-area').offsetHeight;
    const max_travel = gameAreaHeight / 2; // Máximo que o foguete sobe visualmente

    // Calcula a Posição Y (baseado no multiplicador)
    let rocketY = Math.min(max_travel, (multiplicador - 1.0) * 40);

    // Efeito de tremer (shake)
    const shake = Math.sin(Date.now() / 50) * 0.5;

    // Aplica Animação ao Foguete
    rocket.style.transition = 'transform 0.1s linear';
    rocket.style.transform = `translateX(calc(-50% + ${shake}px)) translateY(-${rocketY}px)`;

    // Efeito Parallax nas Estrelas
    let parallaxY = rocketY * 2; 
    starsBg.style.transform = `translateY(${parallaxY}px)`;
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
            betPanels[slotId].btnSacar.textContent = `SACAR ${ganhoPrevisto.toFixed(2)}x`;
        }
    }
}

function endGame() {
    gameRunning = false;
    clearInterval(gameInterval);
    playSound(crashSound);

    // Efeitos Visuais de Colapso
    multiDisplay.textContent = `${multiplicador.toFixed(2)}x`;
    multiDisplay.className = 'status-crashed';

    // Foguete some com a explosão
    rocket.classList.add('rocket-crashed'); 
    flame.classList.remove('flame-active');
    
    // Para o movimento de fundo
    starsBg.style.transition = 'none';

    // Atualiza o Histórico
    if (multiplicador > 1.00) {
        atualizarHistorico(multiplicador);
    }

    // Processa Perdas e Saques
    for (let slotId = 1; slotId <= 2; slotId++) {
        const slot = slots[slotId];

        if (slot.isApostando) {
            if (!slot.sacado) {
                betPanels[slotId].statusMsg.innerHTML = `<span class="error">❌ PERDEU! Colapsou em ${multiplicador.toFixed(2)}x.</span>`;
            } else {
                betPanels[slotId].statusMsg.innerHTML = `<span class="success">✅ SACADO em ${slot.sacadoMulti.toFixed(2)}x.</span>`;
            }
        }
    }

    // Agendamento para a próxima rodada
    msgDisplay.textContent = `COLAPSO em ${multiplicador.toFixed(2)}x! Fase de aposta iniciando...`;

    setTimeout(() => {
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
    if (isNaN(aposta) || aposta < 1 || aposta > saldo) {
        panel.statusMsg.innerHTML = `<span class="error">${aposta > saldo ? 'Saldo insuficiente!' : 'Aposta inválida.'}</span>`;
        return;
    }
    
    // 🎵 INICIA MÚSICA DE FUNDO NO PRIMEIRO CLIQUE (Desbloqueio de áudio)
    if (!musicStarted) {
        startMusic();
        musicStarted = true;
    }
    
    // 2. Deduz o saldo
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
    panel.btnSacar.textContent = `SACADO!`;
    panel.statusMsg.innerHTML = `<span class="success">🤑 Sacou ${lucro.toFixed(0)} créditos em ${multiplicador.toFixed(2)}x.</span>`;

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
