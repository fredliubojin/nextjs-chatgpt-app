To use the `amplify:al2023` build image, which supports Node 18, for hosting a new Next.js 14 app on AWS Amplify, you will need to specify this build image in your Amplify app's build settings. Here is a step-by-step guide to get you started:

## Prerequisites

- Ensure you have a Next.js 14 application ready for deployment.
- An AWS account with the necessary permissions to create and manage AWS Amplify applications.

## Step 1: Connect Your Repository

1. Sign in to the AWS Management Console and navigate to the AWS Amplify Console.
2. Click on **New app** and select **Host web app**.
3. Choose the Git provider where your repository is hosted (e.g., GitHub, GitLab, Bitbucket, etc.), and authenticate with your account if prompted.
4. Select the repository and branch that contains your Next.js 14 application.
5. Click **Next**.

## Step 2: Configure Build Settings

1. In the "Build and test settings" section, you'll see the default generated build settings.
2. Click on the **Edit** button to modify the build settings.
3. Update the `amplify.yml` configuration file to the one below.

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - nvm use 18
        - npm ci
    build:
      commands:
        - rm -rdf .next
        - npm run build
        - nvm use 18
    postBuild:
      commands:
        - rm -rfd .next/cache
  artifacts:
    baseDirectory: .next
    files:
      - 'BUILD_ID'
      - 'app-build-manifest.json'
      - 'app-path-routes-manifest.json'
      - 'build-manifest.json'
      - 'export-marker.json'
      - 'images-manifest.json'
      - 'next-minimal-server.js.nft.json'
      - 'next-server.js.nft.json'
      - 'package.json'
      - 'prerender-manifest.js'
      - 'prerender-manifest.json'
      - 'react-loadable-manifest.json'
      - 'required-server-files.json'
      - 'routes-manifest.json'
      - 'server/**/*'
      - 'static/**/*'
      - 'trace/**/*'
      - 'types/**/*'
  cache:
    paths:
      - node_modules/**/*
```
4. Click on the "Advanced Settings", and specify the "Build image" as amplify:al2023. Also set any environment variables you need.
5. After updating the build settings, click **Next**.

## Step 3: Review and Deploy

1. Review all the settings on the "Review" page to ensure they are correct.
2. Click on **Save and deploy** to start the deployment process.

AWS Amplify will now use the specified build image to build and deploy your Next.js 14 application. This process might take a few minutes, and you can monitor the progress in the AWS Amplify Console.

## Step 4: Access Your Application

Once the deployment process is complete, AWS Amplify will provide you with a hosted URL to access your application.

1. In the AWS Amplify Console, navigate to the **Overview** page for your application.
2. Look for the domain under the **Domain** section, which will be in the format `https://<branch-name>.<region>.amplifyapp.com`.
3. Click on the link to access your deployed Next.js 14 application.

## Step 5: Custom Domain (Optional)

If you want to use a custom domain with your Amplify application:

1. In the AWS Amplify Console, click on **Domain management** in the left navigation pane.
2. Click on **Add domain**.
3. Follow the instructions to add your custom domain and configure DNS settings.

## Support

If you encounter any issues while deploying your Next.js 14 application using the `amplify:al2023` build image, you can:

- Check the [AWS Amplify Documentation](https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html) for guidance.
- Open a support ticket with AWS if you face any issues related to the AWS Amplify service.

**Note:** The above instructions assume that the `amplify:al2023` build image is available and supports Node 18. If the image is not available or if you encounter any issues, please refer to the AWS Amplify documentation or the AWS support team for assistance.