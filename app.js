const $ = (selector) => document.querySelector(selector);
const storage = {
  get(key, session = false) { try { return (session ? sessionStorage : localStorage).getItem(key); } catch { return null; } },
  set(key, value, session = false) { try { (session ? sessionStorage : localStorage).setItem(key, value); } catch { /* Storage is optional. */ } },
  remove(key, session = false) { try { (session ? sessionStorage : localStorage).removeItem(key); } catch { /* Nothing to clear. */ } }
};
let adminToken = storage.get('monalisaAdminToken', true);
let visitorId = storage.get('monalisaVisitorId');
if (!/^[a-f0-9-]{36}$/.test(visitorId || '')) {
  visitorId = crypto.randomUUID();
  storage.set('monalisaVisitorId', visitorId);
}
let endpointPromise;
let currentArticle = null;
let editingId = null;
let articleCursor = null;
let commentCursor = null;
let routeVersion = 0;
let archiveVersion = 0;
const likedArticles = new Set();

async function api(path, { body, authenticated = false } = {}) {
  endpointPromise ||= fetch('/config.json', { cache: 'no-store' }).then(async (response) => {
    if (!response.ok) throw new Error('The blog is not connected yet.');
    const config = await response.json();
    if (!/^https:\/\//.test(config.lookupUrl || '')) throw new Error('The blog is not connected yet.');
    return config.lookupUrl;
  }).catch((error) => { endpointPromise = null; throw error; });
  const base = await endpointPromise;
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (authenticated) headers.Authorization = 'Bearer ' + (adminToken || '');
  const response = await fetch(new URL(path, base), {
    method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (authenticated && response.status === 401) {
      adminToken = null;
      storage.remove('monalisaAdminToken', true);
      showAdminState();
    }
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function date(value) {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
function emptyArchive() {
  const box = element('div', 'empty-state');
  box.append(element('h3', '', 'The first thought is on its way.'), element('p', 'quiet', 'New articles will appear here. Come back soon.'));
  $('#articles').replaceChildren(box);
}
function articleCard(article) {
  const link = element('a', 'article-card');
  link.href = '#article/' + article.id;
  const heading = element('div', 'card-heading');
  const arrow = element('span', '', '↗');
  arrow.setAttribute('aria-hidden', 'true');
  heading.append(element('h3', '', article.title), arrow);
  link.append(element('span', 'card-date', date(article.createdAt)), heading,
    element('p', 'card-excerpt', article.excerpt),
    element('span', 'card-stats', article.likes + (article.likes === 1 ? ' like' : ' likes') + ' · ' + article.comments + (article.comments === 1 ? ' comment' : ' comments')));
  return link;
}

async function loadArticles(append = false) {
  const version = ++archiveVersion;
  const more = $('#load-more');
  more.disabled = true;
  $('#archive-message').textContent = append ? 'Loading more articles…' : 'Loading articles…';
  try {
    const data = await api('/articles' + (append && articleCursor ? '?cursor=' + encodeURIComponent(articleCursor) : ''));
    if (version !== archiveVersion) return;
    if (!append) $('#articles').replaceChildren();
    data.articles.forEach((article) => $('#articles').append(articleCard(article)));
    if (!append && !data.articles.length) emptyArchive();
    articleCursor = data.nextCursor;
    more.hidden = !articleCursor;
    $('#archive-message').textContent = '';
  } catch (error) {
    if (version !== archiveVersion) return;
    $('#archive-message').textContent = error.message;
    if (!append && !$('#articles').children.length) emptyArchive();
  } finally { if (version === archiveVersion) more.disabled = false; }
}

function showLikes() {
  const liked = likedArticles.has(currentArticle.id) || storage.get('monalisaLiked:' + currentArticle.id) === 'yes';
  $('#like').setAttribute('aria-pressed', String(liked));
  $('#like').disabled = liked;
  $('#like').firstElementChild.textContent = liked ? '♥' : '♡';
  $('#like-label').textContent = liked ? 'Liked' : 'Like this article';
  $('#like-count').textContent = currentArticle.likes + (currentArticle.likes === 1 ? ' like' : ' likes');
}
function commentNode(comment) {
  const node = element('div', 'comment');
  node.dataset.id = comment.id;
  const header = element('div', 'comment-header');
  const timestamp = element('time', '', date(comment.createdAt));
  timestamp.dateTime = comment.createdAt;
  header.append(element('strong', '', comment.name), timestamp);
  if (adminToken) {
    const articleId = currentArticle.id;
    const remove = element('button', 'text-button', 'Remove');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Remove comment by ' + comment.name);
    remove.addEventListener('click', async () => {
      const version = routeVersion;
      remove.disabled = true;
      try {
        await api('/admin/articles/' + articleId + '/comments/' + comment.id + '/remove', { body: {}, authenticated: true });
        node.remove();
        if (version === routeVersion) $('#comment-message').textContent = 'Comment removed.';
      } catch (error) { if (version === routeVersion) $('#comment-message').textContent = error.message; }
      finally { remove.disabled = false; }
    });
    header.append(remove);
  }
  node.append(header, element('p', '', comment.text));
  return node;
}
async function loadComments(append = false, version = routeVersion) {
  if (!currentArticle) return;
  const id = currentArticle.id;
  const more = $('#more-comments');
  more.disabled = true;
  try {
    const data = await api('/articles/' + id + '/comments' + (append && commentCursor ? '?cursor=' + encodeURIComponent(commentCursor) : ''));
    if (version !== routeVersion) return;
    if (!append) $('#comment-list').replaceChildren();
    data.comments.forEach((comment) => $('#comment-list').append(commentNode(comment)));
    commentCursor = data.nextCursor;
    more.hidden = !commentCursor;
  } catch (error) {
    if (version === routeVersion) $('#comment-message').textContent = error.message;
  } finally { if (version === routeVersion) more.disabled = false; }
}

async function route() {
  const version = ++routeVersion;
  const match = location.hash.match(/^#article\/([0-9]{20}-[a-f0-9]{8})$/);
  $('#archive').hidden = Boolean(match);
  $('#reader').hidden = !match;
  if (!match) {
    currentArticle = null;
    document.title = 'Monalisa Thinks';
    await loadArticles();
    return;
  }
  currentArticle = null;
  $('#article-title').textContent = 'Loading…';
  $('#article-meta').textContent = '';
  $('#article-body').textContent = '';
  $('.article-actions').hidden = true;
  $('.comments').hidden = true;
  $('#reader-message').textContent = '';
  $('#comment-message').textContent = '';
  $('#comment-list').replaceChildren();
  $('#comment-form').reset();
  $('#more-comments').hidden = true;
  try {
    const data = await api('/articles/' + match[1]);
    if (version !== routeVersion) return;
    currentArticle = data.article;
    document.title = currentArticle.title + ' — Monalisa Thinks';
    $('#article-title').textContent = currentArticle.title;
    $('#article-meta').textContent = 'MONALISA · ' + date(currentArticle.createdAt);
    $('#article-body').textContent = currentArticle.text;
    $('.article-actions').hidden = false;
    $('.comments').hidden = false;
    $('#edit-article').hidden = !adminToken;
    showLikes();
    window.scrollTo({ top: 0 });
    $('#article-title').focus({ preventScroll: true });
    await loadComments(false, version);
  } catch (error) {
    if (version !== routeVersion) return;
    $('#article-title').textContent = 'This article is unavailable.';
    $('#reader-message').textContent = error.message;
  }
}

$('#like').addEventListener('click', async () => {
  if (!currentArticle) return;
  const article = currentArticle;
  $('#like').disabled = true;
  $('#reader-message').textContent = '';
  try {
    const data = await api('/articles/' + article.id + '/like', { body: { visitorId } });
    likedArticles.add(article.id);
    storage.set('monalisaLiked:' + article.id, 'yes');
    if (currentArticle?.id === article.id) {
      currentArticle.likes = data.likes;
      showLikes();
    }
  } catch (error) {
    if (currentArticle?.id === article.id) {
      $('#reader-message').textContent = error.message;
      $('#like').disabled = false;
    }
  }
});

$('#comment-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentArticle) return;
  const version = routeVersion;
  const name = $('#comment-name').value.trim();
  const text = $('#comment-text').value.trim();
  if (!name || !text) { $('#comment-message').textContent = 'Please enter your name and a comment.'; return; }
  const submit = event.currentTarget.querySelector('[type="submit"]');
  submit.disabled = true;
  $('#comment-message').textContent = 'Posting…';
  try {
    await api('/articles/' + currentArticle.id + '/comments', { body: { name, text, website: $('#comment-website').value } });
    if (version !== routeVersion) return;
    $('#comment-form').reset();
    $('#comment-message').textContent = 'Your thought has been added. Thank you.';
    await loadComments();
  } catch (error) { if (version === routeVersion) $('#comment-message').textContent = error.message; }
  finally { submit.disabled = false; }
});

function showAdminState() {
  if (adminToken && Number(adminToken.split('.')[0]) * 1000 <= Date.now()) {
    adminToken = null;
    storage.remove('monalisaAdminToken', true);
  }
  $('#admin-login').hidden = Boolean(adminToken);
  $('#admin-editor').hidden = !adminToken;
  $('#admin-open').firstChild.textContent = adminToken ? 'Write an article ' : 'Admin login ';
  $('#edit-article').hidden = !adminToken || !currentArticle;
  $('#admin-intro').textContent = adminToken ? 'Your space. Your words. Publish when you’re ready.' : 'Sign in to write your next article.';
}
function resetEditor() {
  editingId = null;
  $('#admin-editor').reset();
  $('#publish').firstChild.textContent = 'Publish article ';
}
$('#admin-open').addEventListener('click', () => {
  showAdminState();
  $('#admin-message').textContent = '';
  $('#admin-dialog').showModal();
});
$('#admin-close').addEventListener('click', () => $('#admin-dialog').close());
$('#admin-dialog').addEventListener('close', () => { $('#admin-password').value = ''; });
$('#edit-article').addEventListener('click', () => {
  if (!currentArticle) return;
  showAdminState();
  editingId = currentArticle.id;
  $('#new-title').value = currentArticle.title;
  $('#new-text').value = currentArticle.text;
  $('#publish').firstChild.textContent = 'Save changes ';
  $('#admin-message').textContent = '';
  $('#admin-dialog').showModal();
});
$('#new-article').addEventListener('click', () => { resetEditor(); $('#admin-message').textContent = ''; $('#new-title').focus(); });
$('#admin-logout').addEventListener('click', () => {
  adminToken = null;
  storage.remove('monalisaAdminToken', true);
  resetEditor();
  showAdminState();
  $('#admin-message').textContent = 'Signed out.';
  if (currentArticle) loadComments();
});
$('#admin-login').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = event.currentTarget.querySelector('[type="submit"]');
  submit.disabled = true;
  $('#admin-message').textContent = 'Signing in…';
  try {
    const data = await api('/admin/login', { body: { username: $('#admin-username').value.trim(), password: $('#admin-password').value } });
    adminToken = data.token;
    storage.set('monalisaAdminToken', adminToken, true);
    $('#admin-login').reset();
    showAdminState();
    $('#admin-message').textContent = '';
    $('#new-title').focus();
    if (currentArticle) loadComments();
  } catch (error) { $('#admin-message').textContent = error.message; }
  finally { $('#admin-password').value = ''; submit.disabled = false; }
});
$('#admin-editor').addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = $('#new-title').value.trim();
  const text = $('#new-text').value.trim();
  if (!title || !text) { $('#admin-message').textContent = 'Add a title and your article.'; return; }
  const submit = $('#publish');
  submit.disabled = true;
  $('#admin-message').textContent = editingId ? 'Saving changes…' : 'Publishing…';
  try {
    const data = await api('/admin/articles' + (editingId ? '/' + editingId : ''), { body: { title, text }, authenticated: true });
    resetEditor();
    $('#admin-message').textContent = 'Published. Your article is ready to read.';
    $('#admin-dialog').close();
    const hash = '#article/' + data.id;
    if (location.hash === hash) await route();
    else location.hash = hash;
  } catch (error) { $('#admin-message').textContent = error.message; }
  finally { submit.disabled = false; }
});
$('#load-more').addEventListener('click', () => loadArticles(true));
$('#more-comments').addEventListener('click', () => loadComments(true));
window.addEventListener('hashchange', route);
showAdminState();
route();
