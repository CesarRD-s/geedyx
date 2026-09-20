# Geedyx — Productos y catálogo

## 1. Propósito y alcance

Este documento define el alcance inicial del catálogo de productos de Geedyx. El módulo debe permitir registrar productos para distintos tipos de comercio, como ropa, calzado, teléfonos, electrónica, muebles, cocina, línea blanca o jardinería, sin crear formularios específicos para cada industria.

La base será un producto general con descripción, categoría, multimedia y opciones comerciales opcionales. Las opciones pueden generar variantes con diferentes precios, SKU, códigos de barras o existencias.

En esta fase se trabajará únicamente con productos. Los servicios quedan fuera hasta que exista un caso funcional concreto que justifique incorporarlos.

## 2. Principios del módulo

- El producto debe ser útil para un comercio sencillo y permitir evolución posterior.
- Las especificaciones que no afecten búsqueda, precio, SKU o inventario pueden conservarse en la descripción.
- No se crearán formularios diferentes para teléfonos, ropa, muebles u otras industrias.
- Las categorías organizan el catálogo; no contienen reglas de negocio específicas por industria.
- El inventario administra existencias y movimientos; Productos administra la definición comercial.
- El catálogo interno y el público utilizan la misma fuente de productos, con diferentes vistas y permisos.

## 3. Categorías y taxonomía

Las categorías forman una taxonomía jerárquica con categorías padre e hijas:

```text
Electrónica
└── Telefonía
    └── Smartphones
```

Una categoría puede tener una categoría padre opcional. Inicialmente, un producto tendrá una categoría principal.

El Owner o un Admin con permiso podrá crear, editar, ordenar, activar y archivar categorías. Las categorías no deben representar marcas, colores, tallas ni otras opciones de venta.

Los filtros iniciales podrán utilizar:

- Texto de búsqueda.
- Categoría.
- Marca.
- Precio.
- Disponibilidad.
- Valores de opciones cuando el producto las tenga.

No se implementará inicialmente un constructor avanzado de atributos personalizados por categoría.

## 4. Producto base

El producto base representa la ficha comercial general. Como mínimo podrá incluir:

- Título.
- Descripción corta opcional.
- Descripción detallada.
- Categoría principal.
- Marca opcional.
- Modelo o referencia opcional.
- Estado.
- Visibilidad.
- Imagen principal y galería.

La descripción puede contener especificaciones que no necesitan filtros estructurados, como procesador, pantalla, cámara, material, características técnicas o detalles de condición.

Estados iniciales:

- `DRAFT`: producto en preparación.
- `ACTIVE`: producto disponible para la operación cuando tiene al menos una
  variante válida y activa.
- `ARCHIVED`: producto retirado sin eliminar su historial.

La visibilidad inicial puede ser:

- `INTERNAL`: visible para la operación interna.
- `PUBLIC`: apto para mostrarse en el catálogo público cuando también esté activo.

Un producto usado o único puede registrarse como un producto independiente cuando tenga una condición, descripción, fotografías o precio propios.

## 5. Opciones y variantes

Las opciones son configurables y solo se agregan cuando afectan la selección comercial del producto. Algunos ejemplos son:

- Color.
- Talla.
- Modelo.
- Memoria.
- Capacidad.
- Material.

El módulo no tendrá campos técnicos específicos para cada industria. Por ejemplo, la RAM, el procesador o el tamaño de pantalla pueden quedar en la descripción; solamente se convierten en opciones si el cliente debe elegirlos y esa elección modifica la compra, el precio, el SKU o el inventario.

Una variante representa una combinación válida de opciones:

```text
Producto: Teléfono Galaxy X

Opciones:
- Memoria: 4 GB + 128 GB, 8 GB + 256 GB
- Color: Negro, Azul, Blanco

Variantes:
- 4 GB + 128 GB / Negro
- 4 GB + 128 GB / Azul
- 8 GB + 256 GB / Negro
```

No es necesario crear combinaciones que no existan. Un producto sin opciones tendrá una variante predeterminada.

Una opción puede modificar el precio final o no modificarlo. Cuando una
opción afecte el precio, la variante resultante debe conservar su propio precio.

El precio y el descuento pertenecen a la variante, porque la variante es la
unidad que se vende y controla el inventario. No se utilizará herencia entre
un precio del producto y el precio de sus variantes.

El descuento inicial tendrá una sola modalidad por variante: porcentaje o monto
fijo. No se aplicarán ambas modalidades al mismo tiempo ni se implementará un
motor de promociones.

Una variante podrá incluir:

- SKU o código interno.
- Código de barras opcional.
- Precio.
- Descuento opcional: porcentaje o monto fijo.
- Imagen específica opcional.
- Referencia al inventario disponible.

Reglas de identificación y activación:

