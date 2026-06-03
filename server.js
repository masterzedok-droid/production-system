const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// Подключение к БД на Railway
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ===== API =====

// Получить все заказы
app.get('/api/orders', async (req, res) => {
    const result = await pool.query('SELECT * FROM orders ORDER BY id DESC');
    res.json(result.rows);
});

// Получить один заказ
app.get('/api/order/:number', async (req, res) => {
    const result = await pool.query('SELECT * FROM orders WHERE number = $1', [req.params.number]);
    if (result.rows.length > 0) {
        res.json(result.rows[0]);
    } else {
        res.json({ error: 'Заказ не найден' });
    }
});

// Создать заказ
app.post('/api/order', async (req, res) => {
    const { number, customer, product, quantity } = req.body;
    const result = await pool.query(
        `INSERT INTO orders (number, customer, product, quantity) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [number, customer, product, quantity || 1]
    );
    res.json({ success: true, order: result.rows[0] });
});

// Завершить заказ
app.put('/api/order/:number/complete', async (req, res) => {
    await pool.query(`UPDATE orders SET status = 'completed' WHERE number = $1`, [req.params.number]);
    res.json({ success: true });
});

// ===== ВЕБ-СТРАНИЦА =====
app.get('/', (req, res) => {
    res.send(`... HTML код ...`); // тот же HTML, что был
});

app.listen(3000, () => console.log('🚀 Сервер с БД запущен'));
