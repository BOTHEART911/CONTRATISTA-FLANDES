# CONTRATISTA-FLANDES

App del contratista de la **Alcaldía de Flandes**. Ecosistema Flandes, Fase 4.

Publicada en GitHub Pages: https://botheart911.github.io/CONTRATISTA-FLANDES/

## Qué hay aquí (entrega 4.1)

- Entrada por el FLANDES-CORE, con registro silencioso del teléfono para los avisos.
- Inicio nuevo: sin menú lateral y sin banner dinámico.
- Datos del proceso (el contrato) y datos personales.
- PWA instalable, modo oscuro y avisos push con Firebase.

## Estructura

```
index.html                  arma la página y carga el kit
marca.js                    LO ÚNICO que cambia al mover el CORE o replicar la app
app.js                      la lógica propia de esta app
styles.css                  solo lo de esta app; los colores salen del kit
manifest.json               PWA
sw.js                       caché del armazón (no toca las llamadas al CORE)
firebase-messaging-sw.js    avisos con la app cerrada, en su propio scope
kit/                        las piezas compartidas, copia de KIT-FLANDES
img/                        iconos propios de la PWA
```

## Al actualizar

`kit/` es una **copia** de [KIT-FLANDES](https://github.com/BOTHEART911/KIT-FLANDES).
No se edita aquí: se arregla allá y se vuelve a copiar, o las siete apps se separan.

---

Desarrollo: **Oscar Polania** · Experto en soluciones digitales
