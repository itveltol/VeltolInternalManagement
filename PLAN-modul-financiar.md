# Pénzügyi modul — részletes terv

**Státusz:** terv (kód még nincs) · **Készült:** 2026-08-03
**Döntések:** teljes modul egy koherens adatmodellben · a könyvelés külön szoftverben marad (SAGA/WinMentor/SmartBill), az app a számlákat **tükrözi** (AR/AP állapot, fizetettség, retenció), nem ő állítja ki őket.

---

## 1. Cél és alapelvek

A rendszer ma tudja, hogy egy projekt *hol tart* (matrice, Gantt, checklist), de nem tudja, hogy *nyereséges-e*. A pénzügyi modul ezt a vakfoltot szünteti meg: projektenként és portfólió-szinten láthatóvá teszi a **bevételt, a költséget és a margót** — terv, elkötelezett és tényleges bontásban.

Alapelvek:

- **A könyvelés a hiteles forrás a fiskális számlára.** Az app nem ad ki adóügyi számlát; a számla adatait (szám, összeg, ÁFA, fizetettség) *tükrözi* a könyvelő szoftverből (kézi rögzítés → CSV import → API a fázisok szerint). Ez elkerüli a kettős könyvelést és a jogi kockázatot.
- **Az app a projekt-kontrolling forrása.** A deviz (terv), a megrendelések (elkötelezettség), és a margó-számítás itt él — ezt a könyvelő szoftver nem tudja projekt-dimenzióban.
- **Deviza-tudatosság a meglévő konvenció szerint.** Minden pénzügyi tábla `currency` (a felhasználó által beírt forrás) + `conversion_rate` (a létrehozáskor rögzített EUR/RON, a `exchange_rates` BNR-cache-ből) párost kap. A történelmi sorok átváltott értéke soha nem számolódik újra „mai" árfolyammal — pontosan úgy, ahogy a `projects`/`situations` már csinálja.
- **Az ÁFA konfigurálható.** Számlánként (vagy soronként) `vat_rate` + `vat_amount`. Alapérték a standard 21% (2026), de nem bedrótozva — a kedvezményes 11% és az átmeneti 9% is előfordul.
- **Egy jelentési deviza a gördítéshez.** A portfólió-szintű összesítés egyetlen devizára (javaslat: EUR, mert az az elsődleges mező) normalizál, a soronként rögzített `conversion_rate`-tel.

---

## 2. A margó-modell (a modul lelke)

Minden projektre öt „pénz-állapot", két oldalon:

### Bevétel-oldal
| Fogalom | Forrás | Képlet |
|---|---|---|
| **Valoare contract** (szerződéses érték) | `projects.value_*` + jóváhagyott `change_orders` | alap + Σ act adițional |
| **Facturat** (kiszámlázva) | `client_invoices` | Σ nettó (vagy bruttó) kiadott számla |
| **Încasat** (befolyt) | `payments` (in) | Σ befolyt |
| **De încasat** (kintlévőség, AR) | számított | Facturat − Încasat |

### Költség-oldal
| Fogalom | Forrás | Jelentés |
|---|---|---|
| **Buget** (deviz / terv) | `project_budget_lines` | tervezett költség kategóriánként (a projekt indulásakor) |
| **Angajat** (elkötelezett) | `purchase_orders` + alvállalkozói szerződések (`project_subcontractors`) | leszerződött, de még nem feltétlenül kifizetett |
| **Realizat** (tényleges) | `supplier_invoices` (furnizori + alvállalkozói) + manoperă | tényleg beérkezett költségszámlák + munkaerő |
| **Estimare până la final** (ETC) | számított | Buget vagy Angajat − Realizat, a maradékra |
| **Prognoză la final** (EAC) | Realizat + ETC | várható végösszköltség |

### Margó (három szinten)
- **Marjă bugetată** = Valoare contract − Buget
- **Marjă angajată** = Valoare contract − Angajat
- **Marjă prognozată** = Valoare contract − Prognoză la final ← *ez a legfontosabb vezetői szám*

A margó %-ban is: `marjă / valoare contract`. Portfólió-szinten egy küszöb alatti margó piros zászló.

---

## 3. Adatmodell

Új táblák (a meglévő `projects`, `clients`, `subcontractors`, `project_subcontractors`, `situations`, `exchange_rates` mellé). Minden tábla RLS-védett, `set_updated_at` triggerrel, a projekt-scope-os olvasási szabállyal (lásd 5. pont).

