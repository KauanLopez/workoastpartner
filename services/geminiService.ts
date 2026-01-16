import { GoogleGenAI } from "@google/genai";
import { Candidate } from "../types";

export const generateCandidateSummary = async (candidate: Candidate): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("No API Key found for Gemini");
    return "AI Insights are unavailable in demo mode without an API key. (Simulated response: This candidate appears to be a strong fit based on their role and location.)";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Using flash model for speed
    const model = 'gemini-2.5-flash';
    const prompt = `
      You are an expert HR assistant. 
      Write a very brief (2-3 sentences), engaging summary for a candidate profile.
      Candidate Name: ${candidate.name}
      Role: ${candidate.role}
      Location: ${candidate.location}
      Status: ${candidate.status}
      
      Focus on why a company should hire them. Be professional but enthusiastic.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "No summary available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate insight at this moment.";
  }
};