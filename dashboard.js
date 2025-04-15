// Variáveis globais
let currentProject;
let usageChart;

document.addEventListener('DOMContentLoaded', function() {
    const projectId = getProjectIdFromUrl();
    if (!projectId) {
        redirectToHome();
        return;
    }

    loadProject(projectId);
    setupUI();
    setupEventListeners();
});

// Carregar projeto
async function loadProject(projectId) {
    try {
        // Tentar buscar da API primeiro
        const response = await fetch(`/${projectId}`);
        if (response.ok) {
            currentProject = await response.json();
        } else {
            // Fallback para localStorage
            const projects = JSON.parse(localStorage.getItem('shadowGateProjects')) || [];
            currentProject = projects.find(p => p.id === projectId);
        }

        if (!currentProject) {
            throw new Error('Project not found');
        }

        updateDashboard();
    } catch (error) {
        console.error('Error loading project:', error);
        showAlert('Failed to load project', 'danger');
        redirectToHome();
    }
}

// Atualizar dashboard
function updateDashboard() {
    // Informações básicas
    document.getElementById('gateName').textContent = currentProject.name;
    document.getElementById('gateId').textContent = currentProject.id;
    document.getElementById('gateCreated').textContent = formatDate(currentProject.createdAt);
    
    // Estatísticas
    document.getElementById('dailyRequests').textContent = currentProject.requestsToday;
    document.getElementById('gateLevel').textContent = currentProject.level;
    
    // URLs
    const baseUrl = window.location.origin;
    document.getElementById('apiEndpoint').textContent = `${baseUrl}/${currentProject.id}`;
    document.getElementById('directEndpoint').textContent = `${baseUrl}/${currentProject.id}`;
    document.getElementById('spreadsheetUrl').textContent = currentProject.url;
    
    // Atualizar snippets de código
    document.querySelectorAll('.project-id-placeholder').forEach(el => {
        el.textContent = currentProject.id;
    });
    
    // Status
    updateStatus();
    // Gráfico
    initChart();
    // Barras de progresso
    updateProgress();
}

// Inicializar gráfico
function initChart() {
    const ctx = document.getElementById('usageChart').getContext('2d');
    const data = currentProject.activityData?.['7d'] || generateRandomData(10, 50, 7);
    
    usageChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map((_, i) => `Day ${i+1}`),
            datasets: [{
                label: 'Requests',
                data: data,
                backgroundColor: 'rgba(58, 107, 255, 0.2)',
                borderColor: 'rgba(58, 107, 255, 1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#94a3b8' } },
                y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

// Configurar UI
function setupUI() {
    setupTabs();
    setupCopyButtons();
    setupTimeframeButtons();
}

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('backButton').addEventListener('click', redirectToHome);
    
    // Botão de simular requisição
    const simulateBtn = document.createElement('button');
    simulateBtn.textContent = 'Simulate Request';
    simulateBtn.className = 'text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded mt-2 hover:bg-blue-800';
    simulateBtn.addEventListener('click', simulateRequest);
    document.querySelector('.gate-card').appendChild(simulateBtn);
}

// Função para simular requisição
async function simulateRequest() {
    try {
        // Atualizar localmente
        currentProject.requestsToday++;
        currentProject.totalRequests++;
        
        // Verificar se subiu de nível
        const neededForNextLevel = currentProject.level * 100;
        if (currentProject.totalRequests >= neededForNextLevel) {
            currentProject.level++;
            showAlert(`Gate leveled up to level ${currentProject.level}!`, 'success');
        }
        
        // Atualizar localStorage
        const projects = JSON.parse(localStorage.getItem('shadowGateProjects')) || [];
        const index = projects.findIndex(p => p.id === currentProject.id);
        if (index !== -1) {
            projects[index] = currentProject;
            localStorage.setItem('shadowGateProjects', JSON.stringify(projects));
            
            // Notificar Service Worker
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'UPDATE_PROJECT',
                    project: currentProject
                });
            }
        }
        
        updateDashboard();
    } catch (error) {
        console.error('Error simulating request:', error);
        showAlert('Error simulating request', 'danger');
    }
}

// ... (outras funções auxiliares)

// Helper functions
function getProjectIdFromUrl() {
    return new URLSearchParams(window.location.search).get('project');
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function redirectToHome() {
    window.location.href = 'home.html';
}

function generateRandomData(min, max, length) {
    return Array.from({length}, () => Math.floor(Math.random() * (max - min + 1)) + min);
}

function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white font-semibold tracking-wider z-50 ${
        type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`;
    alert.textContent = message;
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => alert.remove(), 500);
    }, 3000);
}