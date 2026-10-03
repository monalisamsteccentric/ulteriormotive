"""Serve the real UI with isolated test API responses; never contacts live AWS."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
import time
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'test-artifacts'
FIRST_ID = '00000000000000000001-aaaaaaaa'
SECOND_ID = '00000000000000000002-bbbbbbbb'


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def main():
    ARTIFACTS.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:' + str(server.server_port)
    token = str(int(time.time()) + 3600) + '.testnonce.testsignature'
    articles = {
        FIRST_ID: {'id': FIRST_ID, 'title': 'The things we leave unsaid',
                   'text': 'Some thoughts take their time.\n\nOthers arrive all at once.',
                   'excerpt': 'Some thoughts take their time. Others arrive all at once.',
                   'createdAt': '2026-10-02T09:00:00Z', 'likes': 0, 'comments': 0},
        SECOND_ID: {'id': SECOND_ID, 'title': 'A little room for wonder',
                    'text': 'A personal thought about an ordinary day.',
                    'excerpt': 'A personal thought about an ordinary day.',
                    'createdAt': '2026-10-02T10:00:00Z', 'likes': 2, 'comments': 0}
    }
    comments = {key: [] for key in articles}
    errors = []
    likes = set()
    state = {'expired': False, 'unavailable': False}

    def respond(route, status, data):
        route.fulfill(status=status, content_type='application/json', body=json.dumps(data))

    def api(route):
        request = route.request
        path = urlparse(request.url).path
        body = request.post_data_json if request.method == 'POST' else {}
        if state['unavailable']:
            return respond(route, 503, {'error': 'The blog is temporarily unavailable. Please try again.'})
        if path == '/admin/login':
            if body == {'username': 'test-author', 'password': 'test-only-password'}:
                return respond(route, 200, {'token': token})
            return respond(route, 401, {'error': 'Incorrect username or password.'})
        if path.startswith('/admin/') and (state['expired'] or request.headers.get('authorization') != 'Bearer ' + token):
            return respond(route, 401, {'error': 'Please sign in again.'})
        if path == '/articles':
            return respond(route, 200, {'articles': list(reversed(list(articles.values()))), 'nextCursor': None})
        if path.startswith('/admin/articles'):
            parts = path.strip('/').split('/')
            if len(parts) == 6 and parts[-1] == 'remove':
                comments[parts[2]] = [c for c in comments[parts[2]] if c['id'] != parts[4]]
                articles[parts[2]]['comments'] -= 1
                return respond(route, 200, {'removed': True})
            article_id = parts[2] if len(parts) == 3 else '00000000000000000003-cccccccc'
            if article_id not in articles:
                articles[article_id] = {'id': article_id, 'likes': 0, 'comments': 0, 'createdAt': '2026-10-02T11:00:00Z'}
                comments[article_id] = []
            articles[article_id].update({'title': body['title'], 'text': body['text'], 'excerpt': body['text'][:180]})
            return respond(route, 201, {'id': article_id})
        if path.startswith('/articles/'):
            parts = path.strip('/').split('/')
            article_id = parts[1]
            if article_id not in articles:
                return respond(route, 404, {'error': 'This article could not be found.'})
            if len(parts) == 2:
                return respond(route, 200, {'article': articles[article_id]})
            if parts[2] == 'like':
                identity = (article_id, body['visitorId'])
                if identity not in likes:
                    likes.add(identity)
                    articles[article_id]['likes'] += 1
                return respond(route, 200, {'likes': articles[article_id]['likes']})
            if parts[2] == 'comments':
                if request.method == 'POST':
                    comment = {'id': '00000000000000000004-dddddddd', 'createdAt': '2026-10-02T12:00:00Z',
                               'name': body['name'], 'text': body['text']}
                    comments[article_id].insert(0, comment)
                    articles[article_id]['comments'] += 1
                    return respond(route, 201, {'id': comment['id']})
                return respond(route, 200, {'comments': comments[article_id], 'nextCursor': None})
        return respond(route, 404, {'error': 'Not found.'})

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            context = browser.new_context(viewport={'width': 1440, 'height': 1000})
            context.route('**/config.json', lambda route: respond(route, 200, {'lookupUrl': 'https://blog.test/'}))
            context.route('https://blog.test/**', api)
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(base)
            expect(page.locator('.article-card')).to_have_count(2)
            expect(page.locator('#site-title')).to_have_text('Monalisa Thinks')
            expect(page.locator('#admin-open')).to_have_text('Admin login ↗')
            page.screenshot(path=str(ARTIFACTS / 'home-desktop.png'), full_page=True)
            page.get_by_role('link', name='The things we leave unsaid', exact=False).click()
            expect(page.locator('#article-title')).to_have_text('The things we leave unsaid')
            expect(page.locator('#article-body')).to_have_text('Some thoughts take their time.\n\nOthers arrive all at once.')
            page.locator('#like').click()
            expect(page.locator('#like')).to_have_attribute('aria-pressed', 'true')
            expect(page.locator('#like-count')).to_have_text('1 like')
            page.reload()
            expect(page.locator('#like')).to_be_disabled()
            expect(page.locator('#like-count')).to_have_text('1 like')
            page.locator('#comment-name').fill('A reader')
            page.locator('#comment-text').fill('<img src=x onerror="window.injected=true"> A thoughtful article.')
            page.locator('#comment-form [type=submit]').click()
            expect(page.locator('.comment')).to_have_count(1)
            expect(page.locator('.comment p')).to_contain_text('<img src=x')
            assert not page.locator('#comment-list img').count()
            page.locator('#admin-open').click()
            page.locator('#admin-username').fill('wrong')
            page.locator('#admin-password').fill('wrong')
            page.locator('#admin-login [type=submit]').click()
            expect(page.locator('#admin-message')).to_have_text('Incorrect username or password.')
            page.locator('#admin-username').fill('test-author')
            page.locator('#admin-password').fill('test-only-password')
            page.locator('#admin-login [type=submit]').click()
            expect(page.locator('#admin-editor')).to_be_visible()
            expect(page.locator('#admin-password')).to_have_value('')
            page.locator('#new-title').fill('A new thought')
            page.locator('#new-text').fill('A first paragraph.\n\n<script>window.injected=true</script>')
            page.locator('#publish').click()
            expect(page.locator('#article-title')).to_have_text('A new thought')
            assert page.evaluate('window.injected') is None
            assert page.locator('#article-body script').count() == 0
            page.locator('#edit-article').click()
            expect(page.locator('#new-title')).to_have_value('A new thought')
            page.locator('#new-title').fill('A revised thought')
            page.locator('#publish').click()
            expect(page.locator('#article-title')).to_have_text('A revised thought')
            page.locator('.back-link').click()
            expect(page.locator('.article-card')).to_have_count(3)
            page.get_by_role('link', name='The things we leave unsaid', exact=False).click()
            expect(page.locator('.comment .text-button')).to_be_visible()
            page.locator('.comment .text-button').click()
            expect(page.locator('.comment')).to_have_count(0)
            page.locator('#admin-open').click()
            page.locator('#new-title').fill('Keep this draft')
            page.locator('#new-text').fill('A draft that should survive session expiration.')
            state['expired'] = True
            page.locator('#publish').click()
            expect(page.locator('#admin-login')).to_be_visible()
            expect(page.locator('#admin-message')).to_have_text('Please sign in again.')
            state['expired'] = False
            page.locator('#admin-username').fill('test-author')
            page.locator('#admin-password').fill('test-only-password')
            page.locator('#admin-login [type=submit]').click()
            expect(page.locator('#new-title')).to_have_value('Keep this draft')
            page.locator('#admin-logout').click()
            expect(page.locator('#admin-login')).to_be_visible()
            page.locator('#admin-close').click()
            expect(page.locator('#edit-article')).to_be_hidden()
            page.locator('.back-link').click()
            expect(page.locator('.article-card')).to_have_count(3)
            page.set_viewport_size({'width': 390, 'height': 844})
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
            bounds = page.locator('#admin-open').bounding_box()
            assert bounds['x'] > 220 and bounds['y'] < 70
            page.screenshot(path=str(ARTIFACTS / 'home-mobile.png'), full_page=True)
            page.get_by_role('link', name='The things we leave unsaid', exact=False).click()
            expect(page.locator('#article-title')).to_have_text('The things we leave unsaid')
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
            page.screenshot(path=str(ARTIFACTS / 'article-mobile.png'), full_page=True)
            state['unavailable'] = True
            page.reload()
            expect(page.locator('#article-title')).to_have_text('This article is unavailable.')
            expect(page.locator('#reader-message')).to_contain_text('temporarily unavailable')
            state['unavailable'] = False
            articles.clear()
            page.goto(base)
            expect(page.locator('.empty-state')).to_be_visible()
            assert not page.locator('.article-card').count()
            page.locator('#admin-open').click()
            expect(page.locator('#admin-login')).to_be_visible()
            page.keyboard.press('Escape')
            expect(page.locator('#admin-dialog')).not_to_be_visible()
            assert not errors, errors
            browser.close()
        print('Browser checks passed: reading, likes, comments, publishing, edits, moderation, sessions, mobile, empty/error states, and safe text rendering.')
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
