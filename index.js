// Importa as bibliotecas necessárias
const express = require('express');
const { google } = require('googleapis');

const app = express();

// Rota principal da API
app.get('/api/dados', async (req, res) => {
  try {
    // Configura a autenticação com o Google
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL, // Vem das variáveis de ambiente
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Formata a chave privada
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'], // Escopo de apenas leitura
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ID da sua planilha
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // Busca os dados da planilha
    // 'Página1' é o nome da aba da sua planilha. Altere se for diferente.
    // 'A:C' significa que queremos os dados das colunas A até C.
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Página1!A:C',
    });

    const rows = response.data.values;
    if (rows.length) {
      // Pega a primeira linha como cabeçalho
      const headers = rows[0];
      // Mapeia o restante das linhas para objetos JSON
      const data = rows.slice(1).map((row) => {
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index];
        });
        return rowData;
      });

      // Envia os dados como resposta
      res.json(data);
    } else {
      res.json({ message: 'Nenhum dado encontrado.' });
    }
  } catch (error) {
    console.error('Erro ao buscar dados da planilha:', error);
    res.status(500).send('Erro no servidor');
  }
});

// Inicia o servidor na porta 3000 ou na porta definida pela Vercel
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Exporta o app para a Vercel
module.exports = app;