### 3.1 `cost_categories` — költségkategóriák (referencia, seedelt)
| Mező | Típus | Megjegyzés |
|---|---|---|
| id | bigint PK | |
| code | text unique | pl. `equipment`, `labor`, `subcontractor`, `transport`, `machinery`, `permits`, `other` |
| name_ro / name_hu / name_en | text | megjelenítéshez |
| sort_order | int | |

Kezdő készlet napelemes EPC-re: **Echipamente** (panel, invertor, structură, cabluri, trafo, BESS, protecții), **Manoperă**, **Subcontractori**, **Transport & logistică**, **Utilaje/închiriere**, **Avize & taxe**, **Diverse/neprevăzute**.

### 3.2 `project_budget_lines` — deviz (tervezett költség)
| Mező | Típus | Megjegyzés |
|---|---|---|
| id | bigint PK | |
| project_id | bigint FK → projects | on delete cascade |
| cost_category_id | bigint FK → cost_categories | |
| phase_no | int null | opcionális kötés a matrice fázishoz |
| description | text | |
| qty | numeric | mennyiség |
| unit | text | buc, ml, kWp, … |
| unit_price | numeric | egységár |
| currency | text | 'EUR'/'RON' |
| conversion_rate | numeric | rögzítve létrehozáskor |
| amount | numeric | = qty × unit_price (generált vagy service-ben számolt) |
| created_by | uuid FK → profiles | on delete set null |
| created_at/updated_at | timestamptz | |

Ez a **költség-alapvonal** (baseline budget). A margó-számítás „Buget" oszlopa innen jön.

### 3.3 `suppliers` — furnizori (eszköz-/anyagbeszállítók)
Külön az alvállalkozóktól (`subcontractors`), mert más a szerep (anyag vs. munka) és külön kell riportálni. Szerkezete a `clients`/`subcontractors` mintájára:
`id, name, cui, reg_com (J-szám), contact_person, email, phone, address, iban, notes, timestamps`.

### 3.4 `purchase_orders` + `purchase_order_lines` — comenzi de achiziție (PO)
`purchase_orders`: `id, project_id, supplier_id, po_number, status (draft/sent/confirmed/partially_received/received/cancelled), order_date, expected_delivery, currency, conversion_rate, notes, created_by, timestamps`.

`purchase_order_lines`: `id, purchase_order_id, cost_category_id, description, qty, unit, unit_price, amount, received_qty, timestamps`.

A PO adja az **„Angajat"** (elkötelezett) érték egy részét. A hosszú átfutású tételek (trafó, BESS) `expected_delivery` mezője beköthető a Gantt kritikus útjába.

### 3.5 `supplier_invoices` — facturi furnizori (AP, tükrözött)
A **tényleges költség** fő forrása. A könyvelésből tükrözve.
| Mező | Típus | Megjegyzés |
|---|---|---|
| id | bigint PK | |
| project_id | bigint FK | |
| supplier_id | bigint FK null | furnizor VAGY |
| subcontractor_id | bigint FK null | alvállalkozó (az egyik kitöltve) |
| purchase_order_id | bigint FK null | ha PO-hoz köthető |
| cost_category_id | bigint FK | |
| external_invoice_number | text | a könyvelési számla száma |
| invoice_date / due_date | date | |
| net_amount / vat_rate / vat_amount / gross_amount | numeric | |
| currency / conversion_rate | | |
| status | text | received/approved/paid/partially_paid |
| paid_amount | numeric | fizetettség (a könyvelésből) |
| external_ref / source | text | link/azonosító a könyvelő rendszerhez |
| created_by, timestamps | | |

### 3.6 `client_invoices` — facturi clienți (AR, tükrözött)
| Mező | Típus | Megjegyzés |
|---|---|---|
| id | bigint PK | |
| project_id | bigint FK | |
| client_id | bigint FK | |
| situation_id | bigint FK null | kötés a situație de lucrări-hoz |
| external_invoice_number | text | |
| invoice_date / due_date | date | |
| net_amount / vat_rate / vat_amount / gross_amount | numeric | |
| currency / conversion_rate | | |
| retention_pct / retention_amount | numeric | garanție de bună execuție (visszatartás) |
| retention_released_at | date null | mikor engedték fel |
| status | text | issued/partially_paid/paid/overdue/cancelled |
| paid_amount | numeric | |
| external_ref / source | text | |
| created_by, timestamps | | |

A `situation_id` köti össze a haladási elszámolást (situație) a tényleges kiadott számlával. Az **AR** = Σ gross − Σ paid.

