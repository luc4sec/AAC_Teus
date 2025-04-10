<script setup lang="ts">
import { ref } from 'vue';
import { useSpeech } from '../composables/useSpeech';

const emit = defineEmits<{
  (e: 'editModeChange', isEditing: boolean): void;
}>();

const showPasswordDialog = ref(false);
const showSettingsDialog = ref(false);
const password = ref('');
const isEditing = ref(false);
const errorMessage = ref('');

const { speechRate, setSpeechRate } = useSpeech();

const ADMIN_PASSWORD = '123456'; // In a real app, this should be stored securely

const toggleLock = () => {
  if (isEditing.value) {
    isEditing.value = false;
    emit('editModeChange', false);
  } else {
    showPasswordDialog.value = true;
  }
};

const handlePasswordSubmit = () => {
  if (password.value === ADMIN_PASSWORD) {
    isEditing.value = true;
    showPasswordDialog.value = false;
    password.value = '';
    errorMessage.value = '';
    emit('editModeChange', true);
  } else {
    errorMessage.value = 'Senha incorreta';
    password.value = '';
  }
};

const handleSpeedChange = (event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  setSpeechRate(parseFloat(value));
};
</script>

<template>
  <div class="lock-control">
    <button
      class="control-button settings-button"
      @click="showSettingsDialog = true"
      aria-label="Configurações"
    >
      <img
        src="https://api.iconify.design/material-symbols:settings.svg"
        alt="Configurações"
        width="24"
        height="24"
      />
    </button>

    <button
      class="control-button lock-button"
      @click="toggleLock"
      :aria-label="isEditing ? 'Desativar edição' : 'Ativar edição'"
    >
      <img
        :src="isEditing 
          ? 'https://api.iconify.design/material-symbols:lock-open.svg'
          : 'https://api.iconify.design/material-symbols:lock.svg'"
        :alt="isEditing ? 'Cadeado aberto' : 'Cadeado fechado'"
        width="24"
        height="24"
      />
    </button>

    <!-- Settings Dialog -->
    <div v-if="showSettingsDialog" class="dialog-overlay">
      <div class="dialog-content">
        <h2>Configurações</h2>
        <div class="form-group">
          <label for="speechRate">Velocidade da Fala:</label>
          <div class="speed-control">
            <input
              type="range"
              id="speechRate"
              min="0.5"
              max="2"
              step="0.1"
              :value="speechRate"
              @input="handleSpeedChange"
            />
            <span class="speed-value">{{ speechRate.toFixed(1) }}x</span>
          </div>
        </div>
        <div class="dialog-buttons">
          <button @click="showSettingsDialog = false" class="submit-button">Fechar</button>
        </div>
      </div>
    </div>

    <!-- Password Dialog -->
    <div v-if="showPasswordDialog" class="dialog-overlay">
      <div class="dialog-content">
        <h2>Digite a senha</h2>
        <input
          type="password"
          v-model="password"
          maxlength="6"
          pattern="[0-9]*"
          inputmode="numeric"
          placeholder="Digite 6 dígitos"
          @keyup.enter="handlePasswordSubmit"
        />
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        <div class="dialog-buttons">
          <button @click="showPasswordDialog = false">Cancelar</button>
          <button @click="handlePasswordSubmit" class="submit-button">Confirmar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lock-control {
  display: flex;
  gap: 0.75rem;
}

.control-button {
  background: white;
  border: none;
  border-radius: 8px;
  width: 48px;
  height: 48px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 300ms ease;
}

.control-button:hover {
  background-color: #f5f5f5;
}

.control-button:focus {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}

.settings-button {
  background-color: white;
}

.settings-button img {
  filter: invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(96%) contrast(101%);
}

.lock-button {
  background-color: white;
}

.lock-button img {
  filter: invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(96%) contrast(101%);
}

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
}

.dialog-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 400px;
}

.dialog-content h2 {
  margin: 0 0 1rem;
  text-align: center;
}

.dialog-content input {
  width: 100%;
  padding: 0.75rem;
  font-size: 1.25rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  margin-bottom: 1rem;
  text-align: center;
  letter-spacing: 0.25em;
}

.dialog-buttons {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.dialog-buttons button {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}

.submit-button {
  background: #2196F3;
  color: white;
}

.error-message {
  color: #F44336;
  margin: 0.5rem 0;
  text-align: center;
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.speed-control input[type="range"] {
  flex: 1;
}

.speed-value {
  min-width: 3em;
  text-align: right;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

@media (max-width: 480px) {
  .control-button {
    width: 36px;
    height: 36px;
  }
  
  .control-button img {
    width: 20px;
    height: 20px;
  }
}
</style>