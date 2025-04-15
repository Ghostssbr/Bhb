document.addEventListener('DOMContentLoaded', function() {
    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then(registration => {
                console.log('SW registrado:', registration.scope);
                return updateServiceWorkerCache();
            })
            .catch(err => console.error('Falha no SW:', err));
    }

    loadProjects();
    setupForm();
});

// Adicione isso no DOMContentLoaded
document.getElementById('newProjectForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const projectName = document.getElementById('projectName').value.trim();
    const spreadsheetUrl = document.getElementById('spreadsheetUrl').value.trim();
    
    if (!projectName || !spreadsheetUrl) {
        showAlert('Preencha todos os campos!', 'danger');
        return;
    }

    const newProject = {
        id: 'gate-' + Date.now(),
        name: projectName,
        url: spreadsheetUrl,
        status: 'active',
        createdAt: new Date().toISOString(),
        requestsToday: 0,
        totalRequests: 0,
        level: 1
    };

    // DEBUG: Mostra no console antes de salvar
    console.log("Criando projeto:", newProject);
    
    saveProject(newProject);
    showAlert('Portal criado com sucesso!', 'success');
    
    // Redireciona após 1 segundo
    setTimeout(() => {
        window.location.href = `dashboard.html?project=${newProject.id}`;
    }, 1000);
});

// Função saveProject corrigida
function saveProject(project) {
    let projects = JSON.parse(localStorage.getItem('shadowGateProjects')) || [];
    projects.push(project);
    localStorage.setItem('shadowGateProjects', JSON.stringify(projects));
    console.log("Projeto salvo:", project); // DEBUG
}

// Carregar projetos
function loadProjects() {
    const container = document.getElementById('projectsContainer');
    const noProjects = document.getElementById('noProjects');
    const projects = JSON.parse(localStorage.getItem('shadowGateProjects')) || [];
    
    container.innerHTML = '';
    noProjects.classList.toggle('hidden', projects.length > 0);

    projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card bg-gray-800 rounded-lg overflow-hidden cursor-pointer';
        card.innerHTML = `
            <div class="absolute top-2 right-2 bg-solo-dark text-solo-blue border border-solo-blue px-2 py-1 rounded-full text-xs font-bold tracking-wider">
                LV. ${project.level}
            </div>
            <div class="p-4 border-b border-gray-700">
                <div class="flex justify-between items-start">
                    <h3 class="text-lg font-semibold text-white tracking-wider">${project.name}</h3>
                    <span class="status-badge ${project.status === 'active' ? 'text-green-400' : 'text-yellow-400'} text-xs font-medium px-2 py-0.5 rounded-full bg-opacity-20 ${project.status === 'active' ? 'bg-green-900' : 'bg-yellow-900'}">
                        ${project.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                </div>
                <p class="text-xs text-gray-400 mt-1 tracking-wider">CREATED ${new Date(project.createdAt).toLocaleDateString()}</p>
            </div>
            <div class="p-4">
                <div class="flex items-center mb-3">
                    <i class="bi bi-link text-gray-400 mr-2"></i>
                    <span class="text-xs text-gray-300 truncate">${project.url}</span>
                </div>
                <div class="flex justify-between text-xs text-gray-400 tracking-wider">
                    <span>${project.requestsToday} REQUESTS TODAY</span>
                    <span class="flex items-center">
                        <i class="bi bi-arrow-right text-solo-blue ml-1"></i>
                    </span>
                </div>
            </div>
        `;
        card.addEventListener('click', () => window.location.href = `dashboard.html?project=${project.id}`);
        container.appendChild(card);
    });
}

// Configurar formulário
function setupForm() {
    document.getElementById('newProjectForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const projectName = document.getElementById('projectName').value;
        const spreadsheetUrl = document.getElementById('spreadsheetUrl').value;
        
        if (!projectName || !spreadsheetUrl) {
            showAlert('Preencha todos os campos obrigatórios', 'danger');
            return;
        }

        const newProject = {
            id: 'gate-' + Date.now(),
            name: projectName,
            url: spreadsheetUrl,
            status: 'active',
            createdAt: new Date().toISOString(),
            requestsToday: 0,
            totalRequests: 0,
            level: 1,
            activityData: generateActivityData()
        };

        await saveProject(newProject);
        window.location.href = `dashboard.html?project=${newProject.id}`;
    });
}

// Gerar dados de atividade aleatórios
function generateActivityData() {
    return {
        '7d': Array.from({length: 7}, () => Math.floor(Math.random() * 50) + 10),
        '30d': Array.from({length: 30}, () => Math.floor(Math.random() * 100) + 20),
        '90d': Array.from({length: 90}, () => Math.floor(Math.random() * 150) + 30)
    };
}

// Salvar projeto
async function saveProject(project) {
    let projects = JSON.parse(localStorage.getItem('shadowGateProjects')) || [];
    projects.push(project);
    localStorage.setItem('shadowGateProjects', JSON.stringify(projects));
    await updateServiceWorkerCache();
}

// Atualizar cache do Service Worker
async function updateServiceWorkerCache() {
    if ('caches' in window) {
        const cache = await caches.open('shadow-gate-data');
        const projects = JSON.parse(localStorage.getItem('shadowGateProjects')) || [];
        await cache.put('/projects.json', new Response(JSON.stringify(projects)));
    }
}

// Mostrar alerta
function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white font-semibold tracking-wider z-50 ${
        type === 'success' ? 'bg-green-600' : 
        type === 'danger' ? 'bg-red-600' :
        'bg-blue-600'
    }`;
    alert.textContent = message;
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => alert.remove(), 500);
    }, 3000);
}