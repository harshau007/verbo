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

  useEffect(() => {
    try {
      const storedKeys = localStorage.getItem("apiKeys");
      if (storedKeys) {
        const parsedKeys: ApiKeys = JSON.parse(storedKeys);
        setApiKeys(parsedKeys);
      }
    } catch (error) {
      console.error("Failed to parse API keys from localStorage", error);
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

  return { apiKeys, saveApiKeys, isLoaded };
}
