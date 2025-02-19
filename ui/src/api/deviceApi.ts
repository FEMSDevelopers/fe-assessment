const BASE_URL = 'http://localhost:3000/api';

export const deviceApi = {
  async togglePublishing(enabled: boolean) {
    const response = await fetch(`${BASE_URL}/publish/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    
    if (!response.ok) {
      throw new Error('Failed to toggle publishing');
    }
    
    return response.json();
  }
}; 