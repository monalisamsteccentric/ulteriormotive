# Aura

A static code lookup page hosted by the existing Amazon Amplify app. It makes a public read-only request to a Lambda Function URL; Lambda reads one item from DynamoDB. There are no npm packages or local installation steps.

## One-time AWS setup

1. In the AWS CloudFormation console, create a stack by uploading [`infrastructure.yml`](infrastructure.yml). Acknowledge that it creates an IAM role. Use the same AWS account and Region as your other resources.
2. When the stack finishes, copy its **LookupUrl** output. In the existing Amplify app, add an environment variable named `LOOKUP_URL` with that value, then redeploy the branch. The repo's `amplify.yml` builds the static site and writes the URL into `config.json`.
3. In DynamoDB, open the table named in the stack's **TableName** output and create items. Each item needs a `code` String (uppercase letters, digits, `_` or `-`, up to 64 characters) and a `text` String. Example: `code = WELCOME`, `text = Your message here.`

The lookup endpoint is public because anyone visiting the site must be able to search. It permits only `GetItem` on this table and returns only the `text` field. Add or edit items in the DynamoDB console; the website has no write function. The table is retained if the CloudFormation stack is deleted so its contents are not accidentally removed.

After setup, visit the Amplify site and search for `WELCOME`. Unknown codes display a simple not-found message.
