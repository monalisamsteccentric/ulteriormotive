import base64
import json
import os
from pathlib import Path
import types
import unittest
from unittest.mock import patch
import uuid

import boto3
from moto import mock_aws
import yaml

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = yaml.load((ROOT / 'infrastructure.yml').read_text(encoding='utf-8'), Loader=yaml.BaseLoader)
SOURCE = TEMPLATE['Resources']['LookupFunction']['Properties']['Code']['ZipFile']


class BlogTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, {
            'AWS_DEFAULT_REGION': 'eu-north-1',
            'AWS_ACCESS_KEY_ID': 'testing',
            'AWS_SECRET_ACCESS_KEY': 'testing',
            'TABLE_NAME': 'blog-tests',
            'ADMIN_USERNAME': 'test-author',
            'ADMIN_PASSWORD': 'test-only-password'
        })
        self.environment.start()
        self.aws = mock_aws()
        self.aws.start()
        db = boto3.client('dynamodb')
        db.create_table(
            TableName='blog-tests', BillingMode='PAY_PER_REQUEST',
            AttributeDefinitions=[{'AttributeName': k, 'AttributeType': 'S'} for k in ('pk', 'sk')],
            KeySchema=[{'AttributeName': 'pk', 'KeyType': 'HASH'},
                       {'AttributeName': 'sk', 'KeyType': 'RANGE'}])
        self.backend = types.ModuleType('blog_backend')
        exec(compile(SOURCE, 'infrastructure.yml:ZipFile', 'exec'), self.backend.__dict__)
        self.token = self.call('POST', '/admin/login', {
            'username': 'test-author', 'password': 'test-only-password'
        })[1]['token']

    def tearDown(self):
        self.aws.stop()
        self.environment.stop()

    def call(self, method, path, data=None, token=None, query=None, ip='127.0.0.1', raw=None, encoded=False):
        event = {
            'rawPath': path,
            'requestContext': {'http': {'method': method, 'sourceIp': ip}},
            'headers': {'Authorization': 'Bearer ' + token} if token else {},
            'queryStringParameters': query,
            'body': raw if raw is not None else json.dumps(data) if data is not None else '',
            'isBase64Encoded': encoded
        }
        result = self.backend.handler(event, None)
        return result['statusCode'], json.loads(result['body'])

    def publish(self, title='A first thought', text='One paragraph.\n\nAnother paragraph.'):
        status, data = self.call('POST', '/admin/articles', {'title': title, 'text': text}, self.token)
        self.assertEqual(status, 201, data)
        return data['id']

    def test_only_owner_can_publish_edit_and_moderate(self):
        data = {'title': 'Forbidden', 'text': 'No access'}
        self.assertEqual(self.call('POST', '/admin/articles', data)[0], 401)
        article_id = self.publish()
        self.assertEqual(self.call('POST', '/admin/articles/' + article_id, data, 'forged')[0], 401)
        comment_id = self.call('POST', '/articles/' + article_id + '/comments',
                               {'name': 'Reader', 'text': 'Hello'})[1]['id']
        remove = '/admin/articles/' + article_id + '/comments/' + comment_id + '/remove'
        self.assertEqual(self.call('POST', remove, {})[0], 401)

    def test_credentials_and_signature_are_checked_server_side(self):
        for credentials in ({'username': 'wrong', 'password': 'test-only-password'},
                            {'username': 'test-author', 'password': 'wrong'},
                            {'username': 'λ', 'password': 'λ'}):
            self.assertEqual(self.call('POST', '/admin/login', credentials)[0], 401)
        changed = self.token[:-1] + ('a' if self.token[-1] != 'a' else 'b')
        self.assertEqual(self.call('POST', '/admin/articles', {}, changed)[0], 401)
        with patch.object(self.backend.time, 'time', return_value=int(self.token.split('.')[0]) + 1):
            self.assertEqual(self.call('POST', '/admin/articles', {}, self.token)[0], 401)

    def test_homepage_lists_titles_and_detail_preserves_text(self):
        article_id = self.publish('My title', 'A paragraph.\n\nA second paragraph.')
        status, data = self.call('GET', '/articles')
        self.assertEqual(status, 200)
        self.assertEqual(data['articles'][0]['title'], 'My title')
        self.assertNotIn('text', data['articles'][0])
        detail = self.call('GET', '/articles/' + article_id)[1]['article']
        self.assertEqual(detail['text'], 'A paragraph.\n\nA second paragraph.')
        self.assertEqual(detail['likes'], 0)
        self.assertEqual(detail['comments'], 0)

    def test_like_is_persistent_and_duplicate_does_not_increment(self):
        article_id = self.publish()
        path = '/articles/' + article_id + '/like'
        visitor = {'visitorId': str(uuid.uuid4())}
        self.assertEqual(self.call('POST', path, visitor), (200, {'likes': 1}))
        self.assertEqual(self.call('POST', path, visitor), (200, {'likes': 1}))
        self.assertEqual(self.call('POST', path, {'visitorId': str(uuid.uuid4())}), (200, {'likes': 2}))
        self.assertEqual(self.call('GET', '/articles/' + article_id)[1]['article']['likes'], 2)

    def test_public_comment_then_owner_removal_updates_count(self):
        article_id = self.publish()
        path = '/articles/' + article_id + '/comments'
        status, data = self.call('POST', path, {'name': 'Reader', 'text': 'Love this!'})
        self.assertEqual(status, 201)
        self.assertEqual(self.call('GET', path)[1]['comments'][0]['text'], 'Love this!')
        self.assertEqual(self.call('GET', '/articles/' + article_id)[1]['article']['comments'], 1)
        remove = '/admin/articles/' + article_id + '/comments/' + data['id'] + '/remove'
        self.assertEqual(self.call('POST', remove, {}, self.token)[0], 200)
        self.assertEqual(self.call('POST', remove, {}, self.token)[0], 200)
        self.assertEqual(self.call('GET', path)[1]['comments'], [])
        self.assertEqual(self.call('GET', '/articles/' + article_id)[1]['article']['comments'], 0)

    def test_edit_preserves_date_likes_and_comments(self):
        article_id = self.publish()
        original = self.call('GET', '/articles/' + article_id)[1]['article']
        self.call('POST', '/articles/' + article_id + '/like', {'visitorId': str(uuid.uuid4())})
        self.call('POST', '/articles/' + article_id + '/comments', {'name': 'A reader', 'text': 'Hi'})
        self.assertEqual(self.call('POST', '/admin/articles/' + article_id,
                                   {'title': 'Updated title', 'text': 'Updated text'}, self.token)[0], 200)
        updated = self.call('GET', '/articles/' + article_id)[1]['article']
        self.assertEqual(updated['title'], 'Updated title')
        self.assertEqual(updated['text'], 'Updated text')
        self.assertEqual(updated['createdAt'], original['createdAt'])
        self.assertEqual((updated['likes'], updated['comments']), (1, 1))

    def test_limits_empty_fields_malformed_json_and_base64(self):
        for data in ({'title': ' ', 'text': 'x'}, {'title': 'x', 'text': ''},
                     {'title': 'x' * 181, 'text': 'x'}, {'title': 'x', 'text': 'x' * 50001}):
            self.assertEqual(self.call('POST', '/admin/articles', data, self.token)[0], 400)
        self.assertEqual(self.call('POST', '/admin/login', raw='{')[0], 400)
        self.assertEqual(self.call('POST', '/admin/login', raw='[]')[0], 400)
        self.assertEqual(self.call('POST', '/admin/login', raw='!!!', encoded=True)[0], 400)
        encoded = base64.b64encode(json.dumps({'title': 'Encoded', 'text': 'A thought'}).encode()).decode()
        self.assertEqual(self.call('POST', '/admin/articles', token=self.token, raw=encoded, encoded=True)[0], 201)

    def test_unicode_article_and_untrusted_content_remain_literal(self):
        text = 'বাংলা thoughts\n<script>alert(1)</script>'
        article_id = self.publish('একটি ভাবনা', text)
        self.assertEqual(self.call('GET', '/articles/' + article_id)[1]['article']['text'], text)

    def test_login_comment_and_like_rate_limits(self):
        for _ in range(9):
            self.assertEqual(self.call('POST', '/admin/login', {'username': 'bad', 'password': 'bad'})[0], 401)
        self.assertEqual(self.call('POST', '/admin/login', {'username': 'test-author', 'password': 'test-only-password'})[0], 429)
        article_id = self.publish()
        path = '/articles/' + article_id + '/comments'
        self.assertEqual(self.call('POST', path, {'name': 'Reader', 'text': 'Hi'})[0], 201)
        self.assertEqual(self.call('POST', path, {'name': 'Reader', 'text': 'Again'})[0], 429)
        self.assertEqual(self.call('POST', path, {'name': 'Reader', 'text': 'Hi', 'website': 'spam'})[0], 400)
        for _ in range(60):
            self.assertEqual(self.call('POST', '/articles/' + article_id + '/like', {'visitorId': str(uuid.uuid4())})[0], 200)
        self.assertEqual(self.call('POST', '/articles/' + article_id + '/like', {'visitorId': str(uuid.uuid4())})[0], 429)

    def test_newest_first_and_pagination_without_duplicates(self):
        ids = [self.publish('Article ' + str(i)) for i in range(23)]
        page = self.call('GET', '/articles')[1]
        self.assertEqual([a['id'] for a in page['articles']], list(reversed(ids))[:20])
        next_page = self.call('GET', '/articles', query={'cursor': page['nextCursor']})[1]
        self.assertEqual([a['id'] for a in next_page['articles']], list(reversed(ids))[20:])
        self.assertIsNone(next_page['nextCursor'])
        self.assertEqual(self.call('GET', '/articles', query={'cursor': 'bad!'})[0], 400)
        wrong_partition = base64.urlsafe_b64encode(json.dumps(self.backend.key('RATE#private', ids[0])).encode()).decode()
        self.assertEqual(self.call('GET', '/articles', query={'cursor': wrong_partition})[0], 400)

    def test_missing_articles_cannot_receive_likes_comments_or_edits(self):
        article_id = '00000000000000000000-aaaaaaaa'
        self.assertEqual(self.call('GET', '/articles/' + article_id)[0], 404)
        self.assertEqual(self.call('POST', '/articles/' + article_id + '/comments', {'name': 'Reader', 'text': 'Hi'})[0], 404)
        self.assertEqual(self.call('POST', '/articles/' + article_id + '/like', {'visitorId': str(uuid.uuid4())})[0], 404)
        self.assertEqual(self.call('POST', '/admin/articles/' + article_id, {'title': 'Missing', 'text': 'Hi'}, self.token)[0], 404)

    def test_storage_failure_returns_safe_error(self):
        from botocore.exceptions import ClientError
        with patch.object(self.backend.db, 'query', side_effect=ClientError(
                {'Error': {'Code': 'ProvisionedThroughputExceededException'}}, 'Query')):
            status, data = self.call('GET', '/articles')
        self.assertEqual(status, 503)
        self.assertNotIn('Throughput', data['error'])


if __name__ == '__main__':
    unittest.main()
