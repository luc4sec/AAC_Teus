<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import CommunicationCard from './components/CommunicationCard.vue';
import LockControl from './components/LockControl.vue';
import CreateCardDialog from './components/CreateCardDialog.vue';
import type { Card } from './types';
import { categories } from './types';
import { useCards } from './composables/useCards';
import { useDragAndDrop } from './composables/useDragAndDrop';

const { 
  cards: mainCards, 
  saveCard, 
  updateCard, 
  deleteCard, 
  loadSubcards, 
  loading,
  reorderCards 
} = useCards();

const { 
  draggedCard,
  isDragging,
  handleDragStart,
  handleDragEnd,
  handleDragOver
} = useDragAndDrop();

const currentCards = ref<Card[]>([]);
const history = ref<Card[][]>([]);
const navigationPath = ref<Card[]>([]);
const isEditing = ref(false);
const showCreateDialog = ref(false);

// Computed para ordenar os cards por posição
const sortedCards = computed(() => {
  // Se não houver cards, retornar array vazio
  if (!currentCards.value.length) {
    return [];
  }
  
  // Verificar se existem cards sem posição definida
  const hasUndefinedPositions = currentCards.value.some(card => card.position === undefined);
  
  // Se todos os cards já tiverem posição, ordenar normalmente
  if (!hasUndefinedPositions) {
    return [...currentCards.value].sort((a, b) => {
      // Usar fallback de 0 caso position seja undefined (não deve acontecer aqui, mas para segurança)
      const posA = a.position !== undefined ? a.position : 0;
      const posB = b.position !== undefined ? b.position : 0;
      return posA - posB;
    });
  }
  
  // Criar uma cópia para não modificar os originais
  const cardsWithPositions = currentCards.value.map((card, index) => {
    // Se o card não tem posição, atribuir o index atual
    if (card.position === undefined) {
      return { ...card, temporaryPosition: index };
    }
    // Senão, manter a posição original, mas adicionar na propriedade temporária
    return { ...card, temporaryPosition: card.position };
  });
  
  // Ordenar por posição temporária
  return cardsWithPositions.sort((a, b) => a.temporaryPosition - b.temporaryPosition);
});

// Atualizar currentCards quando mainCards for carregado
watch(mainCards, (newCards) => {
  if (history.value.length === 0) {
    currentCards.value = newCards;
  }
}, { immediate: true });

const getCurrentCategory = () => {
  if (history.value.length === 0) {
    return categories.actions;
  }
  const parentCards = history.value[history.value.length - 1];
  const parentCard = parentCards.find((c: any) => c.subcards === currentCards.value);
  return parentCard?.category || categories.actions;
};

const handleCardSelect = async (card: Card, isContentClick: boolean) => {
  // Allow navigation if it's not edit mode OR if it's a content click during edit mode
  if ((!isEditing.value || isContentClick) && card.subcards) {
    history.value.push(currentCards.value);
    currentCards.value = card.subcards;
    navigationPath.value.push(card);
  }
};

const handleBack = () => {
  if (history.value.length > 0) {
    currentCards.value = history.value.pop()!;
    navigationPath.value.pop();
  }
};

const handleNavigate = (index: number) => {
  if (index === -1) {
    currentCards.value = mainCards.value;
    history.value = [];
    navigationPath.value = [];
    return;
  }

  const levelsToGoBack = history.value.length - (index + 1);
  
  for (let i = 0; i < levelsToGoBack; i++) {
    history.value.pop();
    navigationPath.value.pop();
  }
  
  if (index === -1) {
    currentCards.value = mainCards.value;
  } else {
    currentCards.value = navigationPath.value[index].subcards || mainCards.value;
  }
};

const handleEditModeChange = (editing: boolean) => {
  isEditing.value = editing;
};

const handleCreateCard = async (newCard: Omit<Card, 'id'>) => {
  const parentId = history.value.length > 0
    ? navigationPath.value[navigationPath.value.length - 1]?.id
    : undefined;

  const createdCard = await saveCard(newCard, parentId);
  
  // Após criar o card, recarregar os cards atuais
  if (history.value.length > 0) {
    // Recarregar subcards do card atual
    const parentCard = navigationPath.value[navigationPath.value.length - 1];
    const subcards = await loadSubcards(parentCard.id);
    currentCards.value = subcards;
  } else {
    // Se estiver no nível raiz, atualizar os cards principais
    currentCards.value = [...currentCards.value, createdCard];
  }

  showCreateDialog.value = false;
};

