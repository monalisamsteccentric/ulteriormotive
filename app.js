const form = document.querySelector('#lookup');
const input = document.querySelector('#code');
const button = form.querySelector('button');
const result = document.querySelector('#result');
const resultCode = document.querySelector('#result-code');
const resultText = document.querySelector('#result-text');
const message = document.querySelector('#message');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const code = input.value.trim().toUpperCase();
  result.hidden = true;
  message.textContent = '';

  if (!/^[A-Z0-9_-]{1,64}$/.test(code)) {
    message.textContent = 'Use letters, numbers, hyphens, or underscores.';
    return;
  }

  button.disabled = true;
  message.textContent = 'Searching…';
  try {
    const configResponse = await fetch('/config.json', { cache: 'no-store' });
    if (!configResponse.ok) throw new Error('setup');
    const { lookupUrl } = await configResponse.json();
    if (!/^https:\/\//.test(lookupUrl || '')) throw new Error('setup');

    const url = new URL(lookupUrl);
    url.searchParams.set('code', code);
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (response.status === 404) {
      message.textContent = 'No meaning found for this code.';
      return;
    }
    if (!response.ok) throw new Error('lookup');
    const data = await response.json();
    if (typeof data.text !== 'string') {
      message.textContent = 'No meaning found for this code.';
      return;
    }
    resultCode.textContent = code;
    resultText.textContent = data.text;
    result.hidden = false;
    message.textContent = '';
  } catch (error) {
    message.textContent = error.message === 'setup'
      ? 'Lookup is not configured yet.'
      : 'The lookup is unavailable. Please try again.';
  } finally {
    button.disabled = false;
  }
});
