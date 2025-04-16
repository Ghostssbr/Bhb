const STATIC_CACHE = 'shadow-gate-static-v3';
const DATA_CACHE = 'shadow-gate-data-v1';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll([
                '/',
                '/index.html',
                '/home.html',
                '/dashboard.html',
                '/dashboard.js',
                '/app.js',
                '/styles.css',
                'https://cdn.tailwindcss.com',
                'https://cdn.jsdelivr.net/npm/chart.js',
                'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css'
            ]))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== STATIC_CACHE && key !== DATA_CACHE) {
                    return caches.delete(key);
                }
            })
        ))
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const pathname = url.pathname;

    // API Routes
    if (pathname.startsWith('/gate-') || pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(event.request));
    } 
    // Static files
    else {
        event.respondWith(
            caches.match(event.request)
                .then(response => response || fetch(event.request))
        );
    }
});

async function handleApiRequest(request) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(p => p);
    const isApiRoute = pathParts[0] === 'api';
    const gateId = isApiRoute ? pathParts[1] : pathParts[0];
    
    if (!gateId || !gateId.startsWith('gate-')) {
        return createJsonResponse({ error: 'Invalid gate ID' }, 400);
    }

    const project = await getProject(gateId);
    
    if (!project) {
        return createJsonResponse({ error: 'Gate not found' }, 404);
    }

    const endpoint = isApiRoute ? pathParts[2] : pathParts[1];
    
    switch(endpoint) {
        case 'data':
            return createJsonResponse({
                project: project.name,
                data: "Sample data from connected spreadsheet",
                lastUpdated: new Date().toISOString(),
                url: project.url
            });
            
        case 'status':
            return createJsonResponse({
                status: project.status,
                level: project.level,
                requests: {
                    today: project.requestsToday,
                    total: project.totalRequests
                },
                uptime: "100%"
            });
            
        default:
            return createJsonResponse({
                id: project.id,
                name: project.name,
                created: project.createdAt,
                endpoints: {
                    data: `${url.origin}/${gateId}/data`,
                    status: `${url.origin}/${gateId}/status`,
                    api: `${url.origin}/api/${gateId}/data`
                }
            });
    }
}

async function getProject(projectId) {
    try {
        // Try cache first
        const cache = await caches.open(DATA_CACHE);
        const response = await cache.match('/projects.json');
        
        if (response) {
            const projects = await response.json();
            return projects.find(p => p.id === projectId);
        }
        
        // Fallback to localStorage (for demo purposes)
        const allProjects = await getProjectsFromLocalStorage();
        return allProjects.find(p => p.id === projectId);
    } catch (error) {
        console.error('Error getting project:', error);
        return null;
    }
}

async function getProjectsFromLocalStorage() {
    // This is a workaround to access localStorage from SW
    const clients = await self.clients.matchAll();
    for (const client of clients) {
        const message = await client.postMessage({
            type: 'GET_PROJECTS_FROM_LOCALSTORAGE'
        });
        if (message && message.projects) {
            return message.projects;
        }
    }
    return [];
}

function createJsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-ShadowGate-Version': '1.0'
        }
    };
}

self.addEventListener('message', (event) => {
    if (event.data.type === 'SYNC_PROJECTS') {
        caches.open(DATA_CACHE)
            .then(cache => cache.put('/projects.json', new Response(JSON.stringify(event.data.projects))));
    }
});
