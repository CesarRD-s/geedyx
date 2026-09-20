# Geedyx — reglas de implementación

## Código vertical y legible

- Todo código nuevo debe estar formateado antes de entregarse.
- Escribir de forma vertical: una propiedad, argumento, condición o elemento relevante por línea.
- Evitar objetos, arreglos, llamadas encadenadas, ternarios y JSX comprimidos en una sola línea cuando dificulten la lectura.
- Mantener componentes, servicios y funciones con bloques pequeños y responsabilidades claras.
- Usar `pnpm format` antes de validar y no desactivar Prettier para ocultar diferencias.
- El código funcional debe conservar la separación entre Web, API y base de datos.

## Validación obligatoria

Antes de marcar trabajo como completado, ejecutar:

```text
pnpm validate
```

Si una validación depende de PostgreSQL, documentar la evidencia y la dependencia pendiente en `docs/VALIDATION-BASE.md` o en el estado del módulo correspondiente.
