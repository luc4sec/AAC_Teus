<script setup lang="ts">
import { ref, computed } from 'vue';
import EditCardDialog from './EditCardDialog.vue';
import DeleteConfirmDialog from './DeleteConfirmDialog.vue';
import { useSpeech } from '../composables/useSpeech';
import type { Card } from '../types';

const props = defineProps<{
  card: Card;
  isEditing: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', card: Card, isContentClick: boolean): void;
  (e: 'update', card: Card): void;
  (e: 'delete', card: Card): void;
  (e: 'dragstart', event: DragEvent): void;
  (e: 'dragend', event: DragEvent): void;
  (e: 'dragover', event: DragEvent): void;
  (e: 'drop', event: DragEvent): void;
}>();

const showEditDialog = ref(false);
const showDeleteDialog = ref(false);
const isDragging = ref(false);
const touchStartX = ref(0);
const touchStartY = ref(0);
const { speak } = useSpeech();

const cardStyle = computed(() => ({
  backgroundColor: props.card.backgroundColor || props.card.category.color,
  outline: props.isEditing ? '3px dashed #000' : 'none',
  cursor: props.isEditing ? 'grab' : 'pointer',
  opacity: isDragging.value ? '0.5' : '1',
  transform: isDragging.value ? 'scale(0.95)' : 'none',
  transition: 'transform 0.2s ease, opacity 0.2s ease'
}));

const textStyle = computed(() => ({
  color: props.card.textColor || '#000000',
}));

const iconStyle = computed(() => ({
  filter: props.card.iconColor ? `drop-shadow(0 0 0 ${props.card.iconColor})` : 'none',
}));

const handleClick = (event: MouseEvent) => {
  const isContentClick = (event.target as HTMLElement).closest('.card-content') !== null;
  
  if (props.card.subcards) {
    emit('select', props.card, isContentClick);
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }
  if (!props.isEditing || isContentClick) {
    speak(props.card.title);
  }
};

const handleEdit = (event: Event) => {
  event.stopPropagation();
  showEditDialog.value = true;
};

const handleDelete = (event: Event) => {
  event.stopPropagation();
  showDeleteDialog.value = true;
};

const handleConfirmDelete = () => {
  emit('delete', props.card);
  showDeleteDialog.value = false;
};

const handleUpdate = (updatedCard: Card) => {
  emit('update', updatedCard);
  showEditDialog.value = false;
};

// Touch event handlers
const handleTouchStart = (event: TouchEvent) => {
  if (!props.isEditing) return;
  
  const touch = event.touches[0];
  touchStartX.value = touch.clientX;
  touchStartY.value = touch.clientY;
  
  // Start drag after a short delay to distinguish from scrolling
  setTimeout(() => {
    if (!props.isEditing) return; // Verificar novamente, pois o estado pode ter mudado
    
    if (Math.abs(touch.clientX - touchStartX.value) < 5 && 
        Math.abs(touch.clientY - touchStartY.value) < 5) {
      isDragging.value = true;
      emit('dragstart', new DragEvent('dragstart'));
    }
  }, 200);
};

const handleTouchMove = (event: TouchEvent) => {
  if (!props.isEditing || !isDragging.value) return;
  
  // Só prevenir o comportamento padrão se estivermos arrastando no modo de edição
  event.preventDefault();
  
  const touch = event.touches[0];
  const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
  
  if (elementUnderTouch?.closest('.card-wrapper')) {
    const dropTarget = elementUnderTouch.closest('.card-wrapper');
    const dragOverEvent = new DragEvent('dragover', { bubbles: true });
    dropTarget?.dispatchEvent(dragOverEvent);
  }
};

const handleTouchEnd = (event: TouchEvent) => {
  if (!props.isEditing || !isDragging.value) return;
  
  const touch = event.changedTouches[0];
  const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
  
  if (elementUnderTouch?.closest('.card-wrapper')) {
    const dropTarget = elementUnderTouch.closest('.card-wrapper');
    const dropEvent = new DragEvent('drop', { bubbles: true });
    dropTarget?.dispatchEvent(dropEvent);
  }
  
  isDragging.value = false;
  emit('dragend', new DragEvent('dragend'));
};

// Keyboard navigation
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handleClick(event as unknown as MouseEvent);
  }
};
</script>