const handleUpdateCard = async (updatedCard: Card) => {
  await updateCard(updatedCard);
  
  // Após atualizar o card, recarregar os dados
  if (history.value.length > 0) {
    // Recarregar subcards do card atual
    const parentCard = navigationPath.value[navigationPath.value.length - 1];
    const subcards = await loadSubcards(parentCard.id);
    currentCards.value = subcards;
  }
};

const handleDeleteCard = async (cardToDelete: Card) => {
  await deleteCard(cardToDelete.id);
  
  // Após deletar o card, recarregar os dados
  if (history.value.length > 0) {
    // Recarregar subcards do card atual
    const parentCard = navigationPath.value[navigationPath.value.length - 1];
    const subcards = await loadSubcards(parentCard.id);
    currentCards.value = subcards;
  }
};

const handleDrop = async (targetCard: Card, event: DragEvent) => {
  event.preventDefault();
  if (!isEditing.value || !draggedCard.value || draggedCard.value === targetCard) return;

  // Determinar se estamos no nível raiz ou em subcards
  const isRootLevel = history.value.length === 0;
  const cards = isRootLevel ? mainCards.value : currentCards.value;
  
  // Encontrar índices
  const draggedIndex = cards.findIndex(card => card.id === draggedCard.value!.id);
  const targetIndex = cards.findIndex(card => card.id === targetCard.id);
  
  if (draggedIndex !== -1 && targetIndex !== -1) {
    try {
      if (isRootLevel) {
        // Reordenar cards de nível raiz
        await reorderCards(draggedCard.value.id, targetIndex);
      } else {
        // Reordenar subcards
        const parentId = navigationPath.value[navigationPath.value.length - 1]?.id;
        if (parentId) {
          // Aplicar uma reordenação temporária para feedback visual imediato
          const cardToMove = { ...cards[draggedIndex] };
          cards.splice(draggedIndex, 1);
          cards.splice(targetIndex, 0, cardToMove);
          
          // Reordenar no servidor
          const updatedSubcards = await reorderCards(draggedCard.value.id, targetIndex, parentId);
          if (updatedSubcards) {
            currentCards.value = updatedSubcards;
          }
        }
      }
    } catch (error) {
      console.error('Error reordering cards:', error);
      // Em caso de erro, recarregar os dados para garantir consistência
      if (!isRootLevel) {
        const parentCard = navigationPath.value[navigationPath.value.length - 1];
        if (parentCard) {
          const subcards = await loadSubcards(parentCard.id);
          currentCards.value = subcards;
        }
      }
    }
  }
};
</script>

<template>
  <main :class="{ 'editing': isEditing }">
    <div class="navigation-container">
      <div class="navigation-left">
        <button
          v-if="history.length > 0"
          class="back-button"
          @click="handleBack"
          aria-label="Voltar"
        >
          ←
        </button>

        <nav class="breadcrumb" aria-label="Navegação">
          <div class="breadcrumb-container">
            <button 
              class="breadcrumb-item"
              @click="handleNavigate(-1)"
              aria-label="Ir para o início"
            >
              Início
            </button>
            <template v-for="(card, index) in navigationPath" :key="card.id">
              <span class="breadcrumb-separator" aria-hidden="true">›</span>
              <button 
                class="breadcrumb-item"
                @click="handleNavigate(index)"
                :aria-label="`Ir para ${card.title}`"
              >
                {{ card.title }}
              </button>
            </template>
          </div>
        </nav>
      </div>
      
      <LockControl @edit-mode-change="handleEditModeChange" />
    </div>

    <div v-if="loading" class="loading-indicator" role="status" aria-live="polite">
      Carregando...
    </div>

    <div 
      v-else
      class="grid-container"
      role="grid"
      aria-label="Lista de cards"
    >
      <CommunicationCard
        v-for="card in sortedCards"
        :key="card.id"
        :card="card"
        :is-editing="isEditing"
        :draggable="isEditing"
        @select="handleCardSelect"
        @update="handleUpdateCard"
        @delete="handleDeleteCard"
        @dragstart="handleDragStart(card, $event)"
        @dragend="handleDragEnd"
        @dragover="handleDragOver"
        @drop="handleDrop(card, $event)"
      />
      
      <button
        v-if="isEditing"
        class="card add-card"
        @click="showCreateDialog = true"
        aria-label="Adicionar novo item"
      >
        <span class="add-icon" aria-hidden="true">+</span>
        <span class="card-title">Adicionar</span>
      </button>
    </div>

    <CreateCardDialog
      :show="showCreateDialog"
      :current-category="getCurrentCategory()"
      @close="showCreateDialog = false"
      @create="handleCreateCard"
    />
  </main>
