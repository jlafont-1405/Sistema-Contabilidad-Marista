# ⛪ Gestión Marista - Sistema de Contabilidad

![Version](https://img.shields.io/badge/version-1.2.1-blue.svg)
![Status](https://img.shields.io/badge/status-stable-success.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

Aplicación web **Full Stack** diseñada para la gestión financiera eficiente. Permite registrar ingresos y egresos, visualizar balances en tiempo real y generar reportes contables automáticos.

El sistema cuenta con una arquitectura **Multi-Tenant** (datos privados por usuario) y una interfaz moderna que se adapta al dispositivo (**Mobile First**).

## 🚀 Características Principales (v1.2.1)

* **📊 Dashboard Interactivo:** Gráficos en tiempo real y tarjetas de balance que muestran el estado financiero del mes seleccionado.
* **📱 UI Responsiva "Transformers":** Barra de herramientas dinámica que se compacta automáticamente al hacer scroll en dispositivos móviles para maximizar el área de visión.
* **📑 Reportes Excel Inteligentes:** Generación de hojas de cálculo detalladas (`.xlsx`) usando **ExcelJS**, personalizadas con el nombre del usuario y organizadas por fecha.
* **🔐 Seguridad Avanzada:** Autenticación vía **JWT**, encriptación con **Bcrypt** y protección de rutas privadas.
* **👤 Experiencia Personalizada:** El sistema reconoce al usuario y personaliza saludos y archivos exportados.

---

## 🛠️ Tecnologías

### Backend
* **Node.js** & **Express**: API RESTful escalable.
* **TypeScript**: Código robusto y tipado.
* **MongoDB Atlas**: Base de datos en la nube.
* **ExcelJS**: Motor de generación de reportes contables.
* **JWT & Bcrypt**: Seguridad y Sesiones.

### Frontend
* **HTML5 & TailwindCSS**: Diseño moderno, limpio y adaptable.
* **JavaScript (Vanilla)**: Lógica de cliente optimizada sin frameworks pesados.
* **Chart.js**: Visualización de estadísticas.
* **Phosphor Icons**: Iconografía vectorial.

---

## ⚙️ Instalación y Configuración

Sigue estos pasos para correr el proyecto localmente:

1.  **Clonar el repositorio:**
    ```bash
    git clone [https://github.com/jlafont-1405/Sistema-Contabilidad-Marista.git](https://github.com/jlafont-1405/Sistema-Contabilidad-Marista.git)
    cd Sistema-Contabilidad-Marista
    ```

2.  **Instalar dependencias:**
    ```bash
    yarn install
    # o si usas npm: npm install
    ```

3.  **Configurar Variables de Entorno:**
    Crea un archivo `.env` en la raíz (basado en `.env.example` si existiera) y agrega tus credenciales:
    ```env
    PORT=3000
    MONGO_URI=mongodb+srv://<usuario>:<password>@cluster.mongodb.net/marist-db
    JWT_SECRET=tu_clave_secreta_para_firmar_tokens
    ```

4.  **Ejecutar en modo Desarrollo:**
    ```bash
    yarn dev
    ```
    _El servidor iniciará en `http://localhost:3000`_

---

## 📂 Estructura del Proyecto

```text
/
├── public/          # Frontend (HTML, CSS compilado, JS estático)
│   ├── js/          # Lógica del cliente (Fetch API, DOM)
│   └── css/         # Estilos Tailwind
├── src/             # Backend (Código Fuente TypeScript)
│   ├── controllers/ # Lógica de negocio (Reportes, Auth, Transacciones)
│   ├── models/      # Esquemas de Datos (Mongoose)
│   ├── routes/      # Endpoints de la API
│   └── index.ts     # Punto de entrada
├── dist/            # Código compilado (Producción)
└── .env             # Variables de entorno (Ignorado por Git)
