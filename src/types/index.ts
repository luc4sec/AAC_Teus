export interface Card {
  id: string;
  title: string;
  icon: string;
  category: Category;
  subcards?: Card[];
  backgroundColor?: string;
  textColor?: string;
  iconColor?: string;
  position?: number;
}

export interface Category {
  name: string;
  color: string;
}

export const categories = {
  actions: { name: 'Ações Básicas', color: '#2196F3' },
  people: { name: 'Pessoas', color: '#4CAF50' },
  feelings: { name: 'Sentimentos', color: '#FFC107' },
  needs: { name: 'Necessidades', color: '#F44336' },
  places: { name: 'Lugares', color: '#9C27B0' },
  food: { name: 'Comidas/Bebidas', color: '#FF9800' }
} as const;