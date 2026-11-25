# Shadex 0.1

Editor de shaders basado en formas. Licencia MIT.

## Estructura

```
shadex/
  core/            sin dependencias, sin React
    ir.ts          formato de la escena (JSON, versión 0.1)
    primitives.ts  formas y materiales: esquema de parámetros + GLSL
    compiler.ts    escena → GLSL (uniforms para el editor, constantes para exportar)
    runtime.ts     renderer WebGL2: recompila solo si cambia la estructura
    export.ts      Shadertoy, JSON, enlace compartible y snippet para insertar
    presets.ts     Esfera de luz, Emblema biselado, Silvana, Hyprant, Paix, Pairtial, Glass, Lazo
  editor/
    editor.ts            editor sin framework
    editor.css
    ShadexEditorView.tsx envoltorio React
    standalone.ts        entrada para editor.html (sitio público)
  index.ts         API pública
```

## Luces espaciales

Las luces (`scene.lights`) viven en la escena, no dentro de una capa. Una forma con el material
**Luz espacial** (`lit`) no tiene volumen real: lo simula leyendo las luces a través de su contorno.

- **Borde, resplandor interior y exterior, rebote**: usan el campo de luz en el punto del contorno más cercano
  (`cw = p - g·sd`). Cuando una luz pasa cerca, se enciende esa parte del borde y el brillo se extiende desde ahí.
- **Bisel**: un perfil de altura a lo largo de `-sd` produce una normal; cada luz la ilumina según su altura.
- **Textura**: relieve de ruido sobre esa normal; los brillos se rompen y se desplazan al moverse la luz.
- **Sombra proyectada**: la misma forma desplazada en dirección contraria al centro de las luces.

Toda forma devuelve `sd` (distancia con signo) y `g` (dirección hacia fuera del contorno) en su `Hit`.

## Añadir una forma o un material

1. En `primitives.ts`, añade la entrada a `SHAPES` (o `SHADES`) con sus parámetros: etiqueta, rango, valor por defecto y rango seguro para «Aleatorio».
2. Escribe su función GLSL en `GLSL_SHAPES` (o `GLSL_SHADES`). Los argumentos `float` van **en el mismo orden que el esquema**.
3. Regístrala en `SHAPE_FN` (o `SHADE_FN`).

El editor genera los controles solo. El compilador no necesita cambios.

Firmas:

```glsl
Hit  shapeX(vec2 p, float i, float t, float px, <parámetros…>);              // rellena h.sd y h.g
vec4 shadeX(Hit h, vec2 wp, vec2 cw, vec3 pa, vec3 pb, vec3 pc, float t, <parámetros…>); // color premultiplicado
```

## Usar una pieza en una web

En el editor: Exportar → Insertar en web, y pegar el bloque en el HTML. No hace falta instalar nada.
