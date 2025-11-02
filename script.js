// =========================================================
// script.js - Lógica do Jogo Rocket X
// =========================================================

// Variáveis de Estado Global
let saldo = 1000;
let multiplicador = 1.00;
let isBettingPhase = true;
let isFlying = false;
let gameTimer = null;
let betData = {
    1: { apostado: false, valor: 0, sacado: false, ganho: 0 },
    2: { apostado: false, valor: 0, sacado: false, ganho: 0 }
};
let crashPoint = 0;

// Referências de Elementos do DOM
const saldoDisplay = document.getElementById('saldo');
const multiplicadorDisplay = document.getElementById('multiplicador-display');
const messageDisplay = document.getElementById('message');
const historyList = document.getElementById('history-list');
const rocket = document.getElementById('rocket');
const flame = document.querySelector('.flame');
const starsLayer1 = document.getElementById('stars-layer-1');
const starsLayer2 = document.getElementById('stars-layer-2');
const starsLayer3 = document.getElementById('stars-layer-3');
const crashSound = document.getElementById('crash-sound');
const winSound = document.getElementById('win-sound');
const bgMusic = document.getElementById('background-music');

// =========================================================
// 1. Funções de Inicialização e UI
// =========================================================

function updateUI() {
    saldoDisplay.textContent = `Capital: ${saldo.toFixed(2)} Créditos`;

    // Atualiza o texto do botão de Créditos com o saldo atual (apenas para efeito)
    const btnCreditos = document.getElementById('ganhar-creditos');
    btnCreditos.innerHTML = `📺 Assistir Anúncio (+20 Combustível)`;
}

function updateBetControls() {
    for (let slot = 1; slot <= 2; slot++) {
        const btnApostar = document.querySelector(`.btn-apostar[data-slot="${slot}"]`);
        const btnSacar = document.querySelector(`.btn-sacar[data-slot="${slot}"]`);
        const statusMessage = document.getElementById(`status-${slot}`);
        const input = document.querySelector(`.aposta-input[data-slot="${slot}"]`);

        if (isBettingPhase) {
            // Fase de Aposta: Permite Apostar
            btnApostar.disabled = betData[slot].apostado;
            btnApostar.textContent = betData[slot].apostado ? `APOSTADO: ${betData[slot].valor}` : 'APOSTAR';
            btnSacar.disabled = true;
            input.disabled = betData[slot].apostado;
            
            if (betData[slot].apostado) {
                 statusMessage.innerHTML = `<span class="warning">Aguardando Início...</span>`;
            } else {
                 statusMessage.textContent = '';
            }

        } else if (isFlying) {
            // Fase de Voo: Permite Sacar (se apostou)
            btnApostar.disabled = true;
            btnApostar.textContent = betData[slot].apostado ? `Aguarde...` : 'APOSTAR';

            if (betData[slot].apostado && !betData[slot].sacado) {
                btnSacar.disabled = false;
                const valorAtual = (betData[slot].valor * multiplicador).toFixed(2);
                btnSacar.textContent = `SACAR ${valorAtual}`;
                statusMessage.innerHTML = `<span class="success">Ganhando: ${valorAtual}x</span>`;

            } else if (betData[slot].apostado && betData[slot].sacado) {
                btnSacar.disabled = true;
                const ganho = betData[slot].ganho.toFixed(2);
                btnSacar.textContent = `SAQUE EFETUADO`;
                statusMessage.innerHTML = `<span class="success">Ganho: ${ganho}x</span>`;
            } else {
                btnSacar.disabled = true;
                statusMessage.textContent = 'Não apostado.';
            }

        } else {
            // Fase Pós-Crash: Tudo Desabilitado
            btnApostar.disabled = true;
            btnSacar.disabled = true;
            
            // Limpa o status para o próximo ciclo
            if (!betData[slot].apostado) {
                statusMessage.textContent = ''; 
            }
        }
    }
}

// =========================================================
// 2. Lógica do Jogo Principal
// =========================================================

