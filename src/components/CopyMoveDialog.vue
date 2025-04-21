<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Card } from '../types';

const props = defineProps<{
  show: boolean;
  card: Card;
  currentCards: Card[];
  history: Card[][];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'copy', card: Card, targetCard: Card): void;
}>();

const selectedCard = ref<Card | null>(null);

const availableCards = computed(() => {
  // Combina os cards do nível atual com os cards dos níveis anteriores e posteriores
  const allCards = [...props.currentCards];
  
  // Adiciona os cards dos níveis anteriores
  props.history.forEach(levelCards => {
    levelCards.forEach(card => {
      if (!allCards.some(c => c.id === card.id)) {
        allCards.push(card);
      }
    });
  });

  // Adiciona os cards dos níveis posteriores (subcards)
  const addSubcards = (cards: Card[]) => {
    cards.forEach(card => {
      if (card.subcards) {
        card.subcards.forEach(subcard => {
          if (!allCards.some(c => c.id === subcard.id)) {
            allCards.push(subcard);
            // Recursivamente adiciona subcards dos subcards
            if (subcard.subcards) {
              addSubcards(subcard.subcards);
            }
          }
        });
      }
    });
  };

  // Adiciona subcards do nível atual
  addSubcards(props.currentCards);
  // Adiciona subcards dos níveis anteriores
  props.history.forEach(levelCards => {
    addSubcards(levelCards);
  });

  // Filtra os cards que podem ser destinos (exclui o próprio card e seus subcards)
  return allCards.filter(card => {
    // Não pode ser o próprio card
    if (card.id === props.card.id) return false;
    
    // Não pode ser um subcard do card atual
    const isSubcard = (parent: Card, target: Card): boolean => {
      if (!parent.subcards) return false;
      if (parent.subcards.some(c => c.id === target.id)) return true;
      return parent.subcards.some(c => isSubcard(c, target));
    };
    
    return !isSubcard(props.card, card);
  });
});

const getCardLevel = (card: Card) => {
  // Verifica se o card está no nível atual
  if (props.currentCards.some(c => c.id === card.id)) {
    return 'Nível atual';
  }
  
  // Verifica se é um subcard do nível atual
  const isSubcardOfCurrent = props.currentCards.some(c => {
    const isSubcard = (parent: Card, target: Card): boolean => {
      if (!parent.subcards) return false;
      if (parent.subcards.some(c => c.id === target.id)) return true;
      return parent.subcards.some(c => isSubcard(c, target));
    };
    return isSubcard(c, card);
  });

  if (isSubcardOfCurrent) {
    // Conta quantos níveis abaixo está
    let levelsBelow = 0;
    const findLevelsBelow = (cards: Card[], targetId: string, currentLevel: number): number => {
      for (const card of cards) {
        if (card.id === targetId) return currentLevel;
        if (card.subcards) {
          const found = findLevelsBelow(card.subcards, targetId, currentLevel + 1);
          if (found !== -1) return found;
        }
      }
      return -1;
    };
    levelsBelow = findLevelsBelow(props.currentCards, card.id, 1);
    return `Nível +${levelsBelow}`;
  }

  // Verifica se está em um nível anterior
  for (let i = 0; i < props.history.length; i++) {
    if (props.history[i].some(c => c.id === card.id)) {
      return `Nível -${i + 1}`;
    }
    // Verifica se é um subcard de um nível anterior
    const isSubcardOfHistory = props.history[i].some(c => {
      const isSubcard = (parent: Card, target: Card): boolean => {
        if (!parent.subcards) return false;
        if (parent.subcards.some(c => c.id === target.id)) return true;
        return parent.subcards.some(c => isSubcard(c, target));
      };
      return isSubcard(c, card);
    });
    if (isSubcardOfHistory) {
      // Conta quantos níveis abaixo está do nível anterior
      let levelsBelow = 0;
      const findLevelsBelow = (cards: Card[], targetId: string, currentLevel: number): number => {
        for (const card of cards) {
          if (card.id === targetId) return currentLevel;
          if (card.subcards) {
            const found = findLevelsBelow(card.subcards, targetId, currentLevel + 1);
            if (found !== -1) return found;
          }
        }
        return -1;
      };
      levelsBelow = findLevelsBelow(props.history[i], card.id, 1);
      return `Nível -${i + 1}+${levelsBelow}`;
    }
  }
  
  return 'Nível raiz';
};

const handleSubmit = () => {
  if (!selectedCard.value) return;
  
  emit('copy', props.card, selectedCard.value);
  emit('close');
};
</script>

<template>
  <div 
    v-if="show" 
    class="dialog-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="dialog-title"
  >
    <div class="dialog-content">
      <div class="dialog-header">
        <h2 id="dialog-title">
          Copiar Item
        </h2>
        <button 
          class="close-button" 
          @click="emit('close')" 
          aria-label="Fechar"
        >
          ×
        </button>
      </div>
      
      <div class="dialog-body">
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label>Selecione o destino:</label>
            <div class="card-list">
              <button
                v-for="card in availableCards"
                :key="card.id"
                class="card-item"
                :class="{ selected: selectedCard?.id === card.id }"
                @click="selectedCard = card"
                type="button"
              >
                <img
                  :src="card.icon"
                  :alt="card.title"
                  class="card-icon"
                />
                <span class="card-title">{{ card.title }}</span>
                <span class="card-level">{{ getCardLevel(card) }}</span>
              </button>
            </div>
          </div>

          <div class="dialog-buttons">
            <button 
              type="button" 
              @click="emit('close')"
              class="cancel-button"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              class="submit-button"
              :disabled="!selectedCard"
            >
              Copiar
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 400px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  margin: 1rem;
  overflow: hidden;
}

.dialog-header {
  padding: 1rem;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dialog-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.dialog-body {
  padding: 1rem;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.card-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-item:hover {
  border-color: #2196F3;
  background-color: #f5f5f5;
}

.card-item.selected {
  border-color: #2196F3;
  background-color: #e3f2fd;
}

.card-icon {
  width: 40px;
  height: 40px;
  margin-bottom: 0.5rem;
}

.card-title {
  font-size: 0.9rem;
  text-align: center;
  word-break: break-word;
}

.card-level {
  font-size: 0.7rem;
  color: #666;
  margin-top: 0.25rem;
  text-align: center;
}

.dialog-buttons {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.dialog-buttons button {
  padding: 0.75rem 1.25rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  min-width: 80px;
}

.cancel-button {
  background: #f5f5f5;
  color: #333;
}

.cancel-button:hover {
  background: #e0e0e0;
}

.submit-button {
  background: #2196F3;
  color: white;
}

.submit-button:hover {
  background: #1976D2;
}

.submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 