// =========================================================
// script.js - Lógica do Jogo Rocket X (Versão Corrigida e Completa)
// =========================================================

// =========================================================
// 1. Variáveis de Estado Global e Referências do DOM
// =========================================================

let saldo = 1000;
let multiplicador = 1.00;
let isBettingPhase = true;
let isFlying = false;
let gameTimer = null;
let countdownTimer = null;
let crashPoint = 0;

let betData = {
    1: { apostado: false, valor: 0, sacado: false, ganho: 0 },
    2: { apostado: false, valor: 0, sacado: false, ganho: 0 }
};

// Referências de Elementos do DOM
const saldoDisplay = document.getElementById('saldo');
const multiplicadorDisplay = document.getElementById('multiplicador-display');
const messageDisplay = document.getElementById('message');
const historyList = document.getElementById('history-list');
const rocket = document.getElementById('rocket');
const flame = document.querySelector('.flame');
const starsBg = document.getElementById('stars-bg'); // Agora usamos a div stars-bg
const playersCountDisplay = document.getElementById('players-count');

// Referências de Áudio
const crashSound = document.getElementById('crash-sound');
const winSound = document.getElementById('win-sound');
const bgMusic = document.getElementById('background-music');

// =========================================================
// 2. Funções de Atualização da UI
// =========================================================

function updateUI() {
    saldoDisplay.textContent = `Capital: ${saldo.toFixed(2)} Créditos`;
    // Simula a contagem de jogadores
    playersCountDisplay.textContent = `👥 ${Math.floor(Math.random() * 50) + 10} Pessoas Apostando...`;
}

function updateBetControls() {
    for (let slot = 1; slot <= 2; slot++) {
        const btnApostar = document.querySelector(`.btn-apostar[data-slot="${slot}"]`);
        const btnSacar = document.querySelector(`.btn-sacar[data-slot="${slot}"]`);
        const statusMessage = document.getElementById(`status-${slot}`);
        const input = document.querySelector(`.aposta-input[data-slot="${slot}"]`);
        const apostaEfetuada = betData[slot].apostado;

        input.disabled = apostaEfetuada || !isBettingPhase;
        btnApostar.disabled = apostaEfetuada || !isBettingPhase;
        btnSacar.disabled = true; // Desabilita por padrão

        if (isBettingPhase) {
            // Fase de Aposta
            btnApostar.textContent = apostaEfetuada ? `APOSTADO: ${betData[slot].valor.toFixed(2)}` : 'APOSTAR';
            statusMessage.innerHTML = apostaEfetuada ? `<span class="warning">Aguardando Início...</span>` : '';
        } 
        
        if (isFlying) {
            // Fase de Voo
            if (apostaEfetuada) {
                btnApostar.textContent = 'Em Voo...';
                if (!betData[slot].sacado) {
                    // Pode Sacar
                    btnSacar.disabled = false;
                    const valorAtual = (betData[slot].valor * multiplicador).toFixed(2);
                    btnSacar.textContent = `SACAR ${valorAtual}`;
                    statusMessage.innerHTML = `<span class="success">Ganhando: ${valorAtual}x</span>`;
                } else {
                    // Já Sacou
                    btnSacar.disabled = true;
                    btnSacar.textContent = `SAQUE EM ${betData[slot].multiplicadorSaque.toFixed(2)}x`;
                    statusMessage.innerHTML = `<span class="success">Ganho: ${betData[slot].ganho.toFixed(2)}</span>`;
                }
            } else {
                 btnApostar.textContent = 'Não Apostado';
            }
        } 
        
        if (!isFlying && !isBettingPhase) {
            // Fase Pós-Crash
            btnApostar.textContent = 'APOSTAR';
            btnSacar.textContent = 'SACAR';
            if (apostaEfetuada && !betData[slot].sacado) {
                 statusMessage.innerHTML = `<span class="error">Perdeu! Crash em ${multiplicador.toFixed(2)}x</span>`;
            }
            if (!apostaEfetuada) {
                 statusMessage.textContent = '';
            }
        }
    }
}

// =========================================================
// 3. Lógica Principal do Jogo
// =========================================================

function apostar(slot) {
    if (!isBettingPhase || betData[slot].apostado) return;

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
        ganho: 0,
        multiplicadorSaque: 0 // Novo campo para rastrear o saque
    };

    updateUI();
    updateBetControls();
}

