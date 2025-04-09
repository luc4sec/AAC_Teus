import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
const dbName = 'teus_app';
const collectionName = 'cards';

async function connectToMongo() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    // Verifique se já existem cards, caso contrário crie os padrões
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const cardsCount = await collection.countDocuments();
    
    if (cardsCount === 0) {
      console.log('Criando cards padrão...');
      await createDefaultCards(collection);
    }
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

// Criar cards padrão se o banco estiver vazio
async function createDefaultCards(collection) {
  const defaultCards = [
    {
      id: 'acoes-basicas',
      title: 'acoes-basicas',
      icon: 'https://api.iconify.design/material-symbols:directions-run.svg',
      category: { name: 'Ações Básicas', color: '#2196F3' },
      subcards: [
        {
          id: 'andar',
          title: 'andar',
          icon: 'https://api.iconify.design/material-symbols:directions-walk.svg',
          category: { name: 'Ações Básicas', color: '#2196F3' }
        },
        {
          id: 'comer',
          title: 'comer',
          icon: 'https://api.iconify.design/material-symbols:restaurant.svg',
          category: { name: 'Ações Básicas', color: '#2196F3' }
        },
        {
          id: 'beber',
          title: 'beber',
          icon: 'https://api.iconify.design/material-symbols:local-drink.svg',
          category: { name: 'Ações Básicas', color: '#2196F3' },
          subcards: [
            {
              id: 'agua',
              title: 'agua',
              icon: 'https://api.iconify.design/material-symbols:directions-walk.svg',
              category: { name: 'Ações Básicas', color: '#2196F3' }
            },
            {
              id: 'suco',
              title: 'suco',
              icon: 'https://api.iconify.design/material-symbols:restaurant.svg',
              category: { name: 'Ações Básicas', color: '#2196F3' }
            },
            {
              id: 'refrigerante',
              title: 'refrigerante',
              icon: 'https://api.iconify.design/material-symbols:local-drink.svg',
              category: { name: 'Ações Básicas', color: '#2196F3' }
            }
          ]
        }
      ]
    },
    {
      id: 'sentimentos',
      title: 'sentimentos',
      icon: 'https://api.iconify.design/material-symbols:mood.svg',
      category: { name: 'Sentimentos', color: '#FFC107' },
      subcards: [
        {
          id: 'feliz',
          title: 'feliz',
          icon: 'https://api.iconify.design/material-symbols:sentiment-very-satisfied.svg',
          category: { name: 'Sentimentos', color: '#FFC107' }
        },
        {
          id: 'triste',
          title: 'triste',
          icon: 'https://api.iconify.design/material-symbols:sentiment-very-dissatisfied.svg',
          category: { name: 'Sentimentos', color: '#FFC107' }
        }
      ]
    }
  ];
  
  try {
    await collection.insertMany(defaultCards);
    console.log('Cards padrão criados com sucesso');
  } catch (error) {
    console.error('Erro ao criar cards padrão:', error);
  }
}

connectToMongo();

// Helper function
const removeAccents = (str) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const createId = (title) => {
  return removeAccents(title.toLowerCase()).replace(/\s+/g, '-');
};

// Função auxiliar para encontrar um card recursivamente
const findCardRecursively = (cardId, cardList) => {
  for (const card of cardList) {
    if (card.id === cardId) {
      return { card, parent: null };
    }
    
    if (card.subcards && card.subcards.length > 0) {
      for (const subcard of card.subcards) {
        if (subcard.id === cardId) {
          return { card: subcard, parent: card };
        }
        
        if (subcard.subcards && subcard.subcards.length > 0) {
          const result = findCardRecursively(cardId, subcard.subcards);
          if (result.card) {
            return result;
          }
        }
      }
    }
  }
  
  return { card: null, parent: null };
};

// Função auxiliar para excluir um card recursivamente
const deleteCardRecursively = (cardId, cardList) => {
  for (let i = 0; i < cardList.length; i++) {
    if (cardList[i].id === cardId) {
      cardList.splice(i, 1);
      return true;
    }
    
    if (cardList[i].subcards && cardList[i].subcards.length > 0) {
      if (deleteCardRecursively(cardId, cardList[i].subcards)) {
        return true;
      }
    }
  }
  
  return false;
};

