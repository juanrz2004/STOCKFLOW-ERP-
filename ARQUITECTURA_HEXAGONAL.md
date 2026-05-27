# Arquitectura hexagonal aplicada a Árbol de Saberes

El proyecto se reorganiza siguiendo una separación explícita entre **dominio**, **aplicación**, **puertos** y **adaptadores**. El objetivo principal es que la lógica de negocio no dependa directamente de controladores HTTP, detalles de Spring Security, Axios, almacenamiento local ni persistencia concreta. Esta estructura permite corregir errores de arranque, mejorar mantenibilidad y facilitar futuras pruebas.

| Capa | Responsabilidad | Implementación propuesta |
|---|---|---|
| Dominio | Entidades, reglas e invariantes del negocio educativo. | Modelos JPA ubicados en `domain/model`, reutilizando las tablas actuales. |
| Aplicación | Casos de uso: login, gestión de usuarios, recursos, descargas, reportes y valoraciones. | Servicios en `application/service` y contratos en `application/port/in`. |
| Puertos de salida | Contratos hacia persistencia, seguridad y archivos. | Repositorios Spring Data como adaptadores de salida en `infrastructure/persistence`. |
| Adaptadores de entrada | Exposición HTTP y autenticación JWT. | Controladores REST en `adapter/in/web` y seguridad en `infrastructure/security`. |
| Frontend | Separación por dominio, aplicación, infraestructura HTTP y presentación. | Cliente HTTP central con fallback de API, páginas robustas, estados de carga y manejo de errores. |

## Decisiones críticas

La pantalla en blanco se corrige primero porque el frontend carecía de `index.html`, lo que impide que Vite resuelva el punto de entrada. También se corrige una expresión inválida en el botón de login y se agrega un `ErrorBoundary` para evitar que errores no controlados dejen la aplicación completamente en blanco.

En backend se corrige la autenticación JWT para que el filtro use el rol real del token y emita autoridades `ROLE_*`, ya que la configuración de seguridad requiere roles específicos para rutas de administración, reportes y gestión de recursos. Además, se corrige el reporte de recursos más descargados con una consulta explícita que devuelve `TopRecursoDTO`, porque el servicio actual invoca `findTopRecursos()` sin que el repositorio lo declare.

## Estructura objetivo

```text
backend/src/main/java/com/arbolsaberes
├── adapter/in/web
├── application/port/in
├── application/service
├── domain/model
└── infrastructure
    ├── config
    ├── persistence
    └── security

frontend/src
├── app
├── domain
├── application
├── infrastructure/http
└── presentation
    ├── components
    ├── pages
    └── routes
```

La refactorización mantendrá los endpoints existentes para no romper el contrato con el frontend: `/api/auth`, `/api/recursos`, `/api/usuarios`, `/api/reportes` y `/api/valoraciones`.
