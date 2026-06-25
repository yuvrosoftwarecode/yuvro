const SERVICE_URLS: Record<string, string> = {
    ycode: import.meta.env.VITE_BACKEND_API_BASE_URL || 'http://localhost:8000/api',
    yhub: import.meta.env.VITE_YHUB_BACKEND_API_BASE_URL || 'http://localhost:8003/api',
};

// Routing rules mapping path prefix to service key
const ROUTING_RULES: { prefix: string; service: string }[] = [
    { prefix: '/auth/', service: 'yhub' },
    { prefix: '/auth', service: 'yhub' },
    { prefix: '/sessions/', service: 'yhub' },
    { prefix: '/sessions', service: 'yhub' },
    { prefix: '/chat/', service: 'yhub' },
    { prefix: '/chat', service: 'yhub' },
    { prefix: '/interviews/', service: 'yhub' },
    { prefix: '/interviews', service: 'yhub' },
    { prefix: '/agents/', service: 'yhub' },
    { prefix: '/agents', service: 'yhub' },
    { prefix: '/usage/', service: 'yhub' },
    { prefix: '/usage', service: 'yhub' },
    { prefix: '/configurations/', service: 'yhub' },
    { prefix: '/configurations', service: 'yhub' },
];

/**
 * Returns the correct base URL for a given endpoint path.
 * In the future, this makes it extremely easy to route new features to different backends
 * simply by adding a rule to ROUTING_RULES.
 */
export function getBaseUrlForPath(path: string): string {
    // Strip leading/trailing slashes for cleaner matching
    const normalizedPath = '/' + path.replace(/^\/+/, '');
    const rule = ROUTING_RULES.find((r) => normalizedPath.startsWith(r.prefix));
    const serviceKey = rule ? rule.service : 'ycode';
    return SERVICE_URLS[serviceKey] || SERVICE_URLS.ycode;
}
