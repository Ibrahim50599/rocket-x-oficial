const CACHE_NAME = 'rocketx-v1';

// Lista de todos os arquivos essenciais para o funcionamento offline
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    // Ícones
    './icon-192.png',
    './icon-512.png',
    // Arquivos de áudio (seus arquivos MP3)
    './crash.mp3',
    './win.mp3',
    './background.mp3'
];

// Instalação do Service Worker - Abre o cache e adiciona todos os arquivos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache preenchido com sucesso');
                return cache.addAll(urlsToCache);
            })
    );
});

// Busca (Fetch) - Intercepta pedidos e serve o arquivo do cache se estiver disponível
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Retorna o recurso do cache se for encontrado
                if (response) {
                    return response;
                }
                // Se não estiver no cache, busca na rede
                return fetch(event.request);
            })
    );
});

// Ativação - Limpa caches antigos, se houver
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});