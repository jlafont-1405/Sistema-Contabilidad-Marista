import request from 'supertest';
import app from '../app';
import { connectTestDB, clearTestDB, closeTestDB } from './utils/test-db';

// CICLO DE VIDA DE LAS PRUEBAS
// Antes de empezar todo, conectamos la DB falsa
beforeAll(async () => {
    await connectTestDB();
});

// Después de cada test individual, borramos los datos
afterEach(async () => {
    await clearTestDB();
});

// Al terminar todo, apagamos la DB
afterAll(async () => {
    await closeTestDB();
});

// --- SUITE DE PRUEBAS ---
describe('🛡️ Módulo de Autenticación (Auth)', () => {

    // DATOS DE PRUEBA (MOCK DATA)
    const mockUser = {
        username: 'qa_tester',
        password: 'Password123!',
        role: 'admin'
    };

    describe('POST /api/auth/register', () => {
        
        it('✅ Debería registrar un usuario nuevo correctamente (Status 201)', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(mockUser);

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('message', 'Usuario creado exitosamente');
        });

        it('❌ No debería permitir usuarios duplicados (Status 400)', async () => {
            // 1. Creamos el usuario primero
            await request(app).post('/api/auth/register').send(mockUser);

            // 2. Intentamos crearlo otra vez
            const res = await request(app)
                .post('/api/auth/register')
                .send(mockUser);

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message', 'El usuario ya existe');
        });
    });

    describe('POST /api/auth/login', () => {

        // Antes de probar el login, necesitamos que el usuario exista
        beforeEach(async () => {
            await request(app).post('/api/auth/register').send(mockUser);
        });

        it('✅ Debería loguear correctamente y devolver un Token (Status 200)', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    username: mockUser.username,
                    password: mockUser.password
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('token'); // Verificamos que venga el token
            expect(res.body.role).toBe(mockUser.role);
        });

        it('❌ No debería loguear con contraseña incorrecta (Status 400)', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    username: mockUser.username,
                    password: 'WRONG_PASSWORD' // Contraseña mala
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toMatch(/inválidas/i); // Busca "inválidas" o "Invalidas"
        });

        it('❌ No debería loguear usuario inexistente (Status 400)', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'fantasma',
                    password: '123'
                });

            expect(res.statusCode).toEqual(400);
        });
    });
});