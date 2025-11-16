const express = require('express');
const { google } = require('googleapis');

const app = express();
app.use(express.json());

// Função de autenticação (reutilizável)
async function getAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth;
}

// Rota 1: POST para ADICIONAR dados
app.post('/api/dados', async (req, res) => {
  try {
    const { motorID, temperatura, vibracao, timestamp } = req.body; // Alterado aqui
    if (!motorID || !temperatura || !vibracao || !timestamp) { // Alterado aqui
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
        values: [[motorID, temperatura, vibracao, timestamp]], // Alterado aqui
      },
    });

    res.status(201).json({ message: 'Dados adicionados com sucesso!' });
  } catch (error) {
    console.error('Erro ao adicionar dados:', error);
    res.status(500).send('Erro no servidor');
  }
});

// Rota 2: GET para BUSCAR TUDO
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


// --- ROTA NOVA! (BUSCAR ÚLTIMO DADO) ---
// Rota 3: GET para BUSCAR A ÚLTIMA LEITURA de um motor
// Esta rota (/:motorID/atual) deve vir ANTES da rota (/:motorID)
app.get('/api/dados/:motorID/atual', async (req, res) => { // Alterado aqui
  try {
    const { motorID } = req.params; // Alterado aqui
    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 1. Busca TUDO
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
    const motorIDIndex = headers.indexOf('motorID'); // Alterado aqui
    if (motorIDIndex === -1) { // Alterado aqui
      return res.status(500).send("Erro: Coluna 'motorID' não encontrada."); // Alterado aqui
    }

    // 2. Filtra os dados
    const filteredRows = data.filter(row => row[motorIDIndex] === motorID); // Alterado aqui
    if (filteredRows.length === 0) {
      return res.status(404).json({ message: `Nenhum dado encontrado para o motor ${motorID}.` }); // Alterado aqui
    }

    // 3. Pega o ÚLTIMO item da lista
    // Como o 'append' adiciona ao final, o último item no array é o mais recente
    const latestRow = filteredRows[filteredRows.length - 1];

    // 4. Formata e retorna apenas esse item
    const formattedData = {};
    headers.forEach((header, index) => {
      formattedData[header] = latestRow[index];
    });

    res.json(formattedData); // Retorna um único objeto

  } catch (error) {
    console.error(`Erro ao buscar última leitura do motor ${req.params.motorID}:`, error); // Alterado aqui
    res.status(500).send('Erro no servidor');
  }
});
// --- FIM DA ROTA NOVA ---


// Rota 4: GET para BUSCAR TODOS OS DADOS de um motor
// Esta rota mais genérica vem DEPOIS da rota '/atual'
app.get('/api/dados/:motorID', async (req, res) => { // Alterado aqui
  try {
    const { motorID } = req.params; // Alterado aqui
    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

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
    const motorIDIndex = headers.indexOf('motorID'); // Alterado aqui
    if (motorIDIndex === -1) { // Alterado aqui
      return res.status(500).send("Erro: Coluna 'motorID' não encontrada."); // Alterado aqui
    }

    const filteredRows = data.filter(row => row[motorIDIndex] === motorID); // Alterado aqui
    if (filteredRows.length === 0) {
      return res.status(404).json({ message: `Nenhum dado encontrado para o motor ${motorID}.` }); // Alterado aqui
    }

    const formattedData = filteredRows.map((row) => {
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row[index];
      });
      return rowData;
    });

    res.json(formattedData);
  } catch (error) {
    console.error(`Erro ao buscar dados do motor ${req.params.motorID}:`, error); // Alterado aqui
    res.status(500).send('Erro no servidor');
  }
});


// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;
