# Modul Comunicare — notă de concept

**Către:** conducere · **De la:** IT / Dezvoltare aplicație internă · **Data:** 12 august 2026
**Referință:** cererea „*vrem un dashboard cu informații, comunicații, pinuri — un fel de Google Keep integrat*"

---

## 1. Ce am înțeles din cerere

Riscul semnalat este corect și, în opinia noastră, este cel mai important risc operațional al firmei în acest moment:

> *„din persoane, echipa se formează prin comunicație… cum creștem, crește nivelul de informații, negestionate pe canale, crește haosul."*

Cererea concretă a fost un „Google Keep integrat". Propunem **mai mult decât atât** — și explicăm de ce.

## 2. De ce un Google Keep, pur și simplu, nu ar rezolva problema

Problema nu este că nu avem **unde** scrie. Avem WhatsApp, unde oricine poate scrie orice. Problema este că informația scrisă **nu are adresă, nu are stare și nu are responsabil**:

| Ce se întâmplă azi | De ce se transformă în haos |
|---|---|
| Totul într-un flux WhatsApp | Informația nu are **adresă** — nu se vede despre ce proiect este vorba. După două săptămâni nu mai poate fi găsită. |
| „Am scris pe grup" | Nu are **stare** — nu se știe dacă s-a citit, dacă s-a înțeles, dacă s-a făcut. |
| Verbal, la telefon, pe șantier | Nu rămâne nicio urmă. Decizia există, dar doar în capul a două persoane. |
| Număr crescător de proiecte | Volumul crește liniar, ordinea nu — exact mecanismul descris în „crește haosul". |

Un perete de bilețele electronice ar muta haosul într-un loc nou: 400 de notițe galbene, fără proiect și fără responsabil. Aceeași problemă, altă interfață.

**Principiul propus:** *fiecare informație primește o adresă (despre ce este) și o stare (nou / văzut / făcut / închis).* Experiența „Keep" rămâne — dar ca formă, nu ca fond.

## 3. Ce construim — cererea, tradusă

| Cuvântul din cerere | Ce înseamnă concret |
|---|---|
| **informații** | Flux de activitate: ce s-a schimbat în sistem + ce au scris oamenii, în ordine cronologică, pe fiecare proiect |
| **comunicații** | Discuții (notiță + răspunsuri) **legate direct de proiect, de o activitate din Matrice, de o situație de lucrări sau de un client**, cu `@menționare` |
| **pinuri** | Fixare pe două niveluri: **pe proiect** (o vede toată echipa, în capul paginii) și **personal** (doar eu, pe panoul meu) |
| *(nu a fost cerut, dar este esențial)* | **Confirmare de citire** pentru comunicate — se vede cine a confirmat și cine nu |

Pentru fiecare angajat apare o singură bandă, sus: **„Pentru mine"** — mențiuni necitite, comunicate de confirmat, termene de azi. Dacă banda este goală, ziua este în regulă. Acesta este, practic, tot ce trebuie să învețe cineva să folosească.

Clopoțelul din bara de sus devine **singura cutie de intrare**: acolo ajung și avertizările automate care azi pleacă doar pe e-mail (avize care expiră, mentenanțe scadente). Două cutii de intrare = zero cutii de intrare.

## 4. Ce nu facem

- **Nu desființăm WhatsApp.** Pentru coordonare de moment („ajung în 10 minute", „când vine macaraua") este perfect și rămâne. Scoatem din WhatsApp **un singur lucru**: deciziile și termenele. Dacă încercăm să mutăm totul dintr-o dată, nu se va muta nimic.
- **Nu dublăm contabilitatea sau alte sisteme.** Modulul este strat de comunicare, nu registru financiar.
- **Nu construim doar pentru desktop.** Omul de pe teren deține cele mai multe informații operative și are azi cea mai slabă voce. Panoul se construiește **întâi pentru telefon**.

## 5. Un punct tehnic care necesită decizie de management

Ne-am dorit ca anunțurile să fie trimise automat **și** pe grupurile WhatsApp existente. Am verificat: **nu este posibil oficial.** API-ul oficial WhatsApp pentru grupuri (august 2026) permite doar grupuri **create de aplicație**, limitate la **8 participanți**, și necesită un **Official Business Account**. Aplicația **nu poate intra și nu poate scrie în grupurile WhatsApp pe care le folosim azi.**