<template>
  <div 
    class="card-wrapper"
    :draggable="isEditing"
    @dragstart="$emit('dragstart', $event)"
    @dragend="$emit('dragend', $event)"
    @dragover="$emit('dragover', $event)"
    @drop="$emit('drop', $event)"
    v-on="isEditing ? {
      touchstart: handleTouchStart,
      touchmove: handleTouchMove,
      touchend: handleTouchEnd
    } : {}"
    role="listitem"
  >
    <button
      class="card"
      :style="cardStyle"
      @click="handleClick"
      @keydown="handleKeyDown"
      :aria-label="card.title"
      :aria-expanded="!!card.subcards"
      :aria-haspopup="!!card.subcards"
    >
      <div class="card-content">
        <img
          :src="card.icon"
          :alt="card.title"
          class="card-icon"
          :style="iconStyle"
          loading="lazy"
          width="48"
          height="48"
        />
        <h2 class="card-title" :style="textStyle">{{ card.title }}</h2>
      </div>
    </button>

    <div v-if="isEditing" class="edit-controls">
      <button
        class="control-button edit-button"
        @click="handleEdit"
        aria-label="Editar item"
      >
        <img
          src="https://api.iconify.design/material-symbols:edit.svg"
          alt="Editar"
          width="16"
          height="16"
          aria-hidden="true"
        />
      </button>
      <button
        class="control-button delete-button"
        @click="handleDelete"
        aria-label="Excluir item"
      >
        <img
          src="https://api.iconify.design/material-symbols:delete.svg"
          alt="Excluir"
          width="16"
          height="16"
          aria-hidden="true"
        />
      </button>
    </div>

    <EditCardDialog
      :show="showEditDialog"
      :card="card"
      @close="showEditDialog = false"
      @update="handleUpdate"
    />

    <DeleteConfirmDialog
      :show="showDeleteDialog"
      :card="card"
      @close="showDeleteDialog = false"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>

<style scoped>
.card-wrapper {
  position: relative;
  aspect-ratio: 1;
  width: 100%;
  touch-action: auto;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.card-wrapper[draggable="true"] {
  touch-action: none;
}

.card {
  width: 100%;
  height: 100%;
  padding: 0.75rem;
  box-sizing: border-box;
  transition: transform 0.2s ease, opacity 0.2s ease;
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card:focus {
  outline: 2px solid #2196F3;
  outline-offset: 2px;
}

.card-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.card-icon {
  width: 60%;
  height: auto;
  margin-bottom: 0.5rem;
  pointer-events: none;
  -webkit-user-drag: none;
  max-width: 48px;
  max-height: 48px;
}

.card-title {
  font-size: 1rem;
  font-weight: 500;
  text-align: center;
  margin: 0;
  word-break: break-word;
  hyphens: auto;
}

.edit-controls {
  position: absolute;
  top: -8px;
  right: -8px;
  display: flex;
  gap: 4px;
  z-index: 1;
}

.control-button {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: transform 200ms ease, background-color 200ms ease;
}

.control-button:focus {
  outline: 2px solid #2196F3;
  outline-offset: 2px;
}

.control-button:hover {
  transform: scale(1.1);
}

.edit-button {
  background: #FFC107;
  color: black;
}

.edit-button:hover {
  background: #FFA000;
}

.delete-button {
  background: #F44336;
  color: white;
}

.delete-button:hover {
  background: #D32F2F;
}

@media (max-width: 768px) {
  .card {
    padding: 0.5rem;
  }

  .card-icon {
    width: 50%;
    max-width: 40px;
    max-height: 40px;
  }

  .card-title {
    font-size: 0.9rem;
  }

  .control-button {
    width: 32px;
    height: 32px;
  }

  .control-button img {
    width: 20px;
    height: 20px;
  }

  .edit-controls {
    top: -10px;
    right: -10px;
    gap: 6px;
  }
}

@media (max-width: 480px) {
  .card {
    padding: 0.4rem;
  }

  .card-icon {
    width: 45%;
    max-width: 32px;
    max-height: 32px;
  }

  .card-title {
    font-size: 0.8rem;
  }
}

/* Change cursor to grabbing when dragging */
.card-wrapper:active {
  cursor: grabbing;
}

/* Prevent text selection during drag */
.card-wrapper * {
  -webkit-user-select: none;
  user-select: none;
}
</style>