</template>

<style>
/* Reset e estilos base */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

html, body {
  height: 100%;
  overflow-x: hidden;
  touch-action: pan-y;
  position: fixed;
  width: 100%;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background: #f5f5f5;
  color: #333;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overscroll-behavior: none;
}

#app {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

main {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-top: 60px; /* Espaço para os controles fixos */
}

/* Permitir rolagem quando não estiver em modo de edição */
main:not(.editing) {
  touch-action: pan-y;
  overscroll-behavior-y: contain;
}

/* Menu de navegação */
.navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #eee;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  height: 60px;
}

.navigation-buttons {
  display: flex;
  gap: 0.5rem;
}

.navigation-buttons button {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: #666;
  transition: color 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.navigation-buttons button:hover {
  color: #000;
}

.navigation-buttons button:focus {
  outline: 2px solid #2196F3;
  outline-offset: 2px;
}

.navigation-buttons button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.navigation-path {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 0 1rem;
  flex: 1;
  margin: 0 1rem;
}

.navigation-path::-webkit-scrollbar {
  display: none;
}

.navigation-path-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
  color: #666;
}

.navigation-path-item:not(:last-child)::after {
  content: '›';
  color: #999;
}

.navigation-path-item.active {
  color: #000;
  font-weight: 500;
}

/* Conteúdo principal */
.main-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.navigation-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #f5f5f5;
  z-index: 999;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.navigation-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.grid-container {
  margin-top: 70px; /* Altura da barra de navegação */
  padding: 1rem;
}

.back-button {
  position: static;
  background: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 200ms ease;
  flex-shrink: 0;
  font-size: 1.2rem;
}

.back-button:hover {
  transform: scale(1.1);
}

.back-button:focus {
  outline: 2px solid #2196F3;
  outline-offset: 2px;
}

.breadcrumb {
  flex: 1;
}

.breadcrumb-container {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 100px;
  padding: 0.5rem 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
  max-width: 100%;
}

.breadcrumb-item {
  background: none;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 100px;
  color: #2196F3;
  font-weight: 500;
  cursor: pointer;
  transition: all 200ms ease;
}

.breadcrumb-item:hover {
  background-color: #e3f2fd;
  transform: translateY(-1px);
}

.breadcrumb-item:focus {
  outline: 2px solid #2196F3;
  outline-offset: 2px;
}

.breadcrumb-separator {
  color: #666;
  font-weight: 300;
  user-select: none;
}

.breadcrumb-container::-webkit-scrollbar {
  display: none;
}

.breadcrumb-container {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Drag and Drop styles */
.dragging {
  opacity: 0.5;
  transform: scale(0.95);
  transition: transform 0.2s ease, opacity 0.2s ease;
}

/* Card move transition */
.card-move {
  transition: none;
}

.card-move-enter-active,
.card-move-leave-active {
  transition: none;
}

.card-move-enter-from,
.card-move-leave-to {
  opacity: 1;
  transform: none;
}

.loading-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 1.5rem;
  color: #666;
}

/* Responsive styles */
@media (max-width: 768px) {
  .navigation-container {
    padding: 0.5rem;
  }

  .navigation-left {
    gap: 0.3rem;
  }

  .back-button {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }

  .breadcrumb-container {
    padding: 0.25rem 0.5rem;
  }

  .breadcrumb-item {
    padding: 0.15rem 0.3rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .navigation-container {
    padding: 0.4rem;
  }
  
  .back-button {
    width: 28px;
    height: 28px;
  }
  
  .breadcrumb-container {
    padding: 0.15rem 0.3rem;
  }
  
  .breadcrumb-item {
    font-size: 0.8rem;
  }
}
</style>