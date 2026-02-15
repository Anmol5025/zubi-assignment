# AI Conversation App

A real-time AI conversation application that engages children in voice-based interactions centered around displayed images. The AI initiates conversations, asks questions about images, and provides dynamic visual feedback through tool calls.

## Features

- **AI-Initiated Conversations**: The AI starts talking about displayed images without user prompting
- **Voice Interaction**: Natural speech recognition and text-to-speech for hands-free conversations
- **Image-Centric Discussions**: Conversations focus on child-appropriate images with contextual questions
- **Dynamic Visual Effects**: AI triggers UI effects like highlights, emojis, and animations
- **Timed Sessions**: Conversations last approximately 60 seconds with natural wrap-up
- **Child-Friendly**: Age-appropriate language, engaging tone, and intuitive interface
- **Error Recovery**: Graceful handling of microphone, network, and API errors

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4
- **AI/LLM**: OpenAI GPT-4 with function calling
- **Voice Input**: Web Speech API (browser-native speech recognition)
- **Voice Output**: Web Speech API (browser-native text-to-speech)
- **Testing**: Jest + React Testing Library + fast-check (property-based testing)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18 or higher
- **npm**: Comes with Node.js
- **OpenAI API Key**: Required for AI conversations ([Get one here](https://platform.openai.com/api-keys))
- **Modern Browser**: Chrome, Edge, or Safari with Web Speech API support

## Installation

Follow these steps to set up the project locally:

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ai-conversation-app
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including React, TypeScript, OpenAI SDK, testing libraries, and development tools.

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Open `.env` in your text editor and configure the following variables:

```env
# OpenAI API Configuration
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_OPENAI_MODEL=gpt-4
VITE_OPENAI_BASE_URL=

# LLM Configuration
VITE_LLM_PROVIDER=openai
VITE_LLM_TEMPERATURE=0.7
VITE_LLM_MAX_TOKENS=500

# Conversation Configuration
VITE_CONVERSATION_DURATION_SECONDS=60
VITE_WRAP_UP_THRESHOLD_SECONDS=50
VITE_CHILD_AGE=

# Voice Configuration
VITE_VOICE_PROVIDER=browser
VITE_TTS_VOICE=en-US
VITE_TTS_RATE=1.0
VITE_TTS_PITCH=1.0
VITE_TTS_VOLUME=1.0
```

## Environment Variables Reference

### OpenAI API Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_OPENAI_API_KEY` | **Yes** | - | Your OpenAI API key for GPT-4 access |
| `VITE_OPENAI_MODEL` | No | `gpt-4` | OpenAI model to use (gpt-4, gpt-4-turbo, etc.) |
| `VITE_OPENAI_BASE_URL` | No | - | Custom OpenAI API base URL (for proxies or compatible APIs) |

### LLM Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_LLM_PROVIDER` | No | `openai` | LLM provider (currently only `openai` supported) |
| `VITE_LLM_TEMPERATURE` | No | `0.7` | Controls randomness (0.0-2.0). Higher = more creative |
| `VITE_LLM_MAX_TOKENS` | No | `500` | Maximum tokens per AI response |

### Conversation Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_CONVERSATION_DURATION_SECONDS` | No | `60` | Target conversation duration in seconds |
| `VITE_WRAP_UP_THRESHOLD_SECONDS` | No | `50` | When to start wrapping up the conversation |
| `VITE_CHILD_AGE` | No | - | Optional: Child's age for age-appropriate language |

### Voice Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_VOICE_PROVIDER` | No | `browser` | Voice provider (`browser` for Web Speech API) |
| `VITE_TTS_VOICE` | No | `en-US` | Text-to-speech voice locale |
| `VITE_TTS_RATE` | No | `1.0` | Speech rate (0.1-10.0). 1.0 is normal speed |
| `VITE_TTS_PITCH` | No | `1.0` | Speech pitch (0.0-2.0). 1.0 is normal pitch |
| `VITE_TTS_VOLUME` | No | `1.0` | Speech volume (0.0-1.0) |

## Running the Application

### Development Mode

Start the development server with hot module replacement:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

**Important**: When you first open the app, your browser will request microphone permissions. Click "Allow" to enable voice conversations.

### Production Build

Build the application for production:

```bash
npm run build
```

This creates an optimized build in the `dist/` directory.

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

## Running Tests

The project includes comprehensive testing with both unit tests and property-based tests.

### Run All Tests

```bash
npm test
```

This runs the entire test suite once and displays results.

### Watch Mode

Run tests in watch mode (re-runs tests when files change):

```bash
npm test:watch
```

Useful during development to get immediate feedback on code changes.

### Coverage Report

Generate a test coverage report:

```bash
npm test:coverage
```

This creates a coverage report in the `coverage/` directory and displays a summary in the terminal.

### Test Types

The project uses two complementary testing approaches:

1. **Unit Tests**: Test specific examples, edge cases, and component behavior
   - Located alongside source files with `.test.ts` or `.test.tsx` extension
   - Use Jest and React Testing Library

2. **Property-Based Tests**: Validate universal properties across randomized inputs
   - Use fast-check library
   - Run 100+ iterations per property
   - Test files include `.property` in the name (e.g., `ConversationOrchestrator.property3.test.ts`)

### Running Specific Tests

Run tests matching a pattern:

```bash
npm test -- --testNamePattern="ImageDisplay"
```

Run tests in a specific file:

```bash
npm test -- src/components/ImageDisplay.test.tsx
```

## Code Quality

### Linting

Check code for linting errors:

```bash
npm run lint
```

### Formatting

Format code with Prettier:

```bash
npm run format
```

This automatically formats all TypeScript, JavaScript, JSON, CSS, and Markdown files.

## Project Structure

```
ai-conversation-app/
├── public/
│   └── images/              # Sample images for conversations
│       ├── metadata.json    # Image descriptions and metadata
│       └── README.md        # Image documentation
├── src/
│   ├── components/          # React UI components
│   │   ├── ImageDisplay.tsx
│   │   ├── VisualEffects.tsx
│   │   ├── ConversationStateIndicator.tsx
│   │   ├── TimerDisplay.tsx
│   │   ├── UIController.tsx
│   │   ├── ErrorNotification.tsx
│   │   └── ConnectionStatusIndicator.tsx
│   ├── services/            # Core business logic services
│   │   ├── ConversationOrchestrator.ts
│   │   ├── SessionStateManager.ts
│   │   ├── LLMClient.ts
│   │   ├── PromptManager.ts
│   │   ├── SpeechToTextHandler.ts
│   │   ├── TextToSpeechHandler.ts
│   │   ├── ToolRegistry.ts
│   │   ├── NetworkMonitor.ts
│   │   └── MicrophonePermissionHandler.ts
│   ├── contexts/            # React contexts for state management
│   │   └── UIContext.tsx
│   ├── types/               # TypeScript type definitions
│   │   ├── conversation.ts
│   │   ├── imageMetadata.ts
│   │   └── webSpeechAPI.d.ts
│   ├── utils/               # Utility functions
│   │   ├── retryWithBackoff.ts
│   │   └── errorLogger.ts
│   ├── config/              # Configuration management
│   │   └── appConfig.ts
│   ├── __tests__/           # Integration tests
│   │   └── integration/
│   ├── App.tsx              # Root application component
│   └── main.tsx             # Application entry point
├── .env.example             # Example environment variables
├── .env                     # Your local environment variables (not in git)
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite build configuration
├── jest.config.cjs          # Jest test configuration
└── README.md                # This file
```

## Browser Compatibility

The application requires a modern browser with Web Speech API support:

- **Chrome/Edge**: Full support (recommended)
- **Safari**: Partial support (speech recognition may be limited)
- **Firefox**: Limited support (may require alternative voice providers)

For best results, use Chrome or Edge.

## Troubleshooting

### Microphone Not Working

1. Check browser permissions: Click the lock icon in the address bar and ensure microphone access is allowed
2. Verify your microphone is connected and working in other applications
3. Try refreshing the page and allowing permissions again

### API Errors

1. Verify your `VITE_OPENAI_API_KEY` is correct in `.env`
2. Check your OpenAI account has available credits
3. Ensure you're using a supported model (gpt-4, gpt-4-turbo)

### Build Errors

1. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Ensure you're using Node.js 18 or higher: `node --version`

### Test Failures

1. Ensure all dependencies are installed: `npm install`
2. Check that `.env` is configured (some tests may need environment variables)
3. Run tests with verbose output: `npm test -- --verbose`

