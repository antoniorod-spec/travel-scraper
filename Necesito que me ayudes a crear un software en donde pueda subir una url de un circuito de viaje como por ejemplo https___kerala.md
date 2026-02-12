Necesito que me ayudes a crear un software en donde pueda subir una url de un circuito de viaje como por ejemplo https://kerala.viajes/grandes-viajes/europa/turquia/circuitos/circuito-clasico/turquia-estambul-ankara-capadocia-pamukkale-y-esmirna-9-dias.html y entre en esta url en modo scraping y estraiga:

Los siguientes conceptos, te pongo de ejemplo:

1\. url:

ejemplo: https://kerala.viajes/grandes-viajes/europa/turquia/circuitos/circuito-clasico/turquia-estambul-ankara-capadocia-pamukkale-y-esmirna-9-dias.html)

2\. meta title

Ejemplo: (Turquía: Estambul, Ankara, Capadocia, Pamukkale y Esmirna)

3\. meta description:

Ejemplo: Turquía: Estambul, Ankara, Capadocia, Pamukkale y Esmirna, circuito clásico. Un viaje de gran diversidad cultural

4\. países visitados:

Ejemplo: Turquía

5\. número de días del viaje:

Ejemplo: 9

6\. número de noches del viaje:

Ejemplo: 8

7\. Fechas de Viaje Ejemplo: Febrero 2026 \- Enero 2027

8. Ciudades visitadas:  
   Ejemplo: Estambul, Ankara, Capadocia, Pamukkale, Esmirna, Bursa  
9. Imagen pequeña: (Esta viene de la imagen que tiene la clase: header-summary\_\_bg, [https://cdn.traveltool.es/wsimgresize/resize/crop/1920/350/cdn.traveltool.es/cloudcontent/fotos/tours/alex/1022369/1920\_375.jpg?27391422\&jpegQuality=100](https://cdn.traveltool.es/wsimgresize/resize/crop/1920/350/cdn.traveltool.es/cloudcontent/fotos/tours/alex/1022369/1920_375.jpg?27391422&jpegQuality=100)) que modifica el tamaño a de 1920/350 a 385/280 y 1920\_375.jpg por 900\_900.jpg  
    Y como resultado da:  
   [https://cdn.smy.travel/wsimgresize/resize/crop/385/280/cdn.smy.travel/cloudcontent/fotos/tours/alex/1022369/900\_900.jpg?27391422\&jpegQuality=100](https://cdn.smy.travel/wsimgresize/resize/crop/385/280/cdn.smy.travel/cloudcontent/fotos/tours/alex/1022369/900_900.jpg?27391422&jpegQuality=100)  
10. Imagen banner: (Esta viene de la imagen que tiene la clase: header-summary\_\_bg, [https://cdn.traveltool.es/wsimgresize/resize/crop/1920/350/cdn.traveltool.es/cloudcontent/fotos/tours/alex/1022369/1920\_375.jpg?27391422\&jpegQuality=100](https://cdn.traveltool.es/wsimgresize/resize/crop/1920/350/cdn.traveltool.es/cloudcontent/fotos/tours/alex/1022369/1920_375.jpg?27391422&jpegQuality=100))  
11. Origenes:  
     Ejemplo: Madrid, Valencia, Bilbao, Sevilla, Málaga, Santiago de Compostela, Barcelona, Mallorca, Tenerife  
12. Categoría 1: donde dice: Turquía, 9 Días · Circuito clásico \- sacar Circuito Clásico  
    Ejemplo: Circuito clásico  
13. Categoría 2:  
     Ejemplo: si es un viaje con excursiones ponerle Con guías  
14. Titulo: Similar al meta title, pero agregarle la palabra Circuito, Viaje, Combinado, el titulo debe ser menor a 100 caracteres, que lo acorte si es mayor.  
15. Fecha en texto:  
16. Tipo de circuito: 8  
17. El Viaje incluye: El texto que viene  
18. Excursiones incluidas: las excursiones que vienen  
19. Excursiones opcionales: si hay alguna excursoin  
20. Hoteles pervistos; los hoteles previstos  
21. pie de tabla de precios: condiciones  
22. descripción corta: una descripción breve del viaje  
23. configuración regional: 1  
24. promociones: 1  
25. proveedor: 14  
26. catalogo origenes: 593  
    Ejemplo: Salidas desde Diciembre 2025 hasta Febrero 2026  
27. Itinerario días: Dependiendo de los días que tenga el viaje se debe indicar con un @ delante como se distribuyen los días ejemplo (cada día es una columna para cuando se exporte esté separado)  
    día 1: @Ciudad de origen \- Estambul (aqui solo pondríamos @Estambul día1, día 2, desaparece)  
     día 2: @Estambul  
     día 3: @Estambul \- Ankara  
28. itineraio texto: aqui sería el texto que está debajo de días y empieza por { ejemplo:  
    {Día 1: Salida con destino Estambul. Llegada y traslado al hotel. Alojamiento.  
    {Día 2: Desayuno en el hotel. Día libre con posibilidad de participar en una visita facultativa a la ciudad, recorriendo el Bósforo y el barrio de Sultanahmet. Alojamiento.  
    {Día 3: Desayuno en el hotel. Mañana libre con la opción de participar en una visita facultativa "Novelas Turcas y el Gran Bazar". A la hora acordada, salida en autocar hacia Ankara, pasando por el puente intercontinental de Estambul. Llegada a la capital del país. Cena en el hotel y alojamiento.  
    (cada día es una columna para cuando se exporte esté separado)

Estos sería los datos a sacar de momento, el panel debe aceptar que se importen de forma masiva las urls y luego una vez screapeada la información que esta se pueda descargar también en excel con ese formato

Adjunto 

