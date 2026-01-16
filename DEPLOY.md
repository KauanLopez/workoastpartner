# Deployment Guide for Workoast Partner Portal

## Prerequisites

- GitHub account
- Vercel account
- Supabase Project (URL and Anon Key)
- Gemini API Key

## 1. Prepare Environment Variables

Ensure you have the following secrets ready. DO NOT commit `.env` or `.env.local` to GitHub.

- `VITE_SUPABASE_URL`: Your Supabase Project URL
- `VITE_SUPABASE_KEY`: Your Supabase Anon Public Key
- `VITE_GEMINI_API_KEY`: Your Google Gemini API Key

## 2. Deploy to Vercel

1.  **Push to GitHub**: Ensure your latest code is pushed to your GitHub repository.
2.  **Import Project in Vercel**:
    - Go to your Vercel Dashboard.
    - Click **"Add New..."** -> **"Project"**.
    - Select your GitHub repository (`workoastpartner`).
    - Click **"Import"**.
3.  **Configure Project**:
    - **Framework Preset**: Vercel should automatically detect `Vite`. If not, select it manually.
    - **Root Directory**: `workoastpartner` (Ensure this points to the folder containing `package.json`).
4.  **Environment Variables**:
    - Expand the **"Environment Variables"** section.
    - Add the variables from Step 1 (`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_GEMINI_API_KEY`).
5.  **Deploy**:
    - Click **"Deploy"**.
    - Wait for the build to complete.

## 3. Post-Deployment Verification

- Open the deployed Vercel URL.
- Log in to the application.
- Verify that Supabase data loads correctly.
- Test the "AI Insights" feature (uses Gemini) for a candidate to ensure the API key is configured correctly.
