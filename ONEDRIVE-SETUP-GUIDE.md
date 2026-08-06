# OneDrive integráció — beállítási útmutató (lépésről lépésre)

Ez az útmutató végigvezet, hogyan szerezd meg az öt környezeti változót, ami
kell az OneDrive/SharePoint kapcsolathoz. Minden lépésnél jelezve van, **melyik
változót** kapod meg belőle.

**Előfeltétel:** Microsoft 365 **admin** hozzáférés (a jogosultság-jóváhagyáshoz).

## Amit a végén össze kell gyűjtened

| Változó | Honnan (melyik lépés) |
|---|---|
| `AZURE_TENANT_ID` | A lépés — App Overview |
| `AZURE_CLIENT_ID` | A lépés — App Overview |
| `AZURE_CLIENT_SECRET` | B lépés — Client secret |
| `ONEDRIVE_DRIVE_ID` | D lépés — Graph Explorer |
| `ONEDRIVE_PROJECTS_FOLDER_ID` | E lépés — Graph Explorer |

## Összegyűjtött értékek (2026-08-05)

A tenant `veltol.sharepoint.com`, a fő site „Site de comunicare"
(`https://veltol.sharepoint.com`), a dokumentumtár „Documente" (Documente partajate),
benne a „Proiecte" mappa (`/Documente partajate/Proiecte`).

| Változó | Érték | Állapot |
|---|---|---|
| `AZURE_TENANT_ID` | (app Overview → Directory (tenant) ID) | ✅ megvan |
| `AZURE_CLIENT_ID` | (app Overview → Application (client) ID) | ✅ megvan |
| `ONEDRIVE_DRIVE_ID` | `b!BHwI0BebiEuPJbsEhRZh6cKZquiFOiRGkBsn8QzOHpewt-j6PQAlRJKPASy2Lh6F` | ✅ megvan |
| `ONEDRIVE_PROJECTS_FOLDER_ID` | `01IZGJHLNJVDV5JFNTYZE3HBINCGOCN6MM` | ✅ megvan |
| `AZURE_CLIENT_SECRET` | — | ❌ blokkolva (tenant policy) → lásd lentebb |

> ⚠️ A `AZURE_CLIENT_SECRET`-et (és tanúsítványos útnál a privát kulcsot) SOHA
> ne ide, ebbe a fájlba írd — csak a Vercel env-be, titkosként. A fenti ID-k
> nem titkosak (azonosítók), ezek maradhatnak itt referenciának.

### Hátralévő: client secret blokkolva
A tenant-szintű „Block password addition" policy tiltja a secret létrehozását.
Feloldás: az adminod kivételt ad erre az appra (Entra → Enterprise apps →
Application policies → „Block password addition" → „All applications with
exclusions" → az app hozzáadása). Alternatíva: tanúsítvány-alapú auth (nem kell
kivétel, de kódváltozással jár — `@azure/msal-node`).

---

## A. App-regisztráció → `AZURE_TENANT_ID` + `AZURE_CLIENT_ID`

1. Menj a **https://entra.microsoft.com** oldalra, jelentkezz be adminként.
2. Bal oldalt: **Identity → Applications → App registrations → + New registration**.
3. Név: pl. `Veltol Project Management`.
   Account type: **„Accounts in this organizational directory only (single tenant)"**.
   → **Register**.
4. Az **Overview** oldalon másold ki:
   - **Application (client) ID** → ez az `AZURE_CLIENT_ID`
   - **Directory (tenant) ID** → ez az `AZURE_TENANT_ID`

## B. Client secret → `AZURE_CLIENT_SECRET`

