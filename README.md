# Monalisa Thinks

A personal blog in the original dark gold style. The homepage lists article titles, newest first. Readers can open an article, like it, and leave a named comment. A small **Admin login** at the top right opens the private editor.

The website remains plain HTML, CSS, and JavaScript, with no frontend packages or build tools required. Articles, likes, and comments are shared through the AWS Lambda and DynamoDB backend defined in [infrastructure.yml](infrastructure.yml).

## Using the blog

- Sign in using your privately configured admin username and password.
- Enter an article title and write the article, then select **Publish article**. Paragraphs and line breaks are preserved. Titles support 180 characters; articles support 50,000 characters.
- While signed in, open an article and select **Edit article** to update it. **New article** clears the editor for another post.
- Visitors can like each article once per browser identity and comment without creating an account. Likes are deduplicated on the server; clearing browser storage creates a new identity.
- Admins can remove unwanted comments. Public comments are immediately visible. Comments support a 60-character name and 2,000 characters of text.
- The admin session lasts one hour and is kept in the current browser tab. Unauthenticated requests cannot publish, edit, or remove comments. Login attempts and public writes have rate limits.

The username and password are configured on the server. The password is never included in the browser files or committed to this repository. There is one administrator account and no registration.

## Deploy to the existing AWS site

These changes require both a backend stack update and an Amplify redeploy. Updating just the static site is insufficient because the former backend supported code lookup.

1. Upload **infrastructure.yml** to AWS CloudShell in **eu-north-1**. Update the existing stack to keep the existing Lambda Function URL:

   ```sh
   read -rp 'Admin username: ' BLOG_ADMIN_USERNAME
   read -rsp 'Admin password: ' BLOG_ADMIN_PASSWORD
   echo
   aws cloudformation deploy --template-file infrastructure.yml --stack-name aura-lookup \
     --capabilities CAPABILITY_IAM --region eu-north-1 \
     --parameter-overrides "AdminUsername=$BLOG_ADMIN_USERNAME" "AdminPassword=$BLOG_ADMIN_PASSWORD"
   unset BLOG_ADMIN_USERNAME BLOG_ADMIN_PASSWORD
   ```

   Enter your chosen credentials here privately. The template's default username is `monalisa` when no override is provided. The password is a required, masked CloudFormation parameter. The old code table is retained during the update; the blog has its own table.

2. Read the stack's **LookupUrl** output and use it as the existing Amplify app's **LOOKUP_URL** environment variable. The current app ID recorded by this repository is `d1g6w5nbtfef3`. The existing name is retained for deployment compatibility.
3. Deploy the changed repository to the Amplify app's `main` branch. [amplify.yml](amplify.yml) publishes the static files and creates `config.json` with the backend URL.
4. Open the site, sign in, and publish your first article. An empty blog shows an intentional “first thought is on its way” state.

The app must use Amplify's static `WEB` platform. Articles appear immediately after publishing without a website redeploy. The DynamoDB tables are retained if the stack is deleted.

## Local checks

Python and Node.js are development tools only; visitors and the Amplify static build do not need them.

```sh
python -m pip install -r requirements-dev.txt
python -m unittest discover -s tests -p "test_*.py"
node --check app.js
cfn-lint infrastructure.yml
python -m playwright install chromium
python tests/browser_check.py
```

The backend tests use a mocked DynamoDB service with the actual inline Lambda code. The browser check serves the real static files locally and intercepts API requests with test data; it covers desktop and mobile navigation, publishing, edits, likes, comments, expired sessions, and literal rendering of untrusted content. Its screenshots are saved under the ignored `test-artifacts/` directory. These checks do not deploy or call a live AWS account.

For a manual frontend preview, run `python -m http.server 8000 --bind 127.0.0.1` and open `http://localhost:8000`. Local publishing needs a configured HTTPS backend; the preview does not invent an admin password or save browser-only articles.

## Artwork

[blog-background.png](blog-background.png) is a text-free edit of the original [aura-background.jpg](aura-background.jpg), produced using the built-in imagegen tool. Final edit prompt: “Remove all lettering, navigation, slogans, symbols, and the input/search pill; reconstruct the dark sphere surface and landscape beneath. Preserve the central gold ring, mountains, platform, reflections, composition, and black and warm gold palette. No new objects, text, or UI.” The original image is preserved.

AWS reference: [DynamoDB transaction permissions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis-iam.html) and [Lambda Function URL access](https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html).
