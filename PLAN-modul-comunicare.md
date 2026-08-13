# Kommunikációs modul — részletes terv

**Státusz:** terv (kód még nincs) · **Készült:** 2026-08-12
**Kiváltó igény (vezetői idézet):** *„vrem un dashboard cu informatii, comunicatii, pinuri - un fel de google keep integrat"*
**A megoldandó probléma (vezetői idézet):** *„din persoane, echipa se formeaza prin comunicatie… cel mai mare risc se pare, este din lipsa de comunicatie, cum crestem, creste nivelul de informatii, negestionate pe canale, creste haosul"*

**Eldöntött irány:** kontextusba kötött jegyzetek + személyes gyűjtőfelület (nem önálló Keep-klón) · a mai csatorna a WhatsApp · kifelé irányuló értesítés: app-on belüli harang (kötelező) + WhatsApp/Teams-továbbítás (későbbi fázis, lásd 8. pont — komoly korlátokkal).

---

## 1. Diagnózis — mi a valódi hiba

A vezetői megfogalmazás („google keep integrat") egy *eszközt* ír le. A probléma viszont nem az, hogy nincs hol írni — WhatsApp van, ott bárki írhat bármit. A probléma az, hogy **a leírt információnak nincs se címe, se állapota, se felelőse.**

| Ami ma történik | Miért lesz belőle káosz |
|---|---|
| Minden egy WhatsApp-folyamban | Az információnak nincs **címe** — nem derül ki, melyik projektről szól. Két hét múlva nem visszakereshető. |
| „Írtam a csoportba" | Nincs **állapot** — nem tudható, hogy elolvasták-e, egyetértettek-e, megtették-e. |
| Szóban, telefonon, helyszínen | Nincs nyoma. A döntés létezik, de csak két ember fejében. |
| Növekvő projektszám | A hangerő lineárisan nő, a rendezettség nem — ez a „creste haosul" mechanizmusa. |

Ezért **nem** cédulafalat építünk. Egy cédulafal csak új helyre viszi a káoszt: 400 sárga lapocska, cím és felelős nélkül, pontosan ugyanaz a probléma más felületen.

**Vezérelv:** *minden információ kap egy címet (miről szól) és egy állapotot (új / látta / megtette / lezárva).* A „Keep-élmény" ennek a felszíne, nem a lényege.

### A vezetői kérés lefordítva

| Vezetői szó | Amit építünk | Hol jelenik meg |
|---|---|---|
| **informatii** | Aktivitás-folyam: mi változott a rendszerben + mit írtak az emberek | globális feed + projekt-időszalag |
| **comunicatii** | Szálak (jegyzet + válaszok) **entitáshoz kötve** + `@említés` | projekt/matrice/situație aloldal |
| **pinuri** | Kitűzés két szinten: **kontextus-pin** (mindenkinek, a projekt fejlécén) és **személyes pin** (csak nekem, a saját táblámon) | projekt fejléc + „Panoul meu" |
| *(nem kérte, de ez a lényeg)* | **Visszaigazolás** (confirmare de citire) a közleményekre | anunț + „kik látták" lista |

---

## 2. Alapelvek

- **Nincs cím nélküli információ.** Minden jegyzet vagy egy entitáshoz (projekt, matrice-aktivitás, situație, kliens, alvállalkozó, furnizor, dokumentum, csapat) kötődik, vagy explicit **személyes** jegyzet. Nincs harmadik lehetőség — a „lebegő" cédula tiltott.
- **Egy bejövő doboz.** A harang az *egyetlen* hely, ahol valakinek szólunk. A ma működő aviz- és mentenanță-cron e-mailek is ide futnak be, nem csak e-mailbe. Két bejövő doboz = nulla bejövő doboz.
- **A visszaigazolás nem opcionális extra.** A vezető félelme („să nu uităm") csak akkor oldható meg, ha egy közleményről *látszik*, ki nyugtázta és ki nem. E nélkül a modul csak egy szebb WhatsApp.
- **A WhatsApp nem eltűnik, hanem visszakerül a helyére.** Efemer koordinációra („10 perc és ott vagyok") tökéletes. Döntésre, kötelezettségre, határidőre nem. Ez szabálykérdés, nem technológiai (lásd 9. pont).
- **Minden kereshető.** A meglévő globális `/search` feature-be be kell kötni a jegyzeteket. A WhatsApp legnagyobb kára a visszakereshetetlenség — ha ezt nem oldjuk meg, nem oldottunk meg semmit.
- **Tiszta építés, az audit tanulságaival.** Új feature-slice `src/features/comms/`, a szerver akciók **a feature-ben** (`src/features/comms/actions.ts`), nem `src/app/`-ban (AUDIT #27); a szerepkör-ellenőrzés **helperen** keresztül (AUDIT #30, `src/core/auth/permissions.ts`), nem inline `role in (...)`.

---

## 3. Adatmodell

Új táblák a meglévő `projects`, `profiles`, `teams`, `activities`, `project_activity_status`, `situations`, `clients`, `subcontractors`, `suppliers`, `documents` mellé. Minden tábla RLS-védett, `set_updated_at` triggerrel, a bevett `YYYYMMDDNNNNN_` migrációs elnevezéssel (a következő szabad szám: **`20260813000076`**).

### 3.1 `notes` — a tartalmi egység (a „Keep-kártya")

| Mező | Típus | Megjegyzés |
|---|---|---|
| id | bigint PK | |
| kind | `note_kind` enum | `note` · `announcement` · `question` · `decision` · `risk` |
| title | text null | opcionális fejléc (a kártyához) |
| body | text not null | markdown-lite (sortörés, lista, `@említés`) |
| color | text null | Keep-szerű színkód — **csak a design tokenekből** (`accent`/`green`/`orange`/`red`/`primary`/nincs), szabad hex tilos |
| author_id | uuid FK → profiles | `on delete set null` (AUDIT #9 tanulsága) |
| visibility | `note_visibility` enum | `private` · `team` · `project` · `company` |
| status | `note_status` enum | `open` · `resolved` · `archived` |
| parent_id | bigint FK → notes null | válasz → ebből lesz a **szál** |
| due_date | date null | ettől lesz a jegyzetből lágy feladat |
| requires_ack | boolean default false | kell-e visszaigazolás |
| ack_deadline | date null | mire kell nyugtázni |
| **anchor (pontosan egy kitöltve, vagy mind null = személyes)** | | |
| project_id | bigint FK → projects null | `on delete cascade` |
| activity_id | bigint FK → activities null | matrice-sorhoz (a `project_id`-vel együtt = egy cella) |
| situation_id | bigint FK → situations null | |
| client_id / subcontractor_id / supplier_id | bigint FK null | |
| document_id | bigint FK → documents null | |
| team_id | bigint FK → teams null | |
| created_at / updated_at | timestamptz | |

**Miért nem polimorf `entity_type` + `entity_id`?** Mert azzal a Postgres nem tud idegen kulcsot és kaszkádolt törlést adni — projekt törlésekor orphan jegyzetek maradnának. A nullázható FK-k + `check` megkötés („legfeljebb egy anchor van kitöltve; ha `activity_id` van, akkor `project_id` is") drágább oszlopszámban, de referenciálisan helyes — és **ez már a ti bevett mintátok**: a `supplier_invoices` ugyanígy csinálja (`supplier_id` null / `subcontractor_id` null, az egyik kitöltve).

*Fázis 1-ben elég a `project_id`, `activity_id` és a „mind null" (személyes) ág; a többi anchor oszlop mehet később migrációval.*

### 3.2 `note_mentions` — kire szól

`id, note_id FK cascade, profile_id FK cascade, created_at`. Unique `(note_id, profile_id)`.
A `body`-ból a service réteg parse-olja ki (`@nev`), és **a mentés tranzakciójában** írja be — nem kliensoldalon. Ez hajtja a „Pentru mine" nézetet és a harangot.

### 3.3 `note_receipts` — látta / nyugtázta

`note_id + profile_id` összetett PK, `seen_at timestamptz null`, `acknowledged_at timestamptz null`, `created_at`.

Egy tábla két célra: az **olvasatlan-jelvény** (`seen_at is null`) és a **visszaigazolás** (`acknowledged_at`). A `seen_at` a nézet-eseményből íródik (view → upsert), az `acknowledged_at` csak explicit kattintásból („Am citit și am înțeles"). A kettő nem ugyanaz — a vezetőnek a második kell.

### 3.4 `note_pins` — kitűzés

`id, note_id FK cascade, profile_id FK null, pinned_by FK profiles, created_at`. Unique `(note_id, coalesce(profile_id, '00000000-…'))`.

- `profile_id` **kitöltve** → *személyes pin*: megjelenik az én „Panoul meu"-mon.
- `profile_id` **null** → *kontextus-pin*: mindenki látja a projekt fejlécén.

Ez a két-szintű pin a lényegi különbség a Keep-hez képest: a „pin" nem magánügy, hanem a csapat figyelmének irányítása is.

### 3.5 `notifications` — a harang

| Mező | Típus | Megjegyzés |
|---|---|---|
| id | bigint PK | |
| profile_id | uuid FK → profiles | a címzett, `on delete cascade` |
| type | `notification_type` enum | `mention` · `reply` · `ack_required` · `due_soon` · `aviz_expiring` · `maintenance_due` · `vacation_request` · `system` |
| note_id | bigint FK → notes null | `on delete cascade` |
| project_id | bigint FK → projects null | mélylinkhez |
| payload | jsonb | a megjelenítés bemenetei: `{actorName, projectName, snippet, noteKind}` |
| href | text | ahová a kattintás visz |
| read_at | timestamptz null | |
| created_at | timestamptz | |

Index: `(profile_id, read_at, created_at desc)` — ez az egyetlen lekérdezés, amit sűrűn futtatunk.

**Nem tárolunk lefordított szöveget.** A sor `type` + `payload` párosból renderel a UI next-intl-lel — így az értesítés *utólag is* helyes, ha a felhasználó nyelvet vált, és nincs mit újrafordítani a DB-ben. A `profiles.locale` oszlop (ma nem létezik, Fázis 0-ban jön) így nem az app-on belüli megjelenítéshez kell, hanem a Fázis 2 szerveroldali e-mail digestjéhez.

**Nagy nyereség, kevés munkával:** a ma létező `/api/cron/aviz-reminders` és `/api/cron/maintenance-reminders` csak e-mailt küld. Ha ezek **ide is** beírnak egy sort, a harang egyetlen bejövő dobozzá válik, és megszűnik az AUDIT #15 („a harang ikon csali") — a `topbar.tsx` Bell gombja ma `onClick` nélkül van, állandó hamis piros pöttyel.

### 3.6 `activity_events` — az „informatii" folyam (Fázis 3)

`id, actor_id FK profiles null, verb text, project_id null, entity refs…, summary jsonb, created_at`.

Rendszer-események: projekt fázisváltás, matrice-cella státuszváltás, situație véglegesítés, dokumentum-feltöltés, szabadságkérelem. **Postgres triggerekből** írva, hogy semmilyen belépési pont ne kerülhesse ki. A `summary jsonb` a régi/új értéket tartja, hogy a feed-sor lokalizálható legyen (ne előre megírt szöveget tároljunk).

Ez a legnagyobb tábla és a legkönnyebben elszálló hatókör → **külön fázis**, és `created_at` szerinti particionálás vagy 12 hónapos retenció már az induláskor.

### 3.7 `note_attachments` (Fázis 4)

`id, note_id, file_name, drive_item_id, web_url, size_bytes, uploaded_by, created_at`.
**Ne** legyen új Supabase Storage bucket — a projektek fájljai már OneDrive/SharePointon élnek a `src/core/microsoft/folderProvider.ts`-en keresztül. A csatolmány egy hivatkozás a meglévő projektmappába, nem másolat. (Előfeltétel: AUDIT #32, a törött `linkProjectFolder`.)

---

## 4. Kapcsolat a meglévő rendszerrel

- **`project_activity_status.note`** — a matrice cellának **ma is van** egy egysoros jegyzet mezője, és a `MatriceCell.tsx` egy 12px-es gemkapcsot rajzol hozzá. Ezt **nem bontjuk el**: a rövid cellajegyzet marad, ahol van, és mellé kerül egy „Discuție" gomb, ami `notes`-szálat nyit `project_id + activity_id` anchorral. (A gemkapocs 12px-es érintési célpontja egyébként AUDIT-hiba — itt javítható 32px+-ra.)
- **`projects`** → új „Comunicare" fül a részletoldalon; a kontextus-pinek a projekt fejlécén.
- **`teams` / `projects.team_id` / `projects.manager_id`** → ezek adják a `project` és `team` láthatóság feloldását. Végre valódi funkciót kap a ma dísznek használt `teams` szerkezet.
- **`situations`, `documents`, `clients`, `subcontractors`, `suppliers`** → anchor-célpontok, ugyanazzal a szál-komponenssel (egy `<NoteThread anchor={…} />`, minden aloldalon újrahasznosítva).
- **`/search`** (`src/features/search`) → a `notes.body` és `title` bekötése a globális keresésbe. **Ez a modul legfontosabb, legkevésbé látványos része.**
- **`profiles.role`** → a szerepkörök ma viselkedésileg mind viewerek (AUDIT #6). A közlemény-írás joga az első hely, ahol ez tényleg számít.
- **Kliens állapot**: `zustand` már benne van a `package.json`-ban — az olvasatlan-számláló és a compose-drawer state ide való, ne új könyvtárat hozzunk be.

---

## 5. RLS és szerepkörök

A jegyzet érzékeny adat lehet (privát feljegyzés, alvállalkozói probléma, bérkérdés). **Semmiképp `using (true)`.**

**Security-definer helper: `can_read_note(n notes)`** — igaz, ha bármelyik teljesül:

1. `author_id = auth.uid()` (a sajátom, mindig)
2. létezik `note_mentions` sor rám (ha megemlítettek, láthatom — akkor is, ha `private`)
3. `visibility = 'company'` és a felhasználó authentikált
4. `visibility = 'team'` és `team_id` = az én `profiles.team_id`-m
5. `visibility = 'project'` és a `project_id` projektben érintett vagyok: `manager_id = auth.uid()` VAGY a projekt `team_id`-je az én csapatom VAGY `admin`
6. `admin` szerep → mindent olvas

**Írás:**
- `insert`: bármely authentikált felhasználó, `author_id = auth.uid()` kényszerítve (nem a kliens küldi).
- `update` / `delete`: csak a szerző, VAGY `admin`. A `status = 'resolved'` váltás enged szélesebb kört: aki olvashatja a szálat, zárhatja is (különben minden kérdés örökre nyitva marad, ha a szerző szabadságon van).
- `kind = 'announcement'` + `visibility = 'company'` létrehozása: **csak `admin` vagy `project_manager`** — új helper: `can_broadcast()`. Enélkül minden „közlemény" lesz, és három hét alatt megtanulják figyelmen kívül hagyni.

**`note_receipts`:** mindenki csak a **saját** sorát írhatja (`profile_id = auth.uid()`). Olvasni a szerző és az admin látja az összes sort — ebből lesz a „kik nyugtázták" lista.

**`notifications`:** olvasás/frissítés (`read_at`) csak a sajátomra. Beszúrás **kizárólag** trigger vagy service-role kulcs (a felhasználó nem gyárthat magának/másnak értesítést).

> Az AUDIT-ban két kritikus RLS-hiba is abból jött, hogy a policy megengedőbb volt, mint a szándék (`pas_write`, `profiles` role). Itt a policykat **a migrációval együtt, teszt-userrel** ellenőrizzük, nem utólag.

---

## 6. Felületek

### 6.1 `Panoul meu` — az új menüpont (`/(app)/board`)

Ez az, amit a vezető „google keep"-ként fog felismerni. **Masonry kártyarács**, lapos `bg-card` + `border-border`, gradiens és blur nélkül.

> A `DESIGN-SYSTEM.md` „dark mode only"-t ír, de a topbarban **van** `ThemeSwitcher` — tehát világos mód is él. A kártyaszínek (`color` mező) **mindkét témában** ellenőrizendők; az AUDIT #20 szerint a világos mód státusz-kontrasztja ma megbukik. Ne vezessünk be új színeket, csak a meglévő tokeneket használjuk.

- **Felső sáv — „Pentru mine":** olvasatlan említések · nyugtázásra váró közlemények · ma/holnap lejáró `due_date`-ek. Ha ez a sáv üres, a nap rendben van. Ez a modul legfontosabb 200 pixele.
- **Kártyarács:** a személyes pinek elöl, aztán a legutóbbi releváns jegyzetek. A kártya mutatja az **anchort** („PROIECT · Sânnicolau 5MW" / „MATRICE · Aviz ANRE"), a `kind` jelvényt, a szerzőt, a válaszok számát.
- **Szűrők:** típus (`kind`), projekt, szerző, csak olvasatlan, csak nyitott, dátum.
- **Compose:** egyetlen gomb → drawer. **Az anchor kötelező** mező (az alap „Personal", de akkor is választani kell) — a mezősorrend maga a fegyelem.
- **Nyelv és formázás:** a `defaultLocale` ma `hu` egy román cégnél, és 8 helyen bedrótozott `hu-HU` számformázás van (AUDIT #7). Az új modul a központosított `intl` helpert használja, ne szaporítsuk a hibát.

### 6.2 Harang a topbarban

Dropdown, csoportosítva (Ma / Ezen a héten / Régebbi), soronként típus-ikon + mélylink, „mind olvasottnak" gomb, olvasatlan-számláló a jelvényen. Fázis 1-ben **60 másodperces polling** — egyszerű, kiszámítható. A Realtime a Fázis 4.

### 6.3 Projekt részletoldal → „Comunicare" fül

- Kitűzött jegyzetek a fül tetején (kontextus-pinek).
- Szál-lista (`kind` szűrővel): kérdések, döntések, kockázatok külön is szűrhetők.
- **Időszalag** (Fázis 3): a `notes` és az `activity_events` egy folyamban, időrendben — „mi történt ezen a projekten".

### 6.4 `Anunțuri` — közlemények (`/(app)/announcements`)

Lista + részletnézet. A részletnézet alján a **nyugtázási tábla**: ki látta, ki nyugtázta, ki nem — a hiányzók külön kiemelve, „emlékeztető küldése" gombbal. Ez a vezetői kérés („să nu uităm") konkrét megvalósulása; e nélkül a modul nem oldja meg a felkérést.

### 6.5 Beszúrt szál-komponens

Egy `<NoteThread anchor={{ projectId, activityId, … }} />`, amit a matrice cella popover, a situație, a dokumentum és a kliens aloldal is ugyanígy használ. **Egy komponens, hat helyszín** — ez a különbség a „modul" és a „hat félkész funkció" között.

### 6.6 Navigáció

Új nav-csoport, mert a mai „MENIU PRINCIPAL" 9 elemmel már túl lapos (AUDIT #6):

```
COMUNICARE
  · Panoul meu        (/board)
  · Anunțuri          (/announcements)
```

Ugyanebben a lépésben érdemes elvégezni az AUDIT #16-ot (a kész `documents` és `settings` bekötése, `startsWith` aktív állapot, szerepkör-szűrés) — ugyanaz a fájl, ugyanaz a fél óra.

**i18n:** új `comms` névtér mindhárom fájlba (`messages/ro.json`, `hu.json`, `en.json`). A meglévő használatlan nav-kulcsok (`work`, `system`, `delivery`, `site`, `pontaj`, `overview`) egy félbehagyott IA nyomai — vagy vegyük használatba, vagy töröljük őket, ne szaporítsuk.

---

## 7. Mobil — nem opcionális

Az `outfield_worker` az a személy, akinek a legkevésbé van hangja ma, és aki a legtöbb terepi információt birtokolja. Az AUDIT #4 szerint az app telefonon gyakorlatilag használhatatlan (13 oszlopos táblák, nulla reszponzív oszlopelrejtés, 28px-es érintési célpontok).

**Egy kommunikációs modul, ami csak asztali gépen működik, pontosan azokat zárja ki, akiktől az információ jön.** Ezért Fázis 1-ben:

- a „Panoul meu" **mobil-első** (egy hasábos kártyalista 375px-en),
- érintési célpontok min. 44px,
- a compose drawer teljes képernyős telefonon,
- semmilyen információ **nem** kerülhet `title=` attribútumba (66 ilyen van ma az appban — érintésen soha nem jelenik meg).

---

## 8. Kifelé irányuló értesítés — és egy fontos korlát

Az „app-on belüli harang" el van döntve. A „továbbítás WhatsAppra" viszont **nem valósítható meg úgy, ahogy elsőre logikus lenne** — ezt érdemes a vezetői egyeztetés előtt tudni.

### A WhatsApp-korlát (2026. augusztusi állapot)

- A Meta **Groups API** ma már általánosan elérhető, de: **max. 8 résztvevő** csoportonként, **Official Business Account (OBA)** szükséges, és a cég **csak saját, API-val létrehozott csoportokba** tud küldeni — **a ti meglévő WhatsApp-csoportjaitokba nem tud belépni és nem tud posztolni.**
- 1:1 üzenet küldése működik, de: előre **jóváhagyott sablon** (template) kell a 24 órás ablakon kívül, **opt-in** szükséges, és **üzenetenkénti díjszabás** van.
- Ami *működne*: egy 8 fős szerelőbrigádnak a rendszer **létrehoz** egy projekt-csoportot invite linkkel, és abba küld. Ez véletlenül jól illik egy szereléscsapat méretéhez — de új csoport, nem a mostani.

**Következtetés:** a WhatsApp-továbbítás nem „egy nap munka", hanem OBA-igénylés + sablon-jóváhagyás + üzenetenkénti költség. Nem tiltó, de nem is Fázis 1.

### Ajánlott sorrend kifelé

| Csatorna | Ráfordítás | Mikor |
|---|---|---|
| **App-on belüli harang** | benne van a Fázis 1-2-ben | most |
| **E-mail digest** (Resend már konfigurált, cron-minta már létezik) | ~1 nap | Fázis 2 |
| **Microsoft Teams bejövő webhook / Power Automate** | ~fél nap, ingyenes, a Graph már be van kötve | Fázis 2 — messze a legjobb ár/érték |
| **WhatsApp 1:1 sablon** a 3-4 valóban kritikus riasztásra (lejáró aviz, nyugtázandó közlemény) | OBA + sablonok + díj | Fázis 4, ha van OBA |
| **PWA push** | service worker + web-push | Fázis 4 |

*Megjegyzés:* a Teams app-only csatorna-posztolás Graph-jogosultsága szűk; a gyakorlati út a webhook/Power Automate. Ezt implementáció előtt konkrétan ellenőrizni kell a ti tenant-beállításaitokkal.

---

## 9. A modul másik fele: működési szabályok

**Ez a terv 40%-a technológia és 60%-a szokás.** Ha csak a felületet építjük meg, három hét után visszaáll a WhatsApp, és a vezető joggal mondja majd, hogy „az app nem segített". A bevezetéssel együtt kell kihirdetni:

1. **Ha nincs az appban, nem történt meg.** Döntés, kötelezettség, határidő, kockázat — ezek nem WhatsApp-műfajok.
2. **Minden információnak van címe.** Nincs cím nélküli jegyzet (a személyes kivételével). A felület ezt kikényszeríti.
3. **A WhatsApp megmarad — az efemer koordinációra.** „Mikor jön a daru", „10 perc". Ez legitim és hatékony; nem kell kivezetni.
4. **Minden közleménynek van felelőse és határideje.** `requires_ack` + `ack_deadline`. Nyugtázás nélkül a közlemény nyitva marad, és látszik, kinél.
5. **Napi 5 perc.** A műszak elején mindenki megnyitja a „Pentru mine" sávot. Ha üres, kész.
6. **Heti 15 perc.** A projektvezetői körben átmegyünk a 7 napnál régebben nyitott `question` és `risk` jegyzeteken. Ez a rituálé, ami életben tartja a rendszert.

### Hogyan mérjük, hogy működik-e

Ne az elégedettséget kérdezzük, hanem ezt a négy számot (a Fázis 3 dashboardján):

- **Nyugtázási arány 24 órán belül** — a fő szám. Cél: >80%.
- **7 napnál régebben nyitott kérdések száma** — ha nő, a rendszer nem működik, csak gyűlik.
- **Jegyzetet tartalmazó aktív projektek aránya** — ha egy projekt egy hónapig csendes, az nem béke, az árnyék-csatorna.
- **Rendszerben rögzített döntések száma** (`kind = 'decision'`) — ez a „nem tudtam róla" viták tényleges gyógyszere.

---

## 10. Fázisokra bontás

### Fázis 0 — előfeltételek (~fél nap)

Nem építünk értesítést hamis harangra és inline szerepkör-ellenőrzésre.

- `src/core/auth/permissions.ts` — **ma nem létezik** (`src/core/auth/` nincs); a szerepkör-check 19 helyre szórva (AUDIT #30). Kiemelés + új helper: `can_broadcast()`.
- `topbar.tsx:33-40` Bell: a gomb ma **`onClick` nélkül** van, alatta egy állandó `bg-[var(--v-warning)]` pötty, ami semmilyen state-hez nincs kötve. A pötty ki, a gomb valódi olvasatlan-számra kötve.
- `profiles.locale` oszlop — **ma nincs** (nulla `locale` találat a migrációkban). Enélkül a rendszer-generált értesítés nem lokalizálható a címzett nyelvére.

*Amit az augusztus 3-i audit még hiányolt, de közben elkészült:* a `sonner` `Toaster` már be van kötve (`AppShellClient.tsx:67`) és 10+ helyen használt, és a `loading.tsx` skeletonok is megvannak. Ezekkel nincs teendő — az új modul egyszerűen kövesse a már meglévő mintát.

### Fázis 1 — Jegyzetek, szálak, pinek, személyes panel (~1-1,5 hét)

Migráció `…000076`: `notes` (+enumok, `check` az anchorra), `note_mentions`, `note_receipts`, `note_pins`, **`notifications`**, `can_read_note()` + `can_broadcast()` helper, policyk, `fn_notify_on_note()` trigger.
Felület: `Panoul meu` + `<NoteThread>` a projekt „Comunicare" fülén és a matrice cellán + **harang (60 s polling)** + `/search` bekötés + `comms` i18n névtér + nav-csoport.
**Eredmény:** minden információnak van címe és kereshető. Ez az, amit a vezető „Keep"-nek fog látni.

> **A `notifications` tábla szándékosan már itt jön létre**, `mention` és `reply` eseményekkel — így a harangot nem kell kétszer megírni (először származtatott számlálóval, aztán tábla-alapon). A Fázis 2 nem új táblát hoz, hanem **új termelőket** kapcsol rá.

### Fázis 2 — Közlemények, visszaigazolás, rendszer-értesítések (~1 hét)

Új termelők a `notifications`-ra: `ack_required`, `due_soon`, és a meglévő aviz- és mentenanță-cron **is** beír (nem csak e-mailbe).
`requires_ack` + nyugtázási tábla + `/announcements`. E-mail digest Resenddel (itt kell a `profiles.locale`). Teams webhook.
**Eredmény:** egy bejövő doboz, és mérhető, ki tud miről. **Innentől oldja meg a modul a vezetői problémát** — a Fázis 1 önmagában még csak rendezettség.

### Fázis 3 — Aktivitás-folyam („informatii") (~1 hét)

`activity_events` + triggerek (`projects`, `project_activity_status`, `situations`, `documents`, `vacation_requests`), projekt-időszalag, globális feed szűrőkkel, kommunikációs mutatók (a 9. pont négy száma), 12 hónapos retenció.

### Fázis 4 — Realtime, csatolmányok, kimenő csatornák (~1 hét)

Supabase Realtime a `notifications`-ra és a nyitott szálakra (a polling helyett) · OneDrive-csatolmányok · PWA push · WhatsApp 1:1 sablonok, ha lett OBA.

**Összesen: kb. 4-5 hét fejlesztés.** Az első két fázis (2-2,5 hét) után már mérhető a hatás — a Fázis 3-4 nélkül is működő rendszer.

---

## 11. Eldöntendő kérdések

1. **Ki jogosult cégszintű közleményt kiadni?** Javaslat: `admin` + `project_manager`. Ha mindenki, a közlemény elveszti a súlyát.
2. **Privát jegyzetet lát-e az admin?** Javaslat: **nem** (a fenti RLS így van megírva). Jogilag és bizalmilag tisztább; ha kell audit-hozzáférés, azt írjuk le explicit szabályként, ne rejtsük policybe.
3. **Törölhető-e egy jegyzet, vagy csak archiválható?** Javaslat: a szerző 15 percen belül törölhet, utána csak `archived`. Egy kommunikációs napló értéke a megbízhatóságában van.
4. **Nyugtázás alapértelmezése.** Javaslat: `announcement` → alapból `requires_ack = true`; minden más típus → false.
5. **A matrice cellajegyzet sorsa.** A tervben megmarad az egysoros jegyzet, és mellé jön a szál. Alternatíva: migráljuk a meglévő cellajegyzeteket `notes` sorokká, és a mezőt elhagyjuk. Melyik? (Az első kevesebb rizikó, a második tisztább adatmodell.)
6. **Retenció.** `activity_events`: 12 hónap után törlés vagy archív tábla? `notes`: soha ne töröljük automatikusan.
7. **Nyelv.** A jegyzetek nyilván románul íródnak. A rendszer-generált feed-sorok és értesítések a címzett `profiles.locale`-ja szerint lokalizáltak — ehhez kell egy `profiles.locale` mező, ha még nincs.
8. **Kivezetjük-e a WhatsAppot valamiről explicit?** Javaslat: igen, egyetlen dologról — **döntésekről és határidőkről**. Mindenről egyszerre nem fog menni, és ha megpróbáljuk, semmiről nem fog.

---

## Források (WhatsApp-korlátok)

- [WhatsApp Groups API — Meta for Developers](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups)
- [Group messaging — Meta for Developers](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups/groups-messaging)
- [WhatsApp Business API Pricing 2026 — per-message rates](https://setsmart.io/blog/whatsapp-business-api-pricing)