function apostar(slot) {
    if (!isBettingPhase) return;

    const input = document.querySelector(`.aposta-input[data-slot="${slot}"]`);
    let valorAposta = parseFloat(input.value);

    if (isNaN(valorAposta) || valorAposta <= 0) {
        alert('O valor da aposta deve ser um número positivo.');
        return;
    }
    if (valorAposta > saldo) {
        alert('Saldo insuficiente!');
        return;
    }

    // Efetiva a aposta
    saldo -= valorAposta;
    betData[slot] = { 
        apostado: true, 
        valor: valorAposta, 
        sacado: false, 
        ganho: 0 
    };

    updateUI();
    updateBetControls();
}

function sacar(slot) {
    if (!isFlying || !betData[slot].apostado || betData[slot].sacado) return;

    const ganho = betData[slot].valor * multiplicador;
    saldo += ganho;

    betData[slot].sacado = true;
    betData[slot].ganho = ganho;

    // Efeito de som
    winSound.currentTime = 0;
    winSound.play();

    // Atualiza a mensagem de status
    const statusMessage = document.getElementById(`status-${slot}`);
    statusMessage.innerHTML = `<span class="success">SAQUE EM ${multiplicador.toFixed(2)}x. Ganho: ${ganho.toFixed(2)}</span>`;

    updateUI();
    updateBetControls();
}

function startGameCycle() {
    resetGame();
    
    // 1. Fase de Aposta (5 segundos)
    messageDisplay.textContent = 'Fase de Aposta: 5 Segundos';
    let countdown = 5;
    
    const bettingInterval = setInterval(() => {
        countdown--;
        messageDisplay.textContent = `Fase de Aposta: ${countdown} Segundos...`;
        
        if (countdown <= 0) {
            clearInterval(bettingInterval);
            startFlight();
        }
    }, 1000);
}

function startFlight() {
    isBettingPhase = false;
    isFlying = true;
    multiplicador = 1.00;
    
    // Gera o ponto de crash aleatório (entre 1.01x e 10.00x)
    // Usando uma distribuição logarítmica para mais crashes baixos (mais realista em crash games)
    const r = Math.random(); 
    crashPoint = 1 + (Math.log(1 - r) / -0.05); 
    if (crashPoint < 1.01) crashPoint = 1.01;
    if (crashPoint > 50) crashPoint = 50.00; // Limite máximo
    crashPoint = parseFloat(crashPoint.toFixed(2));
    
    // Inicia Animações e Multiplicador
    multiplicadorDisplay.classList.remove('status-bet-ready');
    multiplicadorDisplay.classList.add('status-flying');
    messageDisplay.textContent = '🚀 Foguete Subindo!';
    
    startRocketAnimation();
    updateBetControls();
    
    // Lógica do Multiplicador
    const startTime = Date.now();
    gameTimer = setInterval(() => {
        if (!isFlying) {
            clearInterval(gameTimer);
            return;
        }

        const elapsed = (Date.now() - startTime) / 1000;
        
        // Fórmula de crescimento (exponencial suave)
        multiplicador = 1 + Math.exp(elapsed * 0.4) - 1;
        
        // Verifica o Crash
        if (multiplicador >= crashPoint) {
            crashGame();
            return;
        }

        multiplicadorDisplay.textContent = multiplicador.toFixed(2) + 'x';
        
        // Efeito de Parallax: as estrelas se movem mais rápido
        const parallaxFactor = Math.min(10, multiplicador / 5);
        starsLayer1.style.transform = `translateY(${elapsed * 2 * parallaxFactor}px)`;
        starsLayer2.style.transform = `translateY(${elapsed * 1 * parallaxFactor}px)`;
        starsLayer3.style.transform = `translateY(${elapsed * 0.5 * parallaxFactor}px)`;

    }, 100); // Atualiza a cada 100ms
}

