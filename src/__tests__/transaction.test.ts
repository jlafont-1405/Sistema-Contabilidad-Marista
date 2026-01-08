import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../app';
import Transaction from '../models/transaction.model';
import Budget from '../models/budget.model'; // Asegúrate de que este archivo exista
import { connectTestDB, clearTestDB, closeTestDB } from './utils/test-db';

// ⚙️ CONFIGURACIÓN INICIAL
beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await closeTestDB());

// 🔐 HELPER: Generador de Tokens para pruebas
const generateToken = (role: 'admin' | 'guest') => {
    const payload = { 
        id: new mongoose.Types.ObjectId(), 
        role: role, 
        username: `test_${role}` 
    };
    // Usamos el mismo secret que en tu .env o el default del controlador
    return jwt.sign(payload, process.env.JWT_SECRET || 'LaClaveSecretaDeJeanClaude2026', { expiresIn: '1h' });
};

describe('💰 Módulo de Transacciones (El Dinero)', () => {
    
    // Tokens para usar en las pruebas
    const adminToken = generateToken('admin');
    const guestToken = generateToken('guest');

    // Datos base para enviar
    const txData = {
        date: '2026-01-15',
        type: 'egreso',
        amount: 50,
        description: 'Pizza Testing',
        category: 'Comida'
    };

    describe('POST /api/transactions (Crear)', () => {
        
        it('✅ ADMIN debería poder crear una transacción (201)', async () => {
            const res = await request(app)
                .post('/api/transactions')
                .set('Authorization', adminToken) // 👈 Inyectamos el Token
                .send(txData);

            expect(res.statusCode).toBe(201);
            expect(res.body.description).toBe('Pizza Testing');
            expect(res.body.amount).toBe(50);
        });

        it('🔒 GUEST NO debería poder crear transacciones (403)', async () => {
            const res = await request(app)
                .post('/api/transactions')
                .set('Authorization', guestToken) // Token de invitado
                .send(txData);

            // Nota: Si tu middleware devuelve 403 o 401, ajusta esto.
            // Asumo que tu 'isAdmin' devuelve 403.
            expect([401, 403]).toContain(res.statusCode); 
        });

        it('❌ Debería fallar si faltan datos obligatorios (500/400)', async () => {
            const res = await request(app)
                .post('/api/transactions')
                .set('Authorization', adminToken)
                .send({ description: 'Falta monto y tipo' }); // Datos incompletos

            // Tu controller devuelve 500 en el catch, idealmente sería 400, pero probamos lo que hay
            expect(res.statusCode).toBe(500); 
        });
    });

    describe('GET /api/transactions (Filtrado por Mes)', () => {
        
        beforeEach(async () => {
            // Sembramos datos en la DB
            // 1. Enero 15 (Mitad de mes) - UTC Explícito
            await Transaction.create({ 
                ...txData, 
                description: 'Enero 15', 
                date: new Date('2026-01-15T12:00:00Z') 
            });
            
            // 2. Enero 31 (Borde final) - UTC Explícito
            // Usamos 20:00Z para que sea seguro Enero en cualquier parte del mundo
            await Transaction.create({ 
                ...txData, 
                description: 'Enero 31', 
                date: new Date('2026-01-31T20:00:00Z') 
            });
            
            // 3. Febrero 1 (Fuera del rango) - UTC Explícito
            await Transaction.create({ 
                ...txData, 
                description: 'Febrero 1', 
                date: new Date('2026-02-01T10:00:00Z') 
            });
        });

        it('✅ Debería traer solo las transacciones del mes solicitado', async () => {
            const res = await request(app)
                .get('/api/transactions?month=2026-01')
                .set('Authorization', guestToken); // Guest sí puede leer

            expect(res.statusCode).toBe(200);
            expect(res.body.transactions).toHaveLength(2); // Solo las 2 de Enero
            
            const descriptions = res.body.transactions.map((t: any) => t.description);
            expect(descriptions).toContain('Enero 15');
            expect(descriptions).toContain('Enero 31');
            expect(descriptions).not.toContain('Febrero 1');
        });
    });

    describe('POST /api/transactions/budget (Presupuesto)', () => {
        it('✅ Debería establecer y devolver el presupuesto', async () => {
            const res = await request(app)
                .post('/api/transactions/budget')
                .set('Authorization', adminToken)
                .send({ month: '2026-01', amount: 1500 });

            expect(res.statusCode).toBe(200);
            expect(res.body.baseIncome).toBe(1500);
            
            // Verificamos en DB
            const savedBudget = await Budget.findOne({ month: '2026-01' });
            expect(savedBudget?.baseIncome).toBe(1500);
        });
    });

    describe('DELETE /api/transactions/:id', () => {
        it('✅ Debería eliminar una transacción existente', async () => {
            // 1. Crear
            const tx = await Transaction.create(txData);
            
            // 2. Borrar
            const res = await request(app)
                .delete(`/api/transactions/${tx._id}`)
                .set('Authorization', adminToken);

            expect(res.statusCode).toBe(200);

            // 3. Verificar que ya no existe
            const check = await Transaction.findById(tx._id);
            expect(check).toBeNull();
        });
    });
});