### 3.7 `payments` — încasări / plăți (cash-flow)
Egy tábla mindkét irányra, hogy a cash-flow pontos legyen:
`id, direction ('in'/'out'), project_id, client_invoice_id null, supplier_invoice_id null, amount, currency, conversion_rate, payment_date, method (transfer/cash/…), reference, notes, timestamps`.

(Alternatíva: csak a számlák `paid_amount` mezője. A külön `payments` tábla viszont kell a havi cash-flow előrejelzéshez és a részletfizetésekhez.)

### 3.8 `change_orders` — acte adiționale / dispoziții de șantier
`id, project_id, co_number, description, value_delta (±), currency, conversion_rate, status (proposed/approved/rejected), affects_deadline_days int, approved_by uuid, approved_at, created_by, timestamps`.

A jóváhagyott change order **módosítja a Valoare contract**-ot. Így a hatókör-bővülés nyoma megmarad, és a margó nem torzul.

### 3.9 Retenció (visszatartás)
Nem külön tábla — a `client_invoices.retention_pct/amount/released_at` mezőkkel kezelve. Egy nézet listázza a fel nem engedett retenciókat, garanciális lejárat szerint (a `projects` mentenanță-fázisához vagy a szerződéses garanciaidőhöz kötve).

---

## 4. Kapcsolat a meglévő rendszerrel

- **`projects.value_* / currency / conversion_rate`** → a Valoare contract alapja; a change orderek módosítják.
- **`project_subcontractors.price_* / currency`** → az „Angajat" (elkötelezett) alvállalkozói rész; a rájuk érkező `supplier_invoices` a „Realizat".
- **`situations`** → a haladási elszámolás; egy finalizált situație-ből lesz `client_invoice` (a `situation_id` köti). A situație marad a *műszaki* elszámolás, a client_invoice a *pénzügyi/AR* rekord.
- **`exchange_rates`** → minden új tábla `conversion_rate`-je innen kapja a BNR EUR/RON-t létrehozáskor.
- **Munkaerő-költség (manoperă):** a tényleges saját munkaerő-költség a **pontaj** (jelenlét/óranyilvántartás) modultól függ, ami *még nem létezik* (a navban van egy használatlan `pontaj` kulcs — félig tervezve). **Átmeneti megoldás:** a manoperă tényleges költsége kézzel rögzíthető `supplier_invoices`-ként „Manoperă" kategóriával, vagy alvállalkozói számlaként. A teljes munkaerő-költségesítés a pontaj modullal jön (külön terv).

---

## 5. RLS és szerepkörök

A pénzügyi adat érzékeny — ez a modul a jó alkalom aktiválni a ma tétlen szerepköröket.

- **Új helper:** `can_manage_finance()` = `role in ('admin','finance')`. A `finance` szerep ma viselkedésileg viewer; itt kap valódi funkciót: számlák, PO-k, fizetések rögzítése/tükrözése.
- **Írás:** a deviz/PO/change order a `can_mutate_projects()` (admin + PM) alá; a számlák és fizetések a `can_manage_finance()` alá. (Az audit által jelzett inline `role in (...)` másolatok helyett *helperekkel* — ne ismételjük a hibát.)
- **Olvasás (fontos döntés):** a pénzügyi táblák **ne** legyenek `using (true)`. Javaslat: `can_read_project_financials(project_id)` security-definer helper = admin VAGY finance VAGY a projekt `manager_id`-je. Így egy PM csak a saját projektjei pénzügyeit látja, a finance/admin mindent. Ez összhangban van a korábbi láthatósági vitával (a dashboard RLS-megkerülés helyett itt egységes, tiszta modell).

---

## 6. Képernyők / UX

### 6.1 Projekt részletoldal → új „Financiar" fül
- **Fejléc KPI-k:** Valoare contract · Buget · Angajat · Realizat · **Marjă prognozată (% is)** · % facturat · De încasat.
- **Szekciók:** Deviz (budget lines) tábla kategóriánként · Comenzi (PO) lista · Facturi furnizori (AP) · Facturi clienți (AR) + a situație-k linkje · Acte adiționale (change order) · mini cash-flow.
- Kategóriánkénti terv-vs-tény sáv (hol csúszik túl a költség).

### 6.2 Portfólió „Financiar" dashboard (felső nav, finance/admin)
- Összes szerződéses érték · összköltség · összmargó + margó% · **AR-aging** (számlák lejárat szerint: 0-30/30-60/60-90/90+) · esedékes AP · havi cash-flow előrejelzés.
- Projektenkénti margó-tábla (rendezhető), piros zászlók: küszöb alatti margó, lejárt AR, túllépett buget.

