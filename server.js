const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// Подключение к базе данных на Railway
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ===== API =====

// Получить все заказы
app.get('/api/orders', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.json([]);
    }
});

// Получить один заказ по номеру
app.get('/api/order/:number', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders WHERE number = $1', [req.params.number]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.json({ error: 'Заказ не найден' });
        }
    } catch (err) {
        res.json({ error: err.message });
    }
});

// Создать новый заказ
app.post('/api/order', async (req, res) => {
    try {
        const { number, customer, product, quantity } = req.body;
        const result = await pool.query(
            `INSERT INTO orders (number, customer, product, quantity) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [number, customer, product, quantity || 1]
        );
        res.json({ success: true, order: result.rows[0] });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// Завершить заказ
app.put('/api/order/:number/complete', async (req, res) => {
    try {
        await pool.query(`UPDATE orders SET status = 'completed' WHERE number = $1`, [req.params.number]);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// ===== ВЕБ-СТРАНИЦА =====
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>ПК НЭЗ</title>
            <style>
                body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }
                .card { border: 1px solid #ccc; border-radius: 8px; padding: 20px; margin: 20px 0; }
                input, button { padding: 8px; margin: 5px; }
                button { background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
                .order-item { padding: 10px; border-bottom: 1px solid #eee; }
                .success { color: green; }
                .error { color: red; }
            </style>
        </head>
        <body>
            <h1>🏭 ПК НЭЗ - Производственная система</h1>
            
            <div class="card">
                <h3>📋 Список заказов</h3>
                <div id="ordersList"></div>
                <button onclick="loadOrders()">Обновить</button>
            </div>
            
            <div class="card">
                <h3>➕ Новый заказ</h3>
                <input type="text" id="number" placeholder="Номер заказа">
                <input type="text" id="customer" placeholder="Заказчик">
                <input type="text" id="product" placeholder="Изделие">
                <input type="number" id="quantity" placeholder="Количество">
                <button onclick="createOrder()">Создать</button>
                <div id="message"></div>
            </div>
            
            <div class="card">
                <h3>🔍 Поиск заказа</h3>
                <input type="text" id="searchNumber" placeholder="Номер">
                <button onclick="searchOrder()">Найти</button>
                <div id="searchResult"></div>
            </div>
            
            <script>
                async function loadOrders() {
                    const response = await fetch('/api/orders');
                    const orders = await response.json();
                    
                    let html = '';
                    if (orders.length === 0) {
                        html = '<div class="order-item">Нет заказов</div>';
                    } else {
                        orders.forEach(o => {
                            const statusIcon = o.status === 'active' ? '🟢' : '✅';
                            const statusText = o.status === 'active' ? 'Активен' : 'Завершён';
                            html += '<div class="order-item">' + statusIcon + ' ' + o.number + ' - ' + o.product + ' (' + o.quantity + ' шт) - ' + statusText + '</div>';
                        });
                    }
                    document.getElementById('ordersList').innerHTML = html;
                }
                
                async function createOrder() {
                    const order = {
                        number: document.getElementById('number').value,
                        customer: document.getElementById('customer').value,
                        product: document.getElementById('product').value,
                        quantity: parseInt(document.getElementById('quantity').value)
                    };
                    
                    if (!order.number || !order.customer || !order.product) {
                        document.getElementById('message').innerHTML = '<span class="error">❌ Заполните все поля!</span>';
                        return;
                    }
                    
                    const response = await fetch('/api/order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(order)
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        document.getElementById('message').innerHTML = '<span class="success">✅ Заказ создан!</span>';
                        loadOrders();
                        document.getElementById('number').value = '';
                        document.getElementById('customer').value = '';
                        document.getElementById('product').value = '';
                        document.getElementById('quantity').value = '';
                    } else {
                        document.getElementById('message').innerHTML = '<span class="error">❌ ' + result.error + '</span>';
                    }
                }
                
                async function searchOrder() {
                    const number = document.getElementById('searchNumber').value;
                    const response = await fetch('/api/order/' + number);
                    const order = await response.json();
                    
                    if (order.error) {
                        document.getElementById('searchResult').innerHTML = '<span class="error">❌ ' + order.error + '</span>';
                    } else {
                        document.getElementById('searchResult').innerHTML = 
                            '<div class="success">✅ Заказ найден!</div>' +
                            '🔢 Номер: ' + order.number + '<br>' +
                            '👤 Заказчик: ' + order.customer + '<br>' +
                            '📦 Изделие: ' + order.product + '<br>' +
                            '🔢 Количество: ' + order.quantity + ' шт<br>' +
                            '📊 Статус: ' + (order.status === 'active' ? '🟢 Активен' : '✅ Завершён');
                    }
                }
                
                // Загружаем заказы при открытии страницы
                loadOrders();
            </script>
        </body>
        </html>
    `);
});

// Запуск сервера
app.listen(3000, () => {
    console.log('🚀 Сервер с БД запущен на порту 3000');
});
