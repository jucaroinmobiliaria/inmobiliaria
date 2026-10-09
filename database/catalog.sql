-- Nido · SOLO catálogos (tipos de inmueble, comodidades, ciudades y barrios), sin usuarios ni inmuebles.
-- Úsalo en producción en lugar de seed.sql: ejecuta database/schema.sql, luego este archivo y luego create-admin.sql.
-- Desde el panel de administración (/admin/catalogos) puedes editar o ampliar estos catálogos.

BEGIN;
--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: Amenity; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Amenity" (id, slug, name, icon, category, "sortOrder") VALUES
	('amn_cocina-integral', 'cocina-integral', 'Cocina integral', 'kitchen', 'INTERIOR', 0),
	('amn_estudio', 'estudio', 'Estudio', 'tv', 'INTERIOR', 1),
	('amn_chimenea', 'chimenea', 'Chimenea', 'fireplace', 'INTERIOR', 2),
	('amn_aire-acondicionado', 'aire-acondicionado', 'Aire acondicionado', 'ac', 'INTERIOR', 3),
	('amn_zona-de-lavanderia', 'zona-de-lavanderia', 'Zona de lavandería', 'laundry', 'INTERIOR', 4),
	('amn_cuarto-util', 'cuarto-util', 'Cuarto útil', 'lock', 'INTERIOR', 5),
	('amn_gas-natural', 'gas-natural', 'Gas natural', 'zap', 'INTERIOR', 6),
	('amn_piscina', 'piscina', 'Piscina', 'pool', 'BUILDING', 7),
	('amn_gimnasio', 'gimnasio', 'Gimnasio', 'gym', 'BUILDING', 8),
	('amn_porteria-24h', 'porteria-24h', 'Portería 24 h', 'security', 'BUILDING', 9),
	('amn_ascensor', 'ascensor', 'Ascensor', 'elevator', 'BUILDING', 10),
	('amn_salon-comunal', 'salon-comunal', 'Salón comunal', 'social', 'BUILDING', 11),
	('amn_juegos-infantiles', 'juegos-infantiles', 'Juegos infantiles', 'kids', 'BUILDING', 12),
	('amn_parqueadero-de-visitantes', 'parqueadero-de-visitantes', 'Parqueadero de visitantes', 'lock', 'BUILDING', 13),
	('amn_circuito-de-camaras', 'circuito-de-camaras', 'Circuito de cámaras', 'cctv', 'BUILDING', 14),
	('amn_planta-electrica', 'planta-electrica', 'Planta eléctrica', 'zap', 'BUILDING', 15),
	('amn_conjunto-cerrado', 'conjunto-cerrado', 'Conjunto cerrado', 'lock', 'BUILDING', 16),
	('amn_balcon', 'balcon', 'Balcón', 'balcony', 'EXTERIOR', 17),
	('amn_terraza', 'terraza', 'Terraza', 'terrace', 'EXTERIOR', 18),
	('amn_zona-bbq', 'zona-bbq', 'Zona BBQ', 'sun', 'EXTERIOR', 19),
	('amn_zonas-verdes', 'zonas-verdes', 'Zonas verdes', 'garden', 'EXTERIOR', 20),
	('amn_jacuzzi', 'jacuzzi', 'Jacuzzi', 'water', 'EXTERIOR', 21),
	('amn_vista-panoramica', 'vista-panoramica', 'Vista panorámica', 'view', 'EXTERIOR', 22),
	('amn_mascotas-permitidas', 'mascotas-permitidas', 'Mascotas permitidas', 'pets', 'EXTERIOR', 23),
	('amn_cerca-de-transporte', 'cerca-de-transporte', 'Cerca de transporte', 'bus', 'SURROUNDINGS', 24),
	('amn_cerca-de-colegios', 'cerca-de-colegios', 'Cerca de colegios', 'school', 'SURROUNDINGS', 25),
	('amn_cerca-de-centros-comerciales', 'cerca-de-centros-comerciales', 'Cerca de centros comerciales', 'shopping', 'SURROUNDINGS', 26),
	('amn_cerca-de-parques', 'cerca-de-parques', 'Cerca de parques', 'park', 'SURROUNDINGS', 27),
	('amn_cerca-de-hospitales', 'cerca-de-hospitales', 'Cerca de hospitales', 'hospital', 'SURROUNDINGS', 28),
	('amn_barrio-caminable', 'barrio-caminable', 'Barrio caminable', 'walk', 'SURROUNDINGS', 29);