- Toda variante activa debe tener un SKU único dentro de Geedyx.
- El SKU puede introducirse manualmente o generarse automáticamente.
- Un SKU puede editarse mientras la variante no tenga ventas ni movimientos.
- Después de utilizarse en una operación, el SKU no debe cambiarse; una nueva
  identificación requiere una nueva variante o archivar la anterior.
- El código de barras es opcional y debe ser único cuando exista.
- El código de barras se almacena como texto para conservar ceros iniciales y
  puede utilizarse para buscar o escanear la variante.
- La primera versión no genera códigos de barras automáticamente.
- El código de barras y el SKU no son equivalentes: el SKU es interno y el
  código de barras es un identificador externo.

Una variante solo puede pasar a `ACTIVE` cuando tiene una combinación válida de
opciones, SKU único, precio válido y un producto base activo. La imagen, el
descuento y el código de barras pueden continuar siendo opcionales.

## 6. Producto frente a publicación separada

Por defecto, las opciones de un mismo producto se manejarán como variantes bajo una sola ficha.

Se utilizará una publicación o producto separado cuando exista una identidad comercial realmente diferente, por ejemplo:

- Otro modelo con descripción y especificaciones distintas.
- Otra marca o categoría.
- Un producto usado único.
- Otra condición, galería o precio que requiera una ficha independiente.

La interfaz podrá mostrar variantes como tarjetas separadas si una tienda lo necesita, pero no se duplicará la información del producto en la base de datos únicamente por razones de presentación.

## 7. Catálogo interno y catálogo público

El catálogo interno podrá mostrar información operativa como:

- SKU.
- Código de barras.
- Variantes.
- Precio y descuento.
- Disponibilidad.
- Estado.
- Datos administrativos permitidos.

El catálogo público mostrará solamente productos activos y publicados, con la información comercial correspondiente:

- Título.
- Descripción.
- Imágenes.
- Opciones y variantes.
- Precio.
- Disponibilidad pública.

La visibilidad pública evita publicar productos en preparación, internos, archivados o todavía incompletos. El catálogo público será una vista de lectura; el pedido, carrito y pago manual pertenecen a la extensión futura de tienda pública, mientras que la venta interna pertenece a `SALES.md`.

## 8. Inventario y movimientos

Productos no será responsable de modificar directamente las existencias. El stock será administrado por Inventario mediante movimientos como:

- Recepción.
- Venta.
- Ajuste.
- Devolución.
- Pérdida o merma.

La ficha del producto o variante podrá mostrar el stock actual como información derivada, pero no será un campo que se edite libremente desde el formulario de producto.

## 9. Multimedia y almacenamiento

La primera fase utilizará almacenamiento local para imágenes de productos, galerías e imágenes asociadas a variantes.

La base de datos debe conservar los metadatos necesarios para obtener y modificar cada archivo, como:

- Identificador.
- Producto o variante relacionada.
- Referencia de almacenamiento.
- Nombre original o nombre controlado.
- Tipo de archivo.
- Tamaño.
- Orden de presentación.
- Indicador de imagen principal.

El módulo no debe acoplar su lógica a un proveedor específico. Más adelante podrá utilizar almacenamiento compatible con S3, Supabase Storage, Firebase, Cloudinary u otro proveedor mediante una capa de almacenamiento intercambiable.

## 10. Auditoría y permisos

El módulo deberá emitir eventos relevantes, como:

- Creación, edición y archivado de productos.
- Creación, edición o eliminación lógica de variantes.
- Cambios de precio o descuento.
- Cambios de SKU o código de barras.
- Publicación, despublicación o cambio de visibilidad.
- Creación, edición o archivado de categorías.

Owner y Admin podrán realizar operaciones según los permisos funcionales definidos para el módulo. Los usuarios operativos solo podrán administrar productos si reciben esos permisos.

Permisos iniciales del módulo:

- `products.read`: consultar productos, variantes y categorías.
- `products.manage`: crear, editar, archivar y administrar productos, variantes,
  categorías y multimedia, excepto precios y descuentos.
- `products.prices.manage`: modificar precios y descuentos.

No se utiliza `delete`; los productos, variantes y categorías se archivan para
conservar el historial.

Los eventos no deben registrar secretos ni información innecesaria.

## 11. Fuera del alcance inicial

- Servicios.
- Atributos técnicos avanzados específicos por industria.
- Constructor libre de campos personalizados.
- Recomendaciones.
- Reseñas y calificaciones.
- Favoritos.
- Comparador avanzado.
- Bundles o productos compuestos.
- Suscripciones o preórdenes.
- Precios por cliente o listas de precios.
- Promociones, cupones o descuentos complejos.
- Control individual por número de serie o IMEI.
- Proveedores de almacenamiento externos configurables desde la aplicación.
- Carrito, pedidos, pagos y facturación.
