import request from 'supertest';
import app from '../app'; // Importamos la app que separamos en el paso anterior

describe('SANITY CHECK: Servidor e Integración', () => {
    
    // Prueba 1: Verificar que el servidor responde (Health Check)
    it('Debería devolver status 200 y OK en la ruta /health', async () => {
        const res = await request(app).get('/health');
        
        // Esperamos que no sea null
        expect(res.body).toBeTruthy();
        
        // Esperamos status 200
        expect(res.statusCode).toEqual(200);
        
        // Esperamos que el mensaje sea el correcto
        expect(res.body.status).toBe('OK');
    });

    // Prueba 2: Verificar manejo de rutas inexistentes (404)
    it('Debería devolver 404 si la ruta no existe', async () => {
        const res = await request(app).get('/ruta-que-no-existe-12345');
        expect(res.statusCode).toEqual(404);
    });
});