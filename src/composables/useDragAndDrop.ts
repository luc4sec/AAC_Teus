import { ref } from 'vue'
import type { Card } from '../types'

export function useDragAndDrop() {
  const draggedCard = ref<Card | null>(null)
  const isDragging = ref(false)

  const handleDragStart = (card: Card, event: DragEvent) => {
    draggedCard.value = card
    isDragging.value = true
    
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      const element = event.target as HTMLElement
      element.classList.add('dragging')
    }
  }

  const handleDragEnd = (event: DragEvent) => {
    draggedCard.value = null
    isDragging.value = false
    
    const element = event.target as HTMLElement
    element.classList.remove('dragging')
  }

  const handleDragOver = (event: DragEvent) => {
    if (!isDragging.value) return
    event.preventDefault()
    event.dataTransfer!.dropEffect = 'move'
  }

  return {
    draggedCard,
    isDragging,
    handleDragStart,
    handleDragEnd,
    handleDragOver
  }
} 