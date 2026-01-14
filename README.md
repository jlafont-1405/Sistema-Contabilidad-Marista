# marist-manager
# 📊 Marist Manager - Sistema de Gestión Financiera

Aplicación web Full Stack para el control de finanzas personales. Permite a múltiples usuarios registrar ingresos, egresos, establecer presupuestos mensuales y visualizar el estado de sus finanzas mediante gráficos interactivos.

El sistema implementa una arquitectura **Multi-Tenant**, garantizando que los datos de cada usuario sean privados y seguros.

## 🚀 Tecnologías

### Backend
* **Node.js** & **Express**: Servidor RESTful.
* **TypeScript**: Tipado estático para mayor robustez.
* **MongoDB Atlas** & **Mongoose**: Base de datos NoSQL y modelado de datos.
* **JWT (JSON Web Tokens)**: Autenticación segura y manejo de sesiones.
* **Bcrypt.js**: Encriptación de contraseñas.
* **Nodemailer**: (Preparado) Gestión de correos electrónicos.

### Frontend
* **HTML5 Semántico**: Estructura limpia.
* **TailwindCSS**: Diseño moderno y 100% Responsive (Mobile First).
* **JavaScript (Vanilla)**: Lógica del cliente sin frameworks pesados.
* **Chart.js**: Visualización de datos y estadísticas.
* **Phosphor Icons**: Iconografía moderna.

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:
* [Node.js](https://nodejs.org/) (v16 o superior)
* [Git](https://git-scm.com/)
* Una cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (para la base de datos).

---

## ⚙️ Configuración e Instalación

1.  **Clonar el repositorio:**
    ```bash
    git clone [https://github.com/TU_USUARIO/marist-manager.git](https://github.com/TU_USUARIO/marist-manager.git)
    cd marist-manager
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    # O si usas yarn:
    yarn install
    ```

3.  **Configurar Variables de Entorno (.env):**
    Crea un archivo llamado `.env` en la raíz del proyecto. Este archivo **NO** debe subirse a GitHub. Copia y rellena el siguiente contenido:

    ```env
    # --- Configuración del Servidor ---
    PORT=3000
    
    # --- Base de Datos (MongoDB Atlas) ---
    # Reemplaza <password> con tu contraseña real de Atlas
    MONGO_URI=mongodb+srv://tu_usuario:<password>@cluster0.mongodb.net/marist-manager?retryWrites=true&w=majority
    
    # --- Seguridad (JWT) ---
    # Escribe una frase larga y secreta para firmar los tokens
    JWT_SECRET=tu_palabra_secreta_super_segura_2026
    
    # --- (Opcional) Emails ---
    # Actualmente el sistema simula el envío en consola, pero puedes configurarlo a futuro:
    # EMAIL_USER=tu@correo.com
    # EMAIL_PASS=tu_contraseña_de_aplicacion
    ```

---

## ▶️ Ejecución

### Modo Desarrollo (Recomendado)
Inicia el servidor con recarga automática (Nodemailer/TS-Node) y transpila TypeScript en tiempo real.

```bash
npm run dev
# O:
yarn dev


ESTRUCTURA DEL PROYECTO
/
├── public/             # Archivos estáticos (HTML, CSS compilado)
│   ├── index.html      # Dashboard principal
│   ├── login.html      # Inicio de sesión
│   ├── register.html   # Registro de usuarios
│   ├── js/             # Lógica Frontend (script.js)
│   └── css/            # Estilos
├── src/
│   ├── config/         # Conexión a DB
│   ├── controllers/    # Lógica de negocio (Auth, Transactions)
│   ├── models/         # Esquemas de Mongoose (User, Budget, Transaction)
│   ├── routes/         # Definición de endpoints API
│   └── index.ts        # Punto de entrada del servidor
├── .env                # Variables de entorno (NO SUBIR)
└── tsconfig.json       # Configuración de TypeScript


Desarrollado por Jean Claude - 2026. Estudiante de Ingeniería de Sistemas.