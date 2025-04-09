import { ref, onMounted } from 'vue';

export function useSpeech() {
  const speechRate = ref(1.0); // Default speech rate
  
  // Load saved speech rate from cookie on mount
  onMounted(() => {
    const savedRate = getCookie('speechRate');
    if (savedRate) {
      speechRate.value = parseFloat(savedRate);
    }
  });
  
  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR'; // Set language to Brazilian Portuguese
    utterance.rate = speechRate.value;

    window.speechSynthesis.speak(utterance);
  };

  const setSpeechRate = (rate: number) => {
    const newRate = Math.max(0.1, Math.min(10, rate)); // Clamp between 0.1 and 10
    speechRate.value = newRate;
    setCookie('speechRate', newRate.toString(), 365); // Save to cookie for 1 year
  };

  // Cookie helper functions
  const setCookie = (name: string, value: string, days: number) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  };

  const getCookie = (name: string): string | null => {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  };

  return {
    speak,
    speechRate,
    setSpeechRate
  };
}