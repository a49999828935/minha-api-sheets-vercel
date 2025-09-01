// Importa as bibliotecas necessárias
const express = require('express');
const { google } = require('googleapis');

const app = express();
app.use(express.json()); // Habilita o parser de JSON

// Rota para LER dados da planilha
app.get('/api/dados', async (req, res) => {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Página1!A:C',
    });

    const rows = response.data.values;
    if (rows && rows.length) {
      const headers = rows[0];
      const data = rows.slice(1).map((row) => {
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index];
        });
        return rowData;
      });
      res.json(data);
    } else {
      res.json({ message: 'Nenhum dado encontrado.' });
    }
  } catch (error) {
    console.error('Erro ao buscar dados da planilha:', error);
    res.status(500).send('Erro no servidor');
  }
});

// Rota para INCLUIR dados na planilha
app.post('/api/dados', async (req, res) => {
  try {
    const { nome, idade, cidade } = req.body;
    if (!nome || !idade || !cidade) {
      return res.status(400).send('Erro: Faltam dados. É necessário enviar nome, idade e cidade.');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'], // Escopo de leitura e escrita
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Página1!A:C',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[nome, idade, cidade]],
      },
    });

    res.status(201).json({ message: 'Dados adicionados com sucesso!' });
  } catch (error) {
    console.error('Erro ao adicionar dados na planilha:', error);
    res.status(500).send('Erro no servidor');
  }
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;