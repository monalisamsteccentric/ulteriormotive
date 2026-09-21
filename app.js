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

const adminOpen = document.querySelector('#admin-open');
const adminDialog = document.querySelector('#admin-dialog');
const adminClose = document.querySelector('#admin-close');
const adminLogin = document.querySelector('#admin-login');
const adminEditor = document.querySelector('#admin-editor');
const adminLogout = document.querySelector('#admin-logout');
const adminMessage = document.querySelector('#admin-message');
let adminToken = sessionStorage.getItem('auraAdminToken');

function showAdminState() {
  adminLogin.hidden = Boolean(adminToken);
  adminEditor.hidden = !adminToken;
  adminMessage.textContent = '';
}

async function adminEndpoint(path) {
  const response = await fetch('/config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Lookup is not configured yet.');
  const { lookupUrl } = await response.json();
  if (!/^https:\/\//.test(lookupUrl || '')) throw new Error('Lookup is not configured yet.');
  return new URL(path, lookupUrl);
}

adminOpen.addEventListener('click', () => {
  showAdminState();
  adminDialog.showModal();
});
adminClose.addEventListener('click', () => adminDialog.close());
adminDialog.addEventListener('click', (event) => {
  if (event.target === adminDialog) adminDialog.close();
});

adminLogin.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = adminLogin.querySelector('button[type="submit"]');
  submit.disabled = true;
  adminMessage.textContent = 'Signing in…';
  try {
    const endpoint = await adminEndpoint('admin/login');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.querySelector('#admin-username').value.trim(),
        password: document.querySelector('#admin-password').value
      })
    });
    if (response.status === 401) throw new Error('Incorrect username or password.');
    if (!response.ok) throw new Error('Sign in is unavailable. Please try again.');
    const data = await response.json();
    if (typeof data.token !== 'string') throw new Error('Sign in is unavailable. Please try again.');
    adminToken = data.token;
    sessionStorage.setItem('auraAdminToken', adminToken);
    adminLogin.reset();
    showAdminState();
    document.querySelector('#new-code').focus();
  } catch (error) {
    adminMessage.textContent = error.message;
  } finally {
    document.querySelector('#admin-password').value = '';
    submit.disabled = false;
  }
});

adminEditor.addEventListener('submit', async (event) => {
  event.preventDefault();
  const code = document.querySelector('#new-code').value.trim().toUpperCase();
  const value = document.querySelector('#new-text').value.trim();
  if (!/^[A-Z0-9_-]{1,64}$/.test(code)) {
    adminMessage.textContent = 'Codes may use letters, numbers, hyphens, and underscores.';
    return;
  }
  if (!value || value.length > 10000) {
    adminMessage.textContent = 'Enter text of up to 10,000 characters.';
    return;
  }
  const submit = adminEditor.querySelector('button[type="submit"]');
  submit.disabled = true;
  adminMessage.textContent = 'Saving…';
  try {
    const endpoint = await adminEndpoint('admin/codes');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
      body: JSON.stringify({ code, text: value })
    });
    if (response.status === 401) {
      adminToken = null;
      sessionStorage.removeItem('auraAdminToken');
      showAdminState();
      throw new Error('Session expired. Please sign in again.');
    }
    if (response.status === 409) throw new Error('That code already exists.');
    if (!response.ok) throw new Error('Could not save the code. Please try again.');
    adminEditor.reset();
    adminMessage.textContent = 'Code saved. It is ready to search.';
  } catch (error) {
    adminMessage.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});

adminLogout.addEventListener('click', () => {
  adminToken = null;
  sessionStorage.removeItem('auraAdminToken');
  showAdminState();
});
