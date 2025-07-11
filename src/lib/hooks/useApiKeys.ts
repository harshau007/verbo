import { useCallback, useEffect, useState } from "react";

export type ApiKeys = {
  gemini: string;
  elevenlabs: string;
};

export function useApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    gemini: "",
    elevenlabs: "",
  });
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [model, setModel] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("geminiModel") || "flash";
    }
    return "flash";
  });

  useEffect(() => {
    try {
      const storedKeys = localStorage.getItem("apiKeys");
      if (storedKeys) {
        const parsedKeys: ApiKeys = JSON.parse(storedKeys);
        setApiKeys(parsedKeys);
      }
      const storedModel = localStorage.getItem("geminiModel");
      if (storedModel) {
        setModel(storedModel);
      }
    } catch (error) {
      console.error("Failed to parse API keys or model from localStorage", error);
    }
    setIsLoaded(true);
  }, []);

  const saveApiKeys = useCallback((keys: ApiKeys) => {
    try {
      localStorage.setItem("apiKeys", JSON.stringify(keys));
      setApiKeys(keys);
    } catch (error) {
      console.error("Failed to save API keys to localStorage", error);
    }
  }, []);

  const saveModel = useCallback((newModel: string) => {
    try {
      localStorage.setItem("geminiModel", newModel);
      setModel(newModel);
    } catch (error) {
      console.error("Failed to save Gemini model to localStorage", error);
    }
  }, []);

  return { apiKeys, saveApiKeys, isLoaded, model, setModel: saveModel };
}
