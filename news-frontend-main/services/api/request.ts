export async function makeApiRequest(url: string, body: any) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_COHERE_API_KEY}`,
      'Accept': 'application/json',
      'Cohere-Version': '2022-12-06'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', {
      url: url.split('?')[0], // Log URL without query params
      status: response.status,
      error: errorText
    });
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  return response.json();
} 