// Routes
app.get('/api/cards', async (req, res) => {
  try {
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    // Verificar se algum card não tem posição
    const cards = await collection.find({}).toArray();
    let hasUpdatedPositions = false;
    
    // Se algum card não tiver posição, adicionar posição a todos
    if (cards.some(card => card.position === undefined)) {
      console.log('Adicionando posições aos cards...');
      
      for (let i = 0; i < cards.length; i++) {
        await collection.updateOne(
          { id: cards[i].id },
          { $set: { position: i } }
        );
      }
      
      hasUpdatedPositions = true;
    }
    
    // Buscar cards ordenados por posição
    const orderedCards = hasUpdatedPositions 
      ? await collection.find({}).sort({ position: 1 }).toArray()
      : cards.sort((a, b) => (a.position || 0) - (b.position || 0));
    
    console.log('Retornando cards ordenados por posição:', orderedCards.map(c => ({ id: c.id, position: c.position })));
    res.json(orderedCards);
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

app.post('/api/cards', async (req, res) => {
  try {
    const newCard = req.body;
    newCard.id = createId(newCard.title);
    
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    // Obter todos os cards para definir a posição correta do novo card
    const allCards = await collection.find({}).toArray();
    // Definir a posição como o próximo número depois do último card
    newCard.position = allCards.length;
    
    await collection.insertOne(newCard);
    res.status(201).json(newCard);
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

app.post('/api/cards/:parentId/subcards', async (req, res) => {
  try {
    const { parentId } = req.params;
    const newCard = req.body;
    newCard.id = createId(newCard.title);
    
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    // Verificar se o parentId é de um card principal
    const parentCard = await collection.findOne({ id: parentId });
    
    if (parentCard) {
      // É um card de nível superior
      if (!parentCard.subcards) {
        parentCard.subcards = [];
      }
      
      // Definir a posição como o próximo número depois do último subcard
      newCard.position = parentCard.subcards.length;
      
      parentCard.subcards.push(newCard);
      
      await collection.updateOne(
        { id: parentId },
        { $set: { subcards: parentCard.subcards } }
      );
      
      res.status(201).json(newCard);
    } else {
      // É um subcard aninhado, precisamos encontrá-lo
      const allCards = await collection.find({}).toArray();
      let found = false;
      
      // Procurar em todos os cards
      for (const card of allCards) {
        if (card.subcards && card.subcards.length > 0) {
          // Função para procurar e atualizar recursivamente
          const updateSubcards = (subcards, targetId) => {
            for (let i = 0; i < subcards.length; i++) {
              if (subcards[i].id === targetId) {
                if (!subcards[i].subcards) {
                  subcards[i].subcards = [];
                }
                
                // Definir a posição como o próximo número depois do último subcard
                newCard.position = subcards[i].subcards.length;
                
                subcards[i].subcards.push(newCard);
                found = true;
                return true;
              }
              
              if (subcards[i].subcards && subcards[i].subcards.length > 0) {
                if (updateSubcards(subcards[i].subcards, targetId)) {
                  return true;
                }
              }
            }
            return false;
          };
          
          if (updateSubcards(card.subcards, parentId)) {
            await collection.updateOne(
              { id: card.id },
              { $set: { subcards: card.subcards } }
            );
            break;
          }
        }
      }
      
      if (found) {
        res.status(201).json(newCard);
      } else {
        res.status(404).json({ error: 'Parent card not found' });
      }
    }
  } catch (error) {
    console.error('Error adding subcard:', error);
    res.status(500).json({ error: 'Failed to add subcard' });
  }
});

app.put('/api/cards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCard = req.body;
    
    // Remover o campo _id se existir para evitar erro de modificação de campo imutável
    if (updatedCard._id) {
      delete updatedCard._id;
    }
    
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    // Verificar se é um card de nível superior
    const topLevelCard = await collection.findOne({ id });
    
    if (topLevelCard) {
      // Preservar subcards se eles existirem e não estiverem no updatedCard
      if (topLevelCard.subcards && !updatedCard.subcards) {
        updatedCard.subcards = topLevelCard.subcards;
      }
      
      await collection.updateOne(
        { id },
        { $set: updatedCard }
      );
      
      res.json(updatedCard);
    } else {
      // É um subcard aninhado, precisamos encontrá-lo e atualizá-lo
      const allCards = await collection.find({}).toArray();
      let found = false;
      
      // Procurar em todos os cards
      for (const card of allCards) {
        if (card.subcards && card.subcards.length > 0) {
          // Função para procurar e atualizar recursivamente
          const updateSubcardsRecursively = (subcards, targetId) => {
            for (let i = 0; i < subcards.length; i++) {
              if (subcards[i].id === targetId) {
                // Preservar subcards se eles existirem e não estiverem no updatedCard
                if (subcards[i].subcards && !updatedCard.subcards) {
                  updatedCard.subcards = subcards[i].subcards;
                }
                
                // Remover o campo _id do subcard se existir
                if (updatedCard._id) {
                  delete updatedCard._id;
                }
                
                subcards[i] = updatedCard;
                found = true;
                return true;
              }
              
              if (subcards[i].subcards && subcards[i].subcards.length > 0) {
                if (updateSubcardsRecursively(subcards[i].subcards, targetId)) {
                  return true;
                }
              }
            }
            return false;
          };
          
          if (updateSubcardsRecursively(card.subcards, id)) {
            // Remover o campo _id do card principal antes da atualização
            if (card._id) {
              const cardWithoutId = { ...card };
              delete cardWithoutId._id;
              await collection.updateOne(
                { id: card.id },
                { $set: { subcards: cardWithoutId.subcards } }
              );
            } else {
              await collection.updateOne(
                { id: card.id },
                { $set: { subcards: card.subcards } }
              );
            }
            break;
          }
        }
      }
      
      if (found) {
        res.json(updatedCard);
      } else {
        res.status(404).json({ error: 'Card not found' });
      }
    }
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

app.delete('/api/cards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    // Verificar se é um card de nível superior
    const result = await collection.deleteOne({ id });
    
    if (result.deletedCount > 0) {
      res.json({ message: 'Card deleted successfully' });
    } else {
      // É um subcard aninhado, precisamos encontrá-lo e deletá-lo
      const allCards = await collection.find({}).toArray();
      let found = false;
      
      // Procurar em todos os cards
      for (const card of allCards) {
        if (card.subcards && card.subcards.length > 0) {
          if (deleteCardRecursively(id, card.subcards)) {
            await collection.updateOne(
              { id: card.id },
              { $set: { subcards: card.subcards } }
            );
            found = true;
            break;
          }
        }
      }
      
      if (found) {
        res.json({ message: 'Card deleted successfully' });
      } else {
        res.status(404).json({ error: 'Card not found' });
      }
    }
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

app.get('/api/cards/:id/subcards', async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    // Verificar se é um card de nível superior
    const parentCard = await collection.findOne({ id });
    
    if (parentCard) {
      let subcards = parentCard.subcards || [];
      
      // Verificar se algum subcard não tem posição
      if (subcards.some(card => card.position === undefined)) {
        console.log('Adicionando posições aos subcards...');
        
        // Adicionar posição a cada subcard
        subcards = subcards.map((card, index) => ({
          ...card,
          position: index
        }));
        
        // Atualizar subcards no banco
        await collection.updateOne(
          { id },
          { $set: { subcards } }
        );
      }
      
      // Ordenar subcards por posição
      const orderedSubcards = [...subcards].sort((a, b) => (a.position || 0) - (b.position || 0));
      console.log('Retornando subcards ordenados por posição:', orderedSubcards.map(c => ({ id: c.id, position: c.position })));
      
      res.json(orderedSubcards);
    } else {
      // É um subcard aninhado, precisamos encontrá-lo
      const allCards = await collection.find({}).toArray();
      let foundSubcards = null;
      
      // Função para encontrar subcards recursivamente
      const findSubcardsRecursively = (subcards, targetId) => {
        for (const subcard of subcards) {
          if (subcard.id === targetId) {
            let foundSubcards = subcard.subcards || [];
            
            // Verificar se algum subcard não tem posição
            if (foundSubcards.some(card => card.position === undefined)) {
              // Adicionar posição a cada subcard
              foundSubcards = foundSubcards.map((card, index) => ({
                ...card,
                position: index
              }));
            }
            
            // Ordenar subcards por posição
            return [...foundSubcards].sort((a, b) => (a.position || 0) - (b.position || 0));
          }
          
          if (subcard.subcards && subcard.subcards.length > 0) {
            const result = findSubcardsRecursively(subcard.subcards, targetId);
            if (result) {
              return result;
            }
          }
        }
        return null;
      };
      
      // Procurar em todos os cards
      for (const card of allCards) {
        if (card.subcards && card.subcards.length > 0) {
          foundSubcards = findSubcardsRecursively(card.subcards, id);
          if (foundSubcards) {
            break;
          }
        }
      }
      
      if (foundSubcards) {
        console.log('Retornando subcards aninhados ordenados por posição:', foundSubcards.map(c => ({ id: c.id, position: c.position })));
        res.json(foundSubcards);
      } else {
        res.status(404).json({ error: 'Card not found' });
      }
    }
  } catch (error) {
    console.error('Error fetching subcards:', error);
    res.status(500).json({ error: 'Failed to fetch subcards' });
  }
});

// Adicionar um novo endpoint para reordenar cards
app.post('/api/cards/reorder', async (req, res) => {
  try {
    const { cardId, targetPosition, parentId } = req.body;
    
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    // Se não tem parentId, é uma reordenação nos cards principais
    if (!parentId) {
      const cards = await collection.find({}).toArray();
      
      // Encontrar o card a ser movido
      const cardIndex = cards.findIndex(card => card.id === cardId);
      if (cardIndex === -1) {
        return res.status(404).json({ error: 'Card not found' });
      }
      
      // Remover o card de sua posição atual
      const [cardToMove] = cards.splice(cardIndex, 1);
      
      // Inserir o card na nova posição
      cards.splice(targetPosition, 0, cardToMove);
      
      // Para cada card, atualizar sua posição no banco, removendo o _id
      for (let i = 0; i < cards.length; i++) {
        // Criar uma cópia do card sem o campo _id
        const card = { ...cards[i] };
        if (card._id) {
          delete card._id;
        }
        
        // Atualizar a posição do card
        await collection.updateOne(
          { id: cards[i].id },
          { $set: { position: i } }
        );
        
        // Atualizar o card local com a nova posição
        cards[i].position = i;
      }
      
      // Retornar todos os cards com a nova ordem, ordenados por posição
      const updatedCards = await collection.find({}).sort({ position: 1 }).toArray();
      console.log('Cards reordenados:', updatedCards.map(c => ({ id: c.id, position: c.position })));
      res.json(updatedCards);
    } else {
      // É uma reordenação de subcards
      const parentCard = await collection.findOne({ id: parentId });
      
      if (!parentCard || !parentCard.subcards) {
        return res.status(404).json({ error: 'Parent card not found or has no subcards' });
      }
      
      // Encontrar o card a ser movido
      const cardIndex = parentCard.subcards.findIndex(card => card.id === cardId);
      if (cardIndex === -1) {
        return res.status(404).json({ error: 'Card not found in parent subcards' });
      }
      
      // Remover o card de sua posição atual
      const [cardToMove] = parentCard.subcards.splice(cardIndex, 1);
      
      // Inserir o card na nova posição
      parentCard.subcards.splice(targetPosition, 0, cardToMove);
      
      // Adicionar posição a cada subcard
      parentCard.subcards.forEach((card, index) => {
        card.position = index;
      });
      
      // Remover o campo _id antes de atualizar
      const parentCardWithoutId = { ...parentCard };
      if (parentCardWithoutId._id) {
        delete parentCardWithoutId._id;
      }
      
      // Também remover _id de todos os subcards
      if (parentCardWithoutId.subcards) {
        parentCardWithoutId.subcards = parentCardWithoutId.subcards.map(subcard => {
          const newSubcard = { ...subcard };
          if (newSubcard._id) delete newSubcard._id;
          return newSubcard;
        });
      }
      
      // Atualizar o parentCard no banco
      await collection.updateOne(
        { id: parentId },
        { $set: { subcards: parentCardWithoutId.subcards } }
      );
      
      // Ordenar os subcards por posição
      const sortedSubcards = [...parentCardWithoutId.subcards].sort((a, b) => a.position - b.position);
      console.log('Subcards reordenados:', sortedSubcards.map(c => ({ id: c.id, position: c.position })));
      
      // Retornar os subcards atualizados ordenados por posição
      res.json(sortedSubcards);
    }
  } catch (error) {
    console.error('Error reordering cards:', error);
    res.status(500).json({ error: 'Failed to reorder cards' });
  }
});

// Endpoint para reordenação mais profunda (subcards aninhados)
app.post('/api/cards/reorder-nested', async (req, res) => {
  try {
    const { cardId, targetPosition, parentPath } = req.body;
    
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    // parentPath é um array de IDs que representa o caminho para o card pai
    // ex: ['card1', 'card2'] significa que estamos tentando reordenar subcards de card2,
    // que é um subcard de card1
    
    if (!parentPath || parentPath.length === 0) {
      return res.status(400).json({ error: 'Parent path is required' });
    }
    
    // Obter o card raiz
    const rootCardId = parentPath[0];
    const rootCard = await collection.findOne({ id: rootCardId });
    
    if (!rootCard) {
      return res.status(404).json({ error: 'Root card not found' });
    }
    
    // Criar uma cópia do rootCard sem o campo _id
    const rootCardWithoutId = { ...rootCard };
    if (rootCardWithoutId._id) {
      delete rootCardWithoutId._id;
    }
    
    // Função para encontrar o objeto de subcards a ser modificado
    const findSubcardsToModify = (card, path, currentIndex) => {
      if (currentIndex >= path.length - 1) {
        return card.subcards;
      }
      
      const nextId = path[currentIndex + 1];
      const nextCard = card.subcards.find(sc => sc.id === nextId);
      
      if (!nextCard) {
        return null;
      }
      
      return findSubcardsToModify(nextCard, path, currentIndex + 1);
    };
    
    // Encontrar os subcards a serem modificados
    const subcards = findSubcardsToModify(rootCardWithoutId, parentPath, 0);
    
    if (!subcards) {
      return res.status(404).json({ error: 'Parent subcards not found' });
    }
    
    // Encontrar o card a ser movido
    const cardIndex = subcards.findIndex(card => card.id === cardId);
    if (cardIndex === -1) {
      return res.status(404).json({ error: 'Card not found in specified path' });
    }
    
    // Remover o card de sua posição atual
    const [cardToMove] = subcards.splice(cardIndex, 1);
    
    // Inserir o card na nova posição
    subcards.splice(targetPosition, 0, cardToMove);
    
    // Remover _id recursivamente de todos os subcards
    const removeIdRecursively = (cards) => {
      if (!cards) return;
      return cards.map(card => {
        const newCard = { ...card };
        if (newCard._id) delete newCard._id;
        if (newCard.subcards) {
          newCard.subcards = removeIdRecursively(newCard.subcards);
        }
        return newCard;
      });
    };
    
    // Aplicar remoção de _id em todos os subcards do rootCard
    rootCardWithoutId.subcards = removeIdRecursively(rootCardWithoutId.subcards);
    
    // Atualizar o rootCard no banco
    await collection.updateOne(
      { id: rootCardId },
      { $set: { subcards: rootCardWithoutId.subcards } }
    );
    
    // Retornar os subcards atualizados
    res.json(subcards);
  } catch (error) {
    console.error('Error reordering nested cards:', error);
    res.status(500).json({ error: 'Failed to reorder nested cards' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 