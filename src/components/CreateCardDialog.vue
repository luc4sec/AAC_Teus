<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Card, Category } from '../types';

const props = defineProps<{
  show: boolean;
  currentCategory: Category;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'create', card: Omit<Card, 'id'>): void;
}>();

const title = ref('');
const icon = ref('');
const isGroup = ref(false);
const backgroundColor = ref('');
const textColor = ref('');
const iconColor = ref('');
const titleInput = ref<HTMLInputElement | null>(null);

const defaultBackgroundColor = computed(() => props.currentCategory.color);

// Focus title input when dialog opens
watch(() => props.show, (newValue) => {
  if (newValue) {
    setTimeout(() => {
      titleInput.value?.focus();
    }, 100);
  }
});

const handleSubmit = () => {
  if (!title.value || !icon.value) {
    return;
  }

  emit('create', {
    title: title.value,
    icon: icon.value,
    category: props.currentCategory,
    subcards: isGroup.value ? [] : undefined,
    backgroundColor: backgroundColor.value || undefined,
    textColor: textColor.value || undefined,
    iconColor: iconColor.value || undefined,
  });

  // Reset form
  title.value = '';
  icon.value = '';
  isGroup.value = false;
  backgroundColor.value = '';
  textColor.value = '';
  iconColor.value = '';
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    emit('close');
  }
};
</script>

<template>
  <div 
    v-if="show" 
    class="dialog-overlay"
    @keydown="handleKeyDown"
    role="dialog"
    aria-modal="true"
    aria-labelledby="dialog-title"
  >
    <div class="dialog-content">
      <div class="dialog-header">
        <h2 id="dialog-title">Criar Novo Item</h2>
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
            <label for="title">Título:</label>
            <input
              ref="titleInput"
              id="title"
              v-model="title"
              type="text"
              required
              placeholder="Digite o título"
              aria-required="true"
            />
          </div>

          <div class="form-group">
            <label for="icon">URL do Ícone:</label>
            <input
              id="icon"
              v-model="icon"
              type="url"
              required
              placeholder="https://api.iconify.design/..."
              aria-required="true"
            />
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="isGroup"
                aria-label="É um grupo?"
              />
              É um grupo?
            </label>
          </div>

          <div class="color-customization">
            <h3>Personalização de Cores</h3>
            
            <div class="form-group">
              <label for="backgroundColor">Cor de Fundo:</label>
              <div class="color-input-wrapper">
                <input
                  id="backgroundColor"
                  v-model="backgroundColor"
                  type="color"
                  class="color-picker"
                  aria-label="Selecione a cor de fundo"
                />
                <input
                  type="text"
                  v-model="backgroundColor"
                  :placeholder="defaultBackgroundColor"
                  class="color-text"
                  aria-label="Digite o código da cor de fundo"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="textColor">Cor do Texto:</label>
              <div class="color-input-wrapper">
                <input
                  id="textColor"
                  v-model="textColor"
                  type="color"
                  class="color-picker"
                  aria-label="Selecione a cor do texto"
                />
                <input
                  type="text"
                  v-model="textColor"
                  placeholder="#000000"
                  class="color-text"
                  aria-label="Digite o código da cor do texto"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="iconColor">Cor do Ícone:</label>
              <div class="color-input-wrapper">
                <input
                  id="iconColor"
                  v-model="iconColor"
                  type="color"
                  class="color-picker"
                  aria-label="Selecione a cor do ícone"
                />
                <input
                  type="text"
                  v-model="iconColor"
                  placeholder="#000000"
                  class="color-text"
                  aria-label="Digite o código da cor do ícone"
                />
              </div>
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
              :disabled="!title || !icon"
            >
              Criar
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
  /* Safari fix for full height */
  min-height: -webkit-fill-available;
  height: 100vh;
}

.dialog-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 400px;
  max-height: 90vh;
  /* Safari fixes */
  max-height: -webkit-fill-available;
  display: flex;
  flex-direction: column;
  margin: 1rem;
  overflow: hidden; /* Prevent content overflow */
}

.dialog-header {
  padding: 1rem;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  border-radius: 12px 12px 0 0;
  position: relative;
  z-index: 1;
}

.dialog-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  line-height: 1;
  color: #666;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.2s ease;
}

.close-button:hover {
  color: #000;
}

.close-button:focus {
  outline: 2px solid #2196F3;
  outline-offset: 2px;
}

.dialog-body {
  padding: 1rem;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  flex: 1;
  /* Safari fixes */
  position: relative;
  height: 100%;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input[type="text"],
.form-group input[type="url"] {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 16px; /* Safari minimum font size for inputs */
  box-sizing: border-box;
  transition: border-color 0.2s ease;
}

.form-group input[type="text"]:focus,
.form-group input[type="url"]:focus {
  border-color: #2196F3;
  outline: none;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.dialog-buttons {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
  padding: 1rem;
  border-top: 1px solid #eee;
  background: white;
  position: relative;
  z-index: 1;
}

.dialog-buttons button {
  padding: 0.75rem 1.25rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  min-width: 80px;
  -webkit-tap-highlight-color: transparent;
  -webkit-appearance: none; /* Remove Safari default styles */
  appearance: none;
  transition: opacity 0.2s ease, background-color 0.2s ease;
}

.dialog-buttons button:focus {
  outline: 2px solid #2196F3;
  outline-offset: 2px;
}

.dialog-buttons button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.color-customization {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #ddd;
}

.color-customization h3 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
}

.color-input-wrapper {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.color-picker {
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.color-text {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  -webkit-appearance: none;
  appearance: none;
  transition: border-color 0.2s ease;
}

.color-text:focus {
  border-color: #2196F3;
  outline: none;
}

/* Mobile Safari specific fixes */
@supports (-webkit-touch-callout: none) {
  .dialog-overlay {
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  }
  
  .dialog-content {
    max-height: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 2rem);
  }
}

/* Mobile-specific styles */
@media (max-width: 768px) {
  .dialog-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .dialog-content {
    width: 100%;
    max-width: 100%;
    margin: 0;
    border-radius: 20px 20px 0 0;
    max-height: 85vh;
  }

  .dialog-header {
    padding: 1.25rem;
  }

  .dialog-body {
    padding: 1.25rem;
  }

  .form-group input[type="text"],
  .form-group input[type="url"],
  .color-text {
    font-size: 16px;
    padding: 0.875rem;
  }

  .dialog-buttons {
    padding: 1.25rem;
    margin-top: 0;
  }

  .dialog-buttons button {
    flex: 1;
    padding: 1rem;
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .dialog-header {
    padding: 1rem;
  }

  .dialog-body {
    padding: 1rem;
  }

  .form-group input[type="text"],
  .form-group input[type="url"],
  .color-text {
    padding: 0.75rem;
  }

  .dialog-buttons {
    padding: 1rem;
  }

  .dialog-buttons button {
    padding: 0.875rem;
  }
}
</style>