function sacar(slot) {
    if (!isFlying || !betData[slot].apostado || betData[slot].sacado) return;

    // Calcula o ganho com o multiplicador atual
    const ganho = betData[slot].valor * multiplicador;
    saldo += ganho;

    betData[slot].sacado = true;
    betData[slot].ganho = ganho;
    betData[slot].multiplicadorSaque = multiplicador; // Registra o multiplicador

    // Efeito de som
    winSound.currentTime = 0;
    winSound.play();
    
    // Altera o estilo do botão para indicar saque completo
    const btnSacar = document.querySelector(`.btn-sacar[data-slot="${slot}"]`);
    btnSacar.classList.add('btn-sacar-done');
    
    updateUI();
    updateBetControls();
}


function startGameCycle() {
    resetGame();
    
    // 1. Fase de Aposta (5 segundos)
    messageDisplay.textContent = 'FASE DE APOSTA';
    multiplicadorDisplay.textContent = 'Aguarde...';

    let countdown = 5;
    
    countdownTimer = setInterval(() => {
        countdown--;
        messageDisplay.textContent = `Próximo Voo em: ${countdown} Segundos...`;
        
        if (countdown <= 0) {
            clearInterval(countdownTimer);
            startFlight();
        }
    }, 1000);
}

function startFlight() {
    isBettingPhase = false;
    isFlying = true;
    multiplicador = 1.00;
    
    // Gera o ponto de crash aleatório (Entre 1.01x e um máximo razoável, com foco em crashes baixos)
    const r = Math.random();
    // Função de distribuição que favorece resultados baixos: -log(1-r) / k
    // k = 0.08 dá uma boa distribuição com média baixa (entre 2 e 3x)
    crashPoint = 1 + (Math.log(1 - r) / -0.08); 
    
    // Garantir que seja pelo menos 1.01x
    if (crashPoint < 1.01) crashPoint = 1.01;
    // Limite máximo para evitar números absurdos
    if (crashPoint > 150) crashPoint = 150; 
    
    crashPoint = parseFloat(crashPoint.toFixed(2));
    
    // Inicia Animações e Multiplicador
    multiplicadorDisplay.classList.remove('status-bet-ready');
    multiplicadorDisplay.classList.add('status-flying');
    messageDisplay.textContent = '🚀 Foguete Subindo!';
    
    startRocketAnimation(); // Faz o foguete aparecer!
    updateBetControls();
    
    // Lógica do Multiplicador Baseada no Tempo
    const startTime = Date.now();
    
    gameTimer = setInterval(() => {
        if (!isFlying) {
            clearInterval(gameTimer);
            return;
        }

        const elapsedSeconds = (Date.now() - startTime) / 1000;
        
        // Fórmula de crescimento (exponencial suave): 1 + (e ^ (tempo * fator)) - 1
        multiplicador = 1 + (Math.exp(elapsedSeconds * 0.45) - 1);
        
        // Arredonda para 2 casas decimais, mas mantém a precisão para a checagem do crash
        const displayMulti = multiplicador.toFixed(2);
        
        // 1. Verifica o Crash (Usamos o valor real do multiplicador para checar)
        if (multiplicador >= crashPoint) {
            crashGame(multiplicador);
            return;
        }

        // 2. Atualiza UI e Parallax
        multiplicadorDisplay.textContent = displayMulti + 'x';
        
        // Efeito de Parallax Aumentado com o Multiplicador
        const parallaxFactor = Math.min(0.5, elapsedSeconds / 5);
        starsBg.style.transform = `translateY(${elapsedSeconds * 100 * parallaxFactor}px)`;
        rocket.style.transform = `translateX(-50%) translateY(${-elapsedSeconds * 100 * parallaxFactor}px) scale(${1 + elapsedSeconds * 0.1})`; // Sobe e cresce levemente

        // 3. Atualiza os botões de Saque para o valor atual
        updateBetControls();

    }, 100); // Atualiza a cada 100ms
}

