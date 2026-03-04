
const getApiBase = () => {
    // Priority 1: Injected environment variable from build process
    const url = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (url) return url;

    // Fallback for local development
    return 'http://localhost:8081';
};

export const API_BASE = getApiBase();

export const api = {
    chatWithAI: async (patientId: string, message: string, history: any[]) => {
        const res = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add Authorization header if token exists in localStorage (or pass from arg, but pulling from localstorage here is convenient)
                // Assuming authService handles login and token storage under 'YORISOI_AUTH_TOKEN'
                'Authorization': `Bearer ${typeof localStorage !== 'undefined' ? localStorage.getItem('YORISOI_AUTH_TOKEN') : ''}`
            },
            body: JSON.stringify({ patientId, message, history })
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Chat failed: ${res.status}`);
        }
        return await res.json();
    }
};