### 6.3 Furnizori (suppliers)
CRUD a `clients`/`subcontractors` mintájára (tábla + add/edit dialógus).

### 6.4 Facturi register (globális)
AR és AP listák szűrőkkel (projekt, státusz, esedékesség), aging, tömeges „megjelölés fizetettként" (vagy importból frissül).

### 6.5 Import képernyő (könyvelés-tükrözés)
CSV feltöltés a SAGA/SmartBill exportból, oszlop-mapping, egyeztetés (matching kulcs: számlaszám + CUI). Előnézet → jóváhagyás → beírás. Később API-sync váltja/egészíti ki.

---

## 7. Integráció a könyvelő szoftverrel

Mivel a számla hiteles forrása a könyvelés, kell egy behozó út. Fázisolva:

1. **Kézi tükrözés** (Fázis 2) — a felhasználó rögzíti a számlaszámot, összeget, státuszt. Azonnal működik, nulla integráció.
2. **CSV import** (Fázis 4) — a könyvelőből exportált számlalista feltöltése + mapping. A legtöbb román szoftver (SAGA, SmartBill, WinMentor) tud CSV/Excel exportot.
3. **API-sync** (Fázis 4+) — pl. a **SmartBill** REST API-t ad; WinMentor/SAGA jellemzően export-alapú. Adapter-minta: `source` enum + `external_ref` a számlákon, egyeztetés `external_invoice_number` + CUI alapján; a sync frissíti a `status`-t és `paid_amount`-ot.

**Eldöntendő:** pontosan melyik könyvelő szoftvert használjátok — ez határozza meg az adaptert.

---

## 8. Fázisokra bontás

| Fázis | Tartalom | Eredmény |
|---|---|---|
| **1 — Alap** | `cost_categories` (seed) + `project_budget_lines` (deviz) + `suppliers` + „Financiar" fül olvasható margó-vázzal (bevétel a projekt-értékből és situație-kból, költség a devizből) | **Tervezett margó** azonnal látszik |
| **2 — Elkötelezettség & tény** | `purchase_orders(+lines)` + `supplier_invoices` (AP) + `client_invoices` (AR, kézi tükrözés) | Angajat + Realizat + **valós margó**, AR/AP |
| **3 — Szerződésmódosítás, retenció, cash-flow** | `change_orders` + `payments` + retenció-követés + portfólió pénzügyi dashboard + AR-aging | Teljes kontrolling-kép, cash-flow előrejelzés |
| **4 — Könyvelés-integráció** | CSV importer → API adapter; munkaerő-költség a pontaj modullal | Kevesebb kézi munka, teljes tényköltség |

Minden fázis külön migráció-csomag a meglévő elnevezés szerint (`YYYYMMDDNNNNN_...`), feature-slice-ban (`src/features/finance/...`), api-client → service réteggel, a mostani konvenciók szerint.

---

## 9. Eldöntött kérdések (2026-08-03)

1. **Jelentési deviza:** **EUR** (minden portfólió-gördítés EUR-ra normalizál a rögzített `conversion_rate`-tel).
2. **Retenció:** az alapértelmezés megfelel — 5-10%, a garanciaidő (mentenanță-fázis) végén felengedve; a `client_invoices` mezőin kezelve.
3. **Könyvelő szoftver:** **SAGA** — a Fázis 4 importadaptere ehhez készül (SAGA export → CSV import, később ha van, API).
4. **ÁFA-granularitás:** egyelőre **számlánként** egy `vat_rate` (a legtöbb számla egykulcsos). A séma úgy készül, hogy a soronkénti ÁFA később hozzáadható legyen anélkül, hogy át kellene alakítani.
5. **Pontaj:** **nem** indul párhuzamosan. A munkaerő-költség addig kézi „Manoperă" kategóriájú `supplier_invoices`-ként rögzül.
6. **Margó-küszöb:** **igen, kell** piros zászló. Alapérték **< 10%**, de konfigurálható (env vagy egy `app_settings` érték — ne bedrótozva).

---

## Források (ÁFA)
- [Romania VAT Rates 2026 — VATupdate](https://www.vatupdate.com/2026/02/12/romania-comprehensive-vat-country-guide-2026/)
- [Romania Increases VAT Rates by August 2025 — Marosa](https://marosavat.com/vat-news/romanian-vat-rate-changes)