--
-- Data for Name: City; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."City" (id, slug, name, department, lat, lng, active, "coverUrl") VALUES
	('city_medellin', 'medellin', 'Medellín', 'Antioquia', 6.2442, -75.5812, true, 'https://images.unsplash.com/photo-1599413181490-6ee73c9c31c6?auto=format&fit=crop&w=1600&q=80'),
	('city_bogota', 'bogota', 'Bogotá', 'Bogotá D.C.', 4.711, -74.0721, true, 'https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?auto=format&fit=crop&w=1600&q=80'),
	('city_cali', 'cali', 'Cali', 'Valle del Cauca', 3.4516, -76.532, true, 'https://images.unsplash.com/photo-1559494007-9f5847c49d94?auto=format&fit=crop&w=1600&q=80'),
	('city_cartagena', 'cartagena', 'Cartagena', 'Bolívar', 10.3997, -75.5144, true, 'https://images.unsplash.com/photo-1583997052103-b4a1cb974ce5?auto=format&fit=crop&w=1600&q=80'),
	('city_barranquilla', 'barranquilla', 'Barranquilla', 'Atlántico', 10.9685, -74.7813, true, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80'),
	('city_santa-marta', 'santa-marta', 'Santa Marta', 'Magdalena', 11.2408, -74.199, true, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80');


--
-- Data for Name: Neighborhood; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Neighborhood" (id, "cityId", slug, name, lat, lng) VALUES
	('nb_medellin_el-poblado', 'city_medellin', 'el-poblado', 'El Poblado', 6.2086, -75.5659),
	('nb_medellin_laureles', 'city_medellin', 'laureles', 'Laureles', 6.2476, -75.59),
	('nb_medellin_envigado', 'city_medellin', 'envigado', 'Envigado', 6.1759, -75.5917),
	('nb_medellin_belen', 'city_medellin', 'belen', 'Belén', 6.2325, -75.6103),
	('nb_medellin_sabaneta', 'city_medellin', 'sabaneta', 'Sabaneta', 6.1515, -75.6165),
	('nb_medellin_estadio', 'city_medellin', 'estadio', 'Estadio', 6.2565, -75.5885),
	('nb_bogota_chico', 'city_bogota', 'chico', 'Chicó', 4.6745, -74.0495),
	('nb_bogota_usaquen', 'city_bogota', 'usaquen', 'Usaquén', 4.7105, -74.031),
	('nb_bogota_chapinero', 'city_bogota', 'chapinero', 'Chapinero', 4.6486, -74.0628),
	('nb_bogota_cedritos', 'city_bogota', 'cedritos', 'Cedritos', 4.724, -74.043),
	('nb_bogota_suba', 'city_bogota', 'suba', 'Suba', 4.7416, -74.0826),
	('nb_bogota_teusaquillo', 'city_bogota', 'teusaquillo', 'Teusaquillo', 4.6355, -74.07),
	('nb_cali_ciudad-jardin', 'city_cali', 'ciudad-jardin', 'Ciudad Jardín', 3.375, -76.53),
	('nb_cali_san-fernando', 'city_cali', 'san-fernando', 'San Fernando', 3.433, -76.54),
	('nb_cali_granada', 'city_cali', 'granada', 'Granada', 3.4586, -76.5337),
	('nb_cali_pance', 'city_cali', 'pance', 'Pance', 3.33, -76.545),
	('nb_cali_normandia', 'city_cali', 'normandia', 'Normandía', 3.453, -76.544),
	('nb_cartagena_bocagrande', 'city_cartagena', 'bocagrande', 'Bocagrande', 10.4018, -75.5578),
	('nb_cartagena_manga', 'city_cartagena', 'manga', 'Manga', 10.411, -75.54),
	('nb_cartagena_castillogrande', 'city_cartagena', 'castillogrande', 'Castillogrande', 10.3935, -75.5585),
	('nb_cartagena_centro-historico', 'city_cartagena', 'centro-historico', 'Centro Histórico', 10.4236, -75.551),
	('nb_cartagena_crespo', 'city_cartagena', 'crespo', 'Crespo', 10.445, -75.512),
	('nb_barranquilla_alto-prado', 'city_barranquilla', 'alto-prado', 'Alto Prado', 10.9945, -74.8005),
	('nb_barranquilla_el-prado', 'city_barranquilla', 'el-prado', 'El Prado', 10.9879, -74.7945),
	('nb_barranquilla_riomar', 'city_barranquilla', 'riomar', 'Riomar', 11.012, -74.824),
	('nb_barranquilla_villa-country', 'city_barranquilla', 'villa-country', 'Villa Country', 11.004, -74.82),
	('nb_barranquilla_ciudad-jardin', 'city_barranquilla', 'ciudad-jardin', 'Ciudad Jardín', 10.998, -74.826),
	('nb_santa-marta_el-rodadero', 'city_santa-marta', 'el-rodadero', 'El Rodadero', 11.2036, -74.228),
	('nb_santa-marta_bello-horizonte', 'city_santa-marta', 'bello-horizonte', 'Bello Horizonte', 11.208, -74.22),
	('nb_santa-marta_pozos-colorados', 'city_santa-marta', 'pozos-colorados', 'Pozos Colorados', 11.19, -74.23),
	('nb_santa-marta_centro', 'city_santa-marta', 'centro', 'Centro', 11.242, -74.211);


--
-- Data for Name: PropertyType; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."PropertyType" (id, slug, name, "pluralName", icon, "group", "sortOrder") VALUES
	('type_apartamento', 'apartamento', 'Apartamento', 'Apartamentos', 'apartment', 'residential', 0),
	('type_casa', 'casa', 'Casa', 'Casas', 'house', 'residential', 1),
	('type_apartaestudio', 'apartaestudio', 'Apartaestudio', 'Apartaestudios', 'apartment', 'residential', 2),
	('type_penthouse', 'penthouse', 'Penthouse', 'Penthouses', 'building', 'residential', 3),
	('type_finca', 'finca', 'Finca', 'Fincas', 'farm', 'rural', 4),
	('type_lote', 'lote', 'Lote', 'Lotes', 'land', 'land', 5),
	('type_local', 'local', 'Local comercial', 'Locales comerciales', 'store', 'commercial', 6),
	('type_oficina', 'oficina', 'Oficina', 'Oficinas', 'office', 'commercial', 7),
	('type_bodega', 'bodega', 'Bodega', 'Bodegas', 'warehouse', 'commercial', 8),
	('type_consultorio', 'consultorio', 'Consultorio', 'Consultorios', 'building', 'commercial', 9);


--
-- PostgreSQL database dump complete
--

COMMIT;
