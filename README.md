# Aura

A static code lookup page hosted by Amazon Amplify. Visitors search a code and read its text. An admin panel lets you add codes after signing in. The website has no npm packages or local installation steps.

## AWS setup

1. The Amplify app must use the static `WEB` platform. The existing app ID is `d1g6w5nbtfef3` in Stockholm. In AWS CloudShell, run:

   ```sh
   aws amplify update-app --app-id d1g6w5nbtfef3 --platform WEB --region eu-north-1
   ```

2. Create or update the CloudFormation stack with [`infrastructure.yml`](infrastructure.yml). It creates a DynamoDB table, a Lambda lookup and admin function, a public Function URL, and a Lambda IAM role that can read and add items. The template asks for `AdminPassword`; enter the password you chose for the `admin` account. No password is committed to GitHub. After the new site build succeeds, CloudShell can download the template directly from the site. Run:

   ```sh
   curl -fsSL https://main.d1g6w5nbtfef3.amplifyapp.com/infrastructure.yml -o infrastructure.yml
   read -rsp 'Admin password: ' ADMIN_PASSWORD; echo
   aws cloudformation deploy --template-file infrastructure.yml --stack-name aura-lookup \
     --capabilities CAPABILITY_IAM --region eu-north-1 \
     --parameter-overrides "AdminPassword=$ADMIN_PASSWORD"
   unset ADMIN_PASSWORD
   ```

   If the stack already exists, this updates the Lambda function and permissions. CloudFormation masks the parameter in stack descriptions. Lambda receives it as an encrypted environment variable. Keep the password private.

3. Copy the stack's `LookupUrl` output into the existing Amplify app as an environment variable named `LOOKUP_URL`, then redeploy `main`. The repo's [`amplify.yml`](amplify.yml) writes the URL into the published `config.json`.
4. Open the site. Search for a code, or click **Admin access** near the lower right. Sign in with username `admin` and the password entered in step 2. Enter a code and text, then select **Save code**. Codes are converted to uppercase and may contain letters, digits, `_`, or `-` (up to 64 characters). Text can have up to 10,000 characters.

The admin panel refuses duplicate codes. Each login lasts one hour in that browser tab. Adding a code takes effect immediately without redeploying the website. You can also manage items directly in the DynamoDB table named by the stack's `TableName` output. The table is retained if the stack is deleted.

The Function URL is public so visitors can search. Only a valid admin session can write through it. The password is checked by Lambda and is never sent to visitors in the website files.
