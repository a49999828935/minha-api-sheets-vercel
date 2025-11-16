const express = require('express');
const { google } = require('googleapis');

const app = express();
app.use(express.json());

// Função de autenticação (colocamos separado para reutilizar)
async function getAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'], // Usamos o escopo completo
  });
  return auth;
}

// Rota 1: POST para ADICIONAR dados (sem mudanças)
app.post('/api/dados', async (req, res) => {
  try {
    const { motorId, temperatura, vibracao, timestamp } = req.body;
    if (!motorId || !temperatura || !vibracao || !timestamp) {
      return res.status(400).send('Erro: Faltam dados.');
    }

    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Página1!A:D', // Ajuste 'Página1' se o nome da sua aba for outro
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[motorId, temperatura, vibracao, timestamp]],
      },
    });

    res.status(201).json({ message: 'Dados adicionados com sucesso!' });
  } catch (error) {
    console.error('Erro ao adicionar dados:', error);
    res.status(500).send('Erro no servidor');
  }
});

// Rota 2: GET para BUSCAR TUDO (sem mudanças)
app.get('/api/dados', async (req, res) => {
  try {
    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Página1!A:D', // Ajuste 'Página1'
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return res.json({ message: 'Nenhum dado encontrado.' });
    }

    // Pega cabeçalhos e formata os dados
    const headers = rows[0];
    const data = rows.slice(1).map((row) => {
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row[index];
      });
      return rowData;
    });

    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar todos os dados:', error);
    res.status(500).send('Erro no servidor');
  }
});

// --- ROTA NOVA! ---
// Rota 3: GET para BUSCAR DADOS DE UM MOTOR ESPECÍFICO
app.get('/api/dados/:motorId', async (req, res) => {
  try {
    // 1. Pega o ID do motor da URL
    const { motorId } = req.params;

    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 2. Busca TUDO da planilha
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Página1!A:D', // Ajuste 'Página1'
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return res.status(404).json({ message: 'Nenhum dado encontrado.' });
    }

    const headers = rows[0];
    const data = rows.slice(1);

    // 3. Encontra a coluna "motorId"
    const motorIdIndex = headers.indexOf('motorId');
    if (motorIdIndex === -1) {
      return res.status(500).send("Erro: Coluna 'motorId' não encontrada na planilha.");
    }

    // 4. Filtra os dados em memória
    // Compara o valor da coluna (row[motorIdIndex]) com o ID da URL (motorId)
    const filteredRows = data.filter(row => row[motorIdIndex] === motorId);

    if (filteredRows.length === 0) {
      return res.status(404).json({ message: `Nenhum dado encontrado para o motor ${motorId}.` });
    }

    // 5. Formata os dados filtrados
    const formattedData = filteredRows.map((row) => {
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row[index];
      });
      return rowData;
    });

    res.json(formattedData);

  } catch (error) {
    console.error(`Erro ao buscar dados do motor ${req.params.motorId}:`, error);
    res.status(500).send('Erro no servidor');
  }
});
// --- FIM DA ROTA NOVA ---

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;
