const express = require('express');
   const path = require('path');
   const app = express();
   const port = process.env.PORT || 3000;

   // Servir arquivos estáticos
   app.use(express.static(path.join(__dirname)));

   // Rota para todas as páginas HTML (Single Page Application)
   app.get('*', (req, res) => {
     res.sendFile(path.join(__dirname, 'index.html'));
   });

   app.listen(port, () => {
     console.log(`Servidor rodando na porta ${port}`);
   });