Alternativele reale, în ordinea raportului cost/beneficiu:

1. **Clopoțel în aplicație** — inclus, fără cost suplimentar.
2. **Digest pe e-mail** (infrastructura există deja) — ~1 zi de lucru.
3. **Microsoft Teams** — ~o jumătate de zi, gratuit, integrarea Microsoft există deja în aplicație. **Cea mai bună variantă** dacă se decide adoptarea Teams la nivel de firmă.
4. **WhatsApp 1-la-1**, doar pentru 3-4 alerte critice — necesită cont oficial de business, șabloane aprobate de Meta și **cost per mesaj**. Posibil, dar într-o etapă ulterioară.

**Decizie necesară:** rămânem pe e-mail, sau adoptăm Teams ca al doilea canal? Recomandarea noastră: **Teams**.

## 6. Etape și efort

| Etapă | Conținut | Efort | Rezultat |
|---|---|---|---|
| **0** | Pregătiri tehnice (drepturi, notificări de eroare vizibile) | ~1 zi | Nimic nu se mai pierde în silence |
| **1** | Notițe și discuții legate de proiecte · pinuri · **Panoul meu** · căutare globală în notițe | ~1–1,5 săpt. | Fiecare informație are adresă și poate fi găsită. *Aceasta este partea vizibilă, „Keep-ul".* |
| **2** | **Comunicate cu confirmare de citire** · clopoțel real · digest e-mail · Teams | ~1 săpt. | O singură cutie de intrare și **se vede cine știe ce**. De aici încolo problema semnalată este efectiv rezolvată. |
| **3** | Flux de activitate pe proiect · indicatori de comunicare | ~1 săpt. | „Ce s-a întâmplat pe proiectul X" — la o singură apăsare |
| **4** | Actualizare în timp real · atașamente OneDrive · notificări pe telefon | ~1 săpt. | Confort și viteză |

**Total: ~4–5 săptămâni.** După primele două etape (2–2,5 săptămâni) efectul este deja măsurabil.

## 7. Regulile fără care nu funcționează

Acest proiect este **40% tehnologie și 60% obicei**. Dacă livrăm doar interfața, în trei săptămâni totul revine pe WhatsApp. Propunem ca următoarele reguli să fie **anunțate de conducere** odată cu lansarea:

1. **Dacă nu este în aplicație, nu s-a întâmplat** — pentru decizii, angajamente, termene, riscuri.
2. **Fiecare informație are o adresă** — se atașează unui proiect sau unei activități.
3. **WhatsApp rămâne pentru coordonare de moment**, nu pentru decizii.
4. **Fiecare comunicat are responsabil și termen de confirmare.**
5. **5 minute la începutul turei** — fiecare deschide banda „Pentru mine".
6. **15 minute săptămânal** — în ședința de proiect trecem prin întrebările și riscurile deschise mai vechi de 7 zile.

## 8. Cum vom ști că a funcționat

Nu întrebăm oamenii dacă sunt mulțumiți. Măsurăm patru cifre:

- **Rata de confirmare în 24 de ore** — ținta: peste 80%. *Indicatorul principal.*
- **Numărul de întrebări deschise mai vechi de 7 zile** — dacă crește, sistemul doar acumulează, nu comunică.
- **Proporția proiectelor active cu comunicare înregistrată** — un proiect silențios o lună nu este liniște, este canal paralel.
- **Numărul de decizii înregistrate** — remediul concret pentru discuțiile „nu am știut".

## 9. Ce vă cerem acum

1. **Acord de principiu** pe direcție: comunicare legată de proiecte + confirmare de citire, nu doar un perete de notițe.
2. **Decizie pe canalul secundar:** e-mail sau Microsoft Teams (recomandăm Teams).
3. **Decizie:** cine are dreptul să emită comunicate la nivel de firmă (recomandăm: administrator + manageri de proiect — dacă poate oricine, comunicatul își pierde greutatea).
4. **Angajamentul conducerii pe cele 6 reguli** de la punctul 7. Fără acesta, construim o funcționalitate frumoasă pe care nimeni nu o va folosi.

---

*Planul tehnic detaliat (model de date, drepturi de acces, ordinea de implementare) există separat și este disponibil la cerere.*
