# CONTRATISTA-FLANDES

App del contratista de la **Alcaldía de Flandes**. Ecosistema Flandes, Fase 4.

Publicada en GitHub Pages: https://botheart911.github.io/CONTRATISTA-FLANDES/

## Qué hay aquí (hasta la entrega 4.9)

- Entrada por el FLANDES-CORE, avisos push automáticos (el permiso se pide al tocar Entrar).
- Inicio por bloques, borrador de actividades con evidencias, ingresar y corregir cuenta.
- Estado de cuenta, plan de pagos, egresos y certificación; trámites e institucional.
- Foto de perfil (la misma en las siete apps), caras de quien atiende e Insights en todas las vistas.
- PWA instalable y modo oscuro.

## Estructura

```
index.html                  arma la página y carga el kit
js/                         el código propio de esta app
  marca.js                  LO ÚNICO que cambia al mover el CORE o replicar la app
  app.js                    arranque, enrutador y vistas del contrato y los datos
  borrador.js · cuenta.js · seguimiento.js · tramites.js · institucional.js
  ayuda.js                  la guía de Insights de cada vista
styles.css                  solo lo de esta app; los colores salen del kit
manifest.json               PWA
version.js                  EN LA RAÍZ a propósito: los teléfonos preguntan aquí si hay versión nueva
sw.js                       EN LA RAÍZ a propósito: un service worker solo controla su carpeta y las de abajo
firebase-messaging-sw.js    EN LA RAÍZ por lo mismo: avisos con la app cerrada, en su propio scope
kit/                        las piezas compartidas, copia de KIT-FLANDES
img/                        iconos propios de la PWA
```

## Al actualizar

`kit/` es una **copia** de [KIT-FLANDES](https://github.com/BOTHEART911/KIT-FLANDES).
No se edita aquí: se arregla allá y se vuelve a copiar, o las siete apps se separan.

---

Desarrollo: **Oscar Polania** · Experto en soluciones digitales
