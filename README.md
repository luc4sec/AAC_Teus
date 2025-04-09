# TEUS App

TEUS é uma aplicação de comunicação alternativa e aumentativa projetada para auxiliar pessoas com dificuldades de comunicação. A aplicação permite a criação, organização e uso de cartões de comunicação de forma intuitiva e personalizável.

## Funcionalidades

- **Sistema de Cartões**: Interface baseada em cartões visuais organizados por categorias
- **Navegação Hierárquica**: Navegue através de níveis de cartões para acessar vocabulário mais específico
- **Modo de Edição**: Interface protegida por senha para adicionar, editar ou reorganizar cartões
- **Arrastar e Soltar**: Reorganize cartões facilmente em modo de edição
- **Síntese de Voz**: Leitura em voz alta do texto dos cartões selecionados
- **Design Responsivo**: Funciona em diferentes dispositivos (desktop, tablet, celular)
- **Personalização**: Customize cores, ícones e texto dos cartões

## Tecnologias

### Frontend
- Vue.js 3 com TypeScript
- Composition API
- Estilização com CSS puro

### Backend
- Node.js com Express
- MongoDB para armazenamento de dados
- API RESTful

## Instalação e Execução

### Pré-requisitos
- Node.js (v14+)
- MongoDB (local ou Atlas)

### Configuração do Backend
1. Clone o repositório
2. Navegue até a pasta do servidor:
   ```
   cd backend
   ```
3. Instale as dependências:
   ```
   npm install
   ```
4. Crie um arquivo `.env` com a seguinte configuração:
   ```
   MONGO_URI=sua_uri_do_mongodb
   PORT=5000
   ```
5. Inicie o servidor:
   ```
   npm start
   ```

### Configuração do Frontend
1. Navegue até a pasta do frontend:
   ```
   cd frontend
   ```
2. Instale as dependências:
   ```
   npm install
   ```
3. Crie um arquivo `.env.local` com a seguinte configuração:
   ```
   VITE_API_URL=http://localhost:5000/api
   ```
4. Inicie o servidor de desenvolvimento:
   ```
   npm run dev
   ```

## Uso

### Modo Normal (Usuário)
- Toque nos cartões para ouvir a leitura em voz alta
- Navegue entre os níveis tocando nos cartões com subcategorias
- Use o botão de voltar ou a navegação do breadcrumb para retornar a níveis anteriores

### Modo de Edição (Administrador)
- Clique no ícone de cadeado e digite a senha (padrão: 123456)
- Adicione novos cartões com o botão "+"
- Reorganize cartões arrastando-os para a posição desejada
- Edite ou exclua cartões usando os botões específicos que aparecem em cada cartão

### Configurações
- Ajuste a velocidade de fala clicando no ícone de engrenagem

## Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua funcionalidade (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova funcionalidade'`)
4. Faça push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Licença

[MIT](LICENSE)