1. Az appon belül: **Certificates & secrets → Client secrets → + New client secret**.
2. Adj leírást, lejárat 12–24 hónap → **Add**.
3. **AZONNAL** másold ki a **Value** oszlop tartalmát (NEM a „Secret ID"-t!)
   → ez az `AZURE_CLIENT_SECRET`.
   Ha elnavigálsz az oldalról, többé nem látszik — akkor újat kell csinálni.
   ⚠️ Tegyél be egy naptár-emlékeztetőt a lejáratra (a secret lejár, cserélni kell).

## C. Jogosultság + admin jóváhagyás

1. **API permissions → + Add a permission → Microsoft Graph → Application permissions**.
2. Keress rá: `Sites` → válaszd a **`Sites.ReadWrite.All`**-t (egyszerűbb),
   vagy a szűkebb `Sites.Selected`-et (ez extra lépést igényel — lásd a megjegyzést).
   → **Add**.
3. Kattints a **„Grant admin consent for [cég]"** gombra → igen.
   Zöld pipáknak kell megjelenniük a jogosultságok mellett.

> Biztonsági megjegyzés: a `Files.ReadWrite.All` az egész tenant összes fájljához
> ad írási jogot. Kisebb kockázat egy dedikált **SharePoint dokumentumtár** a
> `Sites.Selected` jogosultsággal, csak arra a site-ra szűkítve. A `Sites.Selected`
> viszont külön Graph-hívással engedélyezést igényel a konkrét site-ra — első
> körben a `Sites.ReadWrite.All` a gyorsabb, később szűkíthető.

## D. Drive ID → `ONEDRIVE_DRIVE_ID`

Ehhez a **Graph Explorer** a legegyszerűbb:
https://developer.microsoft.com/en-us/graph/graph-explorer

Jelentkezz be **ugyanazzal a céges fiókkal** (jobb felül „Sign in").

1. Először a site ID-t. A címsorba írd be (a `veltol.sharepoint.com`-ot és a site
   nevét cseréld a tiédre — a SharePoint böngésző-URL-jéből látszik):
   ```
   GET https://graph.microsoft.com/v1.0/sites/veltol.sharepoint.com:/sites/Projects
   ```
   Futtasd („Run query"). A válaszból másold ki az **`id`** mezőt
   (ilyesmi: `veltol.sharepoint.com,<guid>,<guid>`).

2. Most a drive-okat:
   ```
   GET https://graph.microsoft.com/v1.0/sites/{az-előbbi-id}/drives
   ```
   A válaszban keresd meg a dokumentumtárat (általában „Documents" / „Documente"),
   és másold ki annak az **`id`**-ját → ez az `ONEDRIVE_DRIVE_ID`.

> Ha a Graph Explorer 403-at ad: a bal oldali „Modify permissions" fülön
> engedélyezd a `Sites.Read.All`-t a saját bejelentkezésedhez. Ez független az
> app jogosultságától — csak ahhoz kell, hogy te le tudd kérdezni az ID-kat.

## E. Szülőmappa ID → `ONEDRIVE_PROJECTS_FOLDER_ID`

1. Listázd a tár gyökerét:
   ```
   GET https://graph.microsoft.com/v1.0/drives/{ONEDRIVE_DRIVE_ID}/root/children
   ```
2. Keresd meg azt a mappát, ahová a projektmappák kerüljenek
   (pl. „Proiecte" / „Projects"), és másold ki az **`id`**-ját
   → ez az `ONEDRIVE_PROJECTS_FOLDER_ID`.

   *(Ha még nincs ilyen mappa, hozd létre SharePoint-ban, majd futtasd újra a
   lekérdezést.)*

## F. Beírás a Vercelbe

**Vercel → a projekt → Settings → Environment Variables**, add hozzá mind az ötöt,
**Production ÉS Preview** környezetre is.

- A `.env.production`-t a Vercel **nem** tölti fel — a dashboard-értékek számítanak.
- Az `AZURE_CLIENT_SECRET`-et kezeld titkosként.
- ⚠️ Csak akkor kapcsol élesbe, ha MIND az öt változó megvan. Ha bármelyik
  hiányzik, az app csendben teszt módban marad (lokális mappát hoz létre).

---

## Hátralévő kódjavítás (fejlesztői feladat)

Miután megvan mind az öt változó, a **„meglévő mappa linkelése"** funkció még nem
fog működni élesben, mert a `linkProjectFolder` (`src/app/[locale]/(app)/projects/actions.ts`)
üres tokent küld:

```ts
{ headers: { Authorization: `Bearer ` } } // token would be fetched via getGraphToken
```

Javítás: emeld ki a `getGraphToken()`-t egy közös `src/core/microsoft/graph.ts`-be,
exportáld, és használd a `linkProjectFolder`-ben is.

**Fontos:** az ÚJ projektmappa létrehozása enélkül is működik — csak a meglévő
mappa share-linkkel való összekötése nem, amíg ez nincs javítva.

---

## Két eldöntendő kérdés

1. **SharePoint dokumentumtár vagy személyes OneDrive?**
   App-only auth személyes OneDrive-hoz csak az adott user drive-id-jével fér hozzá
   — szinte mindig SharePoint-tár a jó választás (megosztott, stabil).

2. **Kell fájlfeltöltés az appból?**
   Jelenleg a dokumentumok csak metaadat + beillesztett URL-ként tárolódnak
   (nincs Graph-upload). Ha a linkelés elég, kész; ha feltöltés is kell, az külön
   fejlesztés.
