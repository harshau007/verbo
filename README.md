# CEFR Speaking Practice Tool

A Next.js 15 web application for practicing English and German speaking skills, based on the CEFR framework.

## Features

- **Dashboard**: View past sessions and start new ones.
- **Practice Sessions**: Record your voice, get an AI response, and interact with an avatar.
- **AI-Powered**: Uses Gemini for speech-to-text and feedback, and ElevenLabs for text-to-speech.
- **Review**: Get detailed feedback on your performance and CEFR level confirmation.
- **Fully-Typed**: Built with TypeScript for a robust development experience.
- **Modern UI**: Uses shadcn/ui and Tailwind CSS for a clean and responsive design.

## Tech Stack

- **Framework**: Next.js 15 (App Directory)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Deployment**: Vercel

## Setup & Installation

1.  **Clone the repository:**

    ```bash
    git clone [https://github.com/your-username/cefr-speaking-practice.git](https://github.com/your-username/cefr-speaking-practice.git)
    cd cefr-speaking-practice
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up API Keys:**

    - Go to the `/settings` page in the application.
    - Enter your API keys for Google Gemini and ElevenLabs. These are stored locally in your browser's `localStorage`.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to view the application.

## Deployment to Vercel

1.  **Push your code to a Git repository** (e.g., GitHub, GitLab, Bitbucket).

2.  **Import your project into Vercel:**

    - Go to your Vercel dashboard.
    - Click "Add New..." -> "Project".
    - Select your Git repository.
    - Vercel will automatically detect that it's a Next.js project and configure the build settings.

3.  **Configure Environment Variables (Optional):**

    - While the app is designed to take API keys from the client-side, for a more secure setup in a production environment, you might refactor the API routes to use environment variables. You can add these in your Vercel project settings.

4.  **Deploy:**
    - Click the "Deploy" button. Your application will be built and deployed. You'll be provided with a public URL.