function crashGame() {
    isFlying = false;
    clearInterval(gameTimer);
    
    // Efeito de som
    crashSound.currentTime = 0;
    crashSound.play();

    // 1. Atualizar Display
    multiplicadorDisplay.textContent = multiplicador.toFixed(2) + 'x';
    multiplicadorDisplay.classList.remove('status-flying');
    multiplicadorDisplay.classList.add('status-crashed');
    messageDisplay.textContent = `💥 CRASH! Em ${multiplicador.toFixed(2)}x`;
    
    // 2. Animação de Crash do Foguete
    stopRocketAnimation(true);

    // 3. Verifica perdas e ganhos não sacados
    let totalPerdido = 0;
    let totalGanho = 0;

    for (const slot in betData) {
        const data = betData[slot];
        const statusMessage = document.getElementById(`status-${slot}`);
        
        if (data.apostado) {
            if (data.sacado) {
                totalGanho += data.ganho;
            } else {
                totalPerdido += data.valor;
                statusMessage.innerHTML = `<span class="error">Perdido! Não sacou antes de ${multiplicador.toFixed(2)}x</span>`;
            }
        }
    }
    
    // 4. Adiciona ao Histórico
    addToHistory(multiplicador);

    // 5. Próximo Jogo
    updateBetControls();

    // Inicia o próximo ciclo após um breve atraso
    setTimeout(startGameCycle, 4000); 
}

function resetGame() {
    isBettingPhase = true;
    isFlying = false;
    multiplicador = 1.00;
    
    betData = {
        1: { apostado: false, valor: 0, sacado: false, ganho: 0 },
        2: { apostado: false, valor: 0, sacado: false, ganho: 0 }
    };
    
    // Reset da UI e Animações
    multiplicadorDisplay.textContent = '1.00x';
    multiplicadorDisplay.classList.remove('status-flying', 'status-crashed');
    multiplicadorDisplay.classList.add('status-bet-ready');
    messageDisplay.textContent = 'Aguardando a fase de aposta...';
    
    // Reset da Animação do Foguete
    stopRocketAnimation(false);
    
    // Reset do Parallax
    starsLayer1.style.transform = 'translateY(0)';
    starsLayer2.style.transform = 'translateY(0)';
    starsLayer3.style.transform = 'translateY(0)';

    updateUI();
    updateBetControls();
}


// =========================================================
// 3. Funções de Animação
// =========================================================

function startRocketAnimation() {
    flame.classList.add('flame-active');
    rocket.classList.add('rocket-flying');
    rocket.classList.remove('rocket-crashed');
}

function stopRocketAnimation(crashed) {
    flame.classList.remove('flame-active');
    rocket.classList.remove('rocket-flying');
    
    if (crashed) {
        // Efeito visual de explosão (o CSS cuida disso via keyframes)
        rocket.classList.add('rocket-crashed');
    } else {
        // Apenas volta para a posição inicial (reset)
        rocket.style.transform = 'translateX(-50%) translateY(0px)';
        rocket.style.opacity = 0;
    }
}

// =========================================================
// 4. Funções de Histórico e Extras
// =========================================================

function addToHistory(result) {
    const li = document.createElement('li');
    const resultFixed = result.toFixed(2) + 'x';

    // Determina a classe de cor
    if (result < 1.50) {
        li.classList.add('low-result');
    } else if (result < 3.00) {
        li.classList.add('mid-result');
    } else {
        li.classList.add('high-result');
    }

    li.textContent = resultFixed;

    // Adiciona no início da lista (os mais recentes no topo)
    if (historyList.firstChild) {
        historyList.insertBefore(li, historyList.firstChild);
    } else {
        historyList.appendChild(li);
    }
    
    // Limita a lista a 15 itens
    if (historyList.children.length > 15) {
        historyList.removeChild(historyList.lastChild);
    }
}

function ganharCreditosAnuncio() {
    // Simula ganho de créditos via anúncio
    saldo += 20;
    alert("Créditos adicionados! (+20)");
    updateUI();
}

// =========================================================
// 5. Inicialização (Executado ao carregar a página)
// =========================================================

// Função para iniciar a música (precisa de interação do usuário na maioria dos navegadores)
function startBackgroundMusic() {
    try {
        bgMusic.play();
    } catch (e) {
        // A música de fundo será iniciada quando o usuário interagir
    }
}

// Inicia o ciclo de jogo e o primeiro estado de aposta
document.addEventListener('DOMContentLoaded', () => {
    // Tenta iniciar a música
    startBackgroundMusic();
    
    // O jogo começa imediatamente na fase de aposta
    startGameCycle(); 
});


// Funções globais para serem acessadas pelos botões HTML
window.apostar = apostar;
window.sacar = sacar;
window.ganharCreditosAnuncio = ganharCreditosAnuncio;
