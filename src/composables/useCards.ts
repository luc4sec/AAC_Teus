import { ref } from 'vue'
import type { Card } from '../types'

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Cache para armazenar cards
const cardCache = new Map<string, Card[]>();

export function useCards() {
  const cards = ref<Card[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Função auxiliar para fazer requisições à API
  const fetchAPI = async (url: string, options?: RequestInit) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('API Error:', err);
      error.value = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  // Carregar cards iniciais
  const loadInitialCards = async () => {
    if (loading.value) return;
    
    loading.value = true;
    error.value = null;
    
    try {
      const cachedCards = cardCache.get('root');
      if (cachedCards) {
        cards.value = cachedCards;
        return;
      }

      const data = await fetchAPI(`${API_URL}/cards`);
      console.log('Cards recebidos do backend:', data.map((c: Card) => ({ id: c.id, position: c.position, title: c.title })));
      cards.value = data;
      cardCache.set('root', data);
    } finally {
      loading.value = false;
    }
  }

  // Carregar cards iniciais
  loadInitialCards();

  const saveCard = async (card: Omit<Card, 'id'>, parentId?: string): Promise<Card> => {
    loading.value = true;
    error.value = null;
    
    try {
      const url = parentId 
        ? `${API_URL}/cards/${parentId}/subcards` 
        : `${API_URL}/cards`;
      
      const newCard = await fetchAPI(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(card),
      });
      
      // Limpar o cache para forçar recarregamento
      cardCache.clear();
      
      return newCard;
    } finally {
      loading.value = false;
    }
  }

  const updateCard = async (updatedCard: Card) => {
    loading.value = true;
    error.value = null;
    
    try {
      await fetchAPI(`${API_URL}/cards/${updatedCard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedCard),
      });
      
      // Atualizar cache
      const rootCards = cardCache.get('root');
      if (rootCards) {
        const index = rootCards.findIndex(c => c.id === updatedCard.id);
        if (index !== -1) {
          rootCards[index] = updatedCard;
          cardCache.set('root', rootCards);
        }
      }
    } finally {
      loading.value = false;
    }
  }

  const deleteCard = async (cardId: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      await fetchAPI(`${API_URL}/cards/${cardId}`, {
        method: 'DELETE',
      });
      
      // Atualizar cache em todos os níveis
      const updateCache = (cards: Card[]): Card[] => {
        return cards.filter(c => c.id !== cardId).map(card => {
          if (card.subcards) {
            return {
              ...card,
              subcards: updateCache(card.subcards)
            };
          }
          return card;
        });
      };

      // Atualizar cache raiz
      const rootCards = cardCache.get('root');
      if (rootCards) {
        cardCache.set('root', updateCache(rootCards));
      }

      // Atualizar cache de subcards
      for (const [parentId, subcards] of cardCache.entries()) {
        if (parentId !== 'root') {
          cardCache.set(parentId, updateCache(subcards));
        }
      }

      // Atualizar cards atuais
      cards.value = updateCache(cards.value);
    } finally {
      loading.value = false;
    }
  }

  const loadSubcards = async (parentId: string): Promise<Card[]> => {
    loading.value = true;
    error.value = null;
    
    try {
      const cachedSubcards = cardCache.get(parentId);
      if (cachedSubcards) {
        return cachedSubcards;
      }

      const subcards = await fetchAPI(`${API_URL}/cards/${parentId}/subcards`);
      console.log('Subcards recebidos do backend:', subcards.map((c: Card) => ({ id: c.id, position: c.position, title: c.title })));
      cardCache.set(parentId, subcards);
      return subcards;
    } finally {
      loading.value = false;
    }
  }

  const reorderCards = async (cardId: string, targetPosition: number, parentId?: string): Promise<Card[]> => {
    loading.value = true;
    error.value = null;
    
    try {
      console.log(`Enviando reordenação para o backend: cardId=${cardId}, targetPosition=${targetPosition}, parentId=${parentId || 'root'}`);
      
      const updatedCards = await fetchAPI(`${API_URL}/cards/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardId,
          targetPosition,
          parentId
        }),
      });
      
      console.log('Cards reordenados recebidos do backend:', updatedCards.map((c: Card) => ({ id: c.id, position: c.position, title: c.title })));
      
      // Atualizar cache e o state reativo
      if (!parentId) {
        // Se for cards do nível raiz, atualizar o array principal e o cache
        cards.value = updatedCards;
        cardCache.set('root', updatedCards);
        return updatedCards;
      } else {
        // Se for subcards, atualizar apenas o cache do parentId
        cardCache.set(parentId, updatedCards);
        return updatedCards;
      }
    } catch (error) {
      console.error('Error reordering cards:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  const reorderNestedCards = async (cardId: string, targetPosition: number, parentPath: string[]): Promise<Card[]> => {
    loading.value = true;
    error.value = null;
    
    try {
      const updatedSubcards = await fetchAPI(`${API_URL}/cards/reorder-nested`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardId,
          targetPosition,
          parentPath
        }),
      });
      
      // Atualizar cache para cada nível do path
      parentPath.forEach((parentId, index) => {
        if (index === parentPath.length - 1) {
          cardCache.set(parentId, updatedSubcards);
        }
      });
      
      return updatedSubcards;
    } finally {
      loading.value = false;
    }
  }

  return {
    cards,
    loading,
    error,
    saveCard,
    updateCard,
    deleteCard,
    loadSubcards,
    reorderCards,
    reorderNestedCards
  }
}