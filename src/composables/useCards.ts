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
        body: JSON.stringify({
          ...card,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }),
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
      const cardToUpdate = {
        ...updatedCard,
        updatedAt: new Date().toISOString()
      };

      await fetchAPI(`${API_URL}/cards/${updatedCard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardToUpdate),
      });
      
      // Atualizar cache
      const rootCards = cardCache.get('root');
      if (rootCards) {
        const index = rootCards.findIndex(c => c.id === updatedCard.id);
        if (index !== -1) {
          rootCards[index] = cardToUpdate;
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

  const copyCard = async (card: Card, targetCard: Card): Promise<Card> => {
    loading.value = true;
    error.value = null;
    
    try {
      // Função auxiliar para copiar um card e seus subcards
      const copyCardAndSubcards = async (cardToCopy: Card): Promise<Card> => {
        // Gerar novo ID para o card
        const newId = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Criar cópia do card
        const copiedCard = {
          ...cardToCopy,
          id: newId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Se o card tiver subcards, copiar cada um deles
        if (cardToCopy.subcards) {
          copiedCard.subcards = await Promise.all(
            cardToCopy.subcards.map(copyCardAndSubcards)
          );
        }
        
        return copiedCard;
      };
      
      // Copiar o card e seus subcards
      const copiedCard = await copyCardAndSubcards(card);
      
      // Adicionar o card copiado como subcard do card de destino
      const updatedTargetCard = {
        ...targetCard,
        subcards: [...(targetCard.subcards || []), copiedCard],
        updatedAt: new Date().toISOString()
      };
      
      // Atualizar o card de destino no backend
      await fetchAPI(`${API_URL}/cards/${targetCard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTargetCard),
      });
      
      // Limpar o cache para forçar recarregamento
      cardCache.clear();
      
      return copiedCard;
    } finally {
      loading.value = false;
    }
  };

  const moveCard = async (card: Card, targetCard: Card): Promise<void> => {
    loading.value = true;
    error.value = null;
    
    try {
      // Encontrar o card pai do card que está sendo movido
      const findParentCard = (cards: Card[], targetId: string): Card | null => {
        for (const currentCard of cards) {
          if (currentCard.subcards) {
            if (currentCard.subcards.some(c => c.id === targetId)) {
              return currentCard;
            }
            const found = findParentCard(currentCard.subcards, targetId);
            if (found) return found;
          }
        }
        return null;
      };
      
      // Encontrar o card pai
      const parentCard = findParentCard(cards.value, card.id);
      
      if (parentCard) {
        // Remover o card do pai atual
        const updatedParentCard = {
          ...parentCard,
          subcards: parentCard.subcards?.filter(c => c.id !== card.id),
          updatedAt: new Date().toISOString()
        };
        
        // Atualizar o card pai no backend
        await fetchAPI(`${API_URL}/cards/${parentCard.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedParentCard),
        });
      }
      
      // Adicionar o card ao novo pai
      const updatedTargetCard = {
        ...targetCard,
        subcards: [...(targetCard.subcards || []), card],
        updatedAt: new Date().toISOString()
      };
      
      // Atualizar o card de destino no backend
      await fetchAPI(`${API_URL}/cards/${targetCard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTargetCard),
      });
      
      // Limpar o cache para forçar recarregamento
      cardCache.clear();
    } finally {
      loading.value = false;
    }
  };

  return {
    cards,
    loading,
    error,
    saveCard,
    updateCard,
    deleteCard,
    loadSubcards,
    reorderCards,
    reorderNestedCards,
    cardCache,
    loadInitialCards,
    copyCard,
    moveCard
  }
}