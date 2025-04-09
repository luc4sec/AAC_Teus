<script setup lang="ts">
import type { Card } from '../types';

defineProps<{
  show: boolean;
  card: Card;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();
</script>

<template>
  <div v-if="show" class="dialog-overlay">
    <div class="dialog-content">
      <h2>Confirmar Exclusão</h2>
      <p>Tem certeza que deseja excluir "{{ card.title }}"?</p>
      <div class="dialog-buttons">
        <button @click="emit('close')">Cancelar</button>
        <button @click="emit('confirm')" class="delete-button">Excluir</button>
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
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 400px;
  text-align: center;
}

.dialog-content h2 {
  margin: 0 0 1rem;
}

.dialog-content p {
  margin: 0 0 1.5rem;
}

.dialog-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.dialog-buttons button {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}

.delete-button {
  background: #F44336;
  color: white;
}

button:hover {
  opacity: 0.9;
}
</style>