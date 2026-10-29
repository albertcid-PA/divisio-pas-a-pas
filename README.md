# Divisió pas a pas

Aplicació web educativa en català per aprendre i practicar l'algorisme tradicional de la divisió llarga tal com s'escriu habitualment a Espanya.

Web pública: <https://albertcid-PA.github.io/divisio-pas-a-pas/>

## Característiques

- Mode **Aprèn** amb explicacions conceptuals i pistes progressives.
- Mode **Practica** sense guiatge matemàtic, amb nivells graduats.
- Divisors d'una o dues xifres.
- Divisions exactes, amb residu i amb zeros al quocient.
- Entrada accessible amb teclat, ratolí i pantalla tàctil.
- Progrés guardat només al navegador mitjançant `localStorage`.
- Sense comptes, serveis externs ni dades personals.

## Execució local

Cal Node.js 18 o posterior. El projecte no té dependències externes.

```powershell
node --test tests/*.test.mjs
node scripts/serve.mjs
```

Després, obre `http://127.0.0.1:4173`.

## Desplegament

El workflow `.github/workflows/pages.yml` executa totes les proves i publica el contingut de `dist/` a GitHub Pages després de cada canvi a `main`. També es pot executar manualment des de la pestanya **Actions**.

La publicació utilitza únicament GitHub Pages i runners estàndard de GitHub Actions per a un repositori públic.
