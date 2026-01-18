
# JourneyGenie AI Itinerary Planner

This project is a standalone frontend application that uses the Gemini API to generate travel itineraries. It does not require a backend server or database.
## Run Locally

**Prerequisites:** [Node.js](https://nodejs.org/)

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Set up environment variables:**
    Create a file named `.env.local` in the root of the project and add your API keys:
    ```
    VITE_GEMINI_API_KEY="YOUR_GOOGLE_GEMINI_API_KEY"
    VITE_OPENROUTESERVICE_API_KEY="YOUR_OPENROUTESERVICE_API_KEY"
    ```
    *   Get your Gemini API key from [Google AI Studio](https://ai.google.dev/).
    *   Get your OpenRouteService API key from [their website](https://openrouteservice.org/).

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.
