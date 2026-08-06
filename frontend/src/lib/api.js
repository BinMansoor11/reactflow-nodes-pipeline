// api.js
// The only module that knows where the backend lives.

const BASE_URL = process.env.REACT_APP_API_URL ?? 'http://127.0.0.1:8000';

export const parsePipeline = async ({ nodes, edges }) => {
  let response;

  try {
    response = await fetch(`${BASE_URL}/pipelines/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes, edges }),
    });
  } catch (cause) {
    // fetch only rejects when the request never completed — the server is down,
    // or CORS blocked it. Worth saying so, since "Failed to fetch" is not a
    // useful thing to show anyone.
    throw new Error(`Could not reach the backend at ${BASE_URL}. Is it running?`, { cause });
  }

  if (!response.ok) {
    throw new Error(`The backend responded with ${response.status} ${response.statusText}.`);
  }

  return response.json();
};