function crashGame(finalMulti) {
    isFlying = false;
    clearInterval(gameTimer);
    
    // 1. Efeito de som
    crashSound.currentTime = 0;
    crashSound.play();

    // 2. Atualizar Display
    multiplicadorDisplay.textContent = finalMulti.toFixed(2) + 'x';
    multiplicadorDisplay.classList.remove('status-flying');
    multiplicadorDisplay.classList.add('status-crashed');
    messageDisplay.textContent = `💥 CRASH! Em ${finalMulti.toFixed(2)}x`;
    
    // 3. Animação de Crash do Foguete
    stopRocketAnimation(true);

    // 4. Verifica perdas para apostas não sacadas
    for (const slot in betData) {
        const data = betData[slot];
        if (data.apostado && !data.sacado) {
            // Aposta perdida. O saldo já foi deduzido no 'apostar'.
            // A mensagem de erro será definida no updateBetControls, mas garantimos que o status seja atualizado.
        }
    }
    
    // 5. Adiciona ao Histórico
    addToHistory(finalMulti);

    // 6. Próximo Jogo
    updateBetControls();

    // Inicia o próximo ciclo após 4 segundos para o jogador reagir
    setTimeout(startGameCycle, 4000); 
}

function resetGame() {
    isBettingPhase = true;
    isFlying = false;
    multiplicador = 1.00;
    
    // Limpa os temporizadores
    if (gameTimer) clearInterval(gameTimer);
    if (countdownTimer) clearInterval(countdownTimer);
    
    betData = {
        1: { apostado: false, valor: 0, sacado: false, ganho: 0, multiplicadorSaque: 0 },
        2: { apostado: false, valor: 0, sacado: false, ganho: 0, multiplicadorSaque: 0 }
    };
    
    // Reset da UI e Animações
    multiplicadorDisplay.textContent = '1.00x';
    multiplicadorDisplay.classList.remove('status-flying', 'status-crashed');
    multiplicadorDisplay.classList.add('status-bet-ready');
    messageDisplay.textContent = 'Aguardando a fase de aposta...';
    
    // Remove o estilo de saque concluído
    document.querySelectorAll('.btn-sacar').forEach(btn => {
        btn.classList.remove('btn-sacar-done');
    });

    // Reset da Animação do Foguete
    stopRocketAnimation(false);
    
    // Reset do Parallax
    starsBg.style.transform = 'translateY(0)';

    updateUI();
    updateBetControls();
}


// =========================================================
// 4. Funções de Animação (Corrigidas)
// =========================================================

function startRocketAnimation() {
    // Faz o foguete aparecer e inicia a chama
    flame.classList.add('flame-active');
    rocket.classList.add('rocket-flying');
    rocket.classList.remove('rocket-crashed');
}

function stopRocketAnimation(crashed) {
    // Remove a chama
    flame.classList.remove('flame-active');
    rocket.classList.remove('rocket-flying');
    
    if (crashed) {
        // Efeito de explosão (CSS cuida do desaparecimento)
        rocket.classList.add('rocket-crashed');
    } else {
        // Volta para o estado inicial, invisível e na base
        rocket.classList.remove('rocket-crashed');
        rocket.style.transform = 'translateX(-50%) translateY(0px)';
        rocket.style.opacity = 0; // O CSS original define opacity: 0
    }
}

// =========================================================
// 5. Funções de Histórico e Extras
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
    while (historyList.children.length > 15) {
        historyList.removeChild(historyList.lastChild);
    }
}

function ganharCreditosAnuncio() {
    // Simula ganho de créditos via anúncio
    saldo += 20;
    alert("Créditos adicionados! (+20). Tente novamente!");
    updateUI();
}

// =========================================================
// 6. Inicialização
// =========================================================

function startBackgroundMusic() {
    // Tenta iniciar a música, mas pode falhar se não houver interação
    try {
        bgMusic.volume = 0.5; // Ajusta o volume para não ser muito alto
        bgMusic.play();
    } catch (e) {
        console.warn("Música de fundo não iniciada automaticamente. Requer interação do usuário.");
    }
}

// Inicia o ciclo de jogo e o primeiro estado de aposta
document.addEventListener('DOMContentLoaded', () => {
    startBackgroundMusic();
    updateUI();
    startGameCycle(); // Inicia o primeiro ciclo de jogo imediatamente
});


// Funções globais para serem acessadas pelos botões HTML (onlick)
window.apostar = apostar;
window.sacar = sacar;
window.ganharCreditosAnuncio = ganharCreditosAnuncio;
