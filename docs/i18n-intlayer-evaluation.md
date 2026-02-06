# Intlayer - i18n Library Evaluation

> Evaluiert: Februar 2026 | Version: 7.5.x | [GitHub](https://github.com/aymericzip/intlayer) | [Website](https://intlayer.org)

## Was ist Intlayer?

Intlayer ist ein modernes, framework-agnostisches i18n-Framework mit Per-Component Content Declarations, integriertem CMS/Visual Editor und AI-gestuetzter Uebersetzung. Es positioniert sich als typsichere Alternative zu react-i18next und react-intl.

## Unterstuetzte Frameworks

| Framework | Status |
|-----------|--------|
| React | Stabil |
| Next.js | Stabil (App Router + Pages) |
| Vue.js | Stabil |
| Nuxt | Stabil |
| Svelte | Stabil |
| Angular | Stabil |
| Express / NestJS | Stabil |

## Vorteile

### 1. Strikte TypeScript-Typsicherheit
- Auto-generierte Typen aus Content Declarations
- Fehlende oder falsche Translation Keys werden zur Compile-Zeit erkannt
- IDE-Autocomplete fuer alle Keys

```typescript
// Intlayer: Typsicher - Tippfehler = Compile Error
const { title, description } = useIntlayer("myComponent");

// react-i18next: Strings - Tippfehler = Runtime Fallback
const { t } = useTranslation();
t("myComponent.titl"); // kein Fehler, zeigt Key als Text
```

### 2. Per-Component Content Declarations
- Translations leben direkt neben der Komponente
- Kein Wechsel zwischen Code und zentralen JSON-Dateien
- Einfacheres Refactoring und Loeschen von Komponenten

```
src/
  components/
    LoginForm/
      LoginForm.tsx
      LoginForm.content.ts    <-- Translations hier
    Dashboard/
      Dashboard.tsx
      Dashboard.content.ts    <-- statt in locales/en/translation.json
```

### 3. Build-Time Validation
- Fehlende Locales/Keys erzeugen Warnings oder Errors beim Build
- Verhindert unuebersetzte Stellen in Production
- react-i18next zeigt fehlende Keys erst zur Laufzeit (Key als Text oder Fallback)

### 4. Tree-Shaking
- Nur tatsaechlich genutzte Translations landen im Bundle
- Besonders relevant bei grossen Projekten mit vielen Sprachen
- react-i18next laedt immer die komplette Locale-Datei

### 5. Integrierter Visual Editor / CMS
- Browser-basierter Editor zum Bearbeiten von Translations
- Nicht-Entwickler koennen Texte direkt aendern
- Kein separates Translation-Management-Tool noetig

### 6. AI-gestuetzte Uebersetzung
- Automatische Uebersetzung in 231 Sprachen
- Direkt in den Workflow integriert
- Reduziert manuellen Uebersetzungsaufwand

### 7. Markdown & Rich Content
- Unterstuetzt Markdown direkt in Content Declarations
- Conditional Content basierend auf Locale oder Context
- Komplexere Content-Strukturen als reine Key-Value Paare

## Nachteile

### 1. Geringe Verbreitung
| Metrik | Intlayer | react-i18next |
|--------|----------|---------------|
| npm Downloads/Woche | ~61.000 | ~2.100.000 |
| GitHub Stars | ~583 | ~9.500+ |
| StackOverflow Fragen | Kaum | Tausende |
| Faktor | 1x | **34x mehr** |

**Risiko:** Weniger Community-Support, weniger Tutorials, weniger geloeste Edge Cases.

### 2. Einzelner Maintainer
- Primaer von einem Entwickler (aymericzip) betrieben
- Risiko bei Burnout, Jobwechsel oder Interessenverlust
- react-i18next wird von i18next.com (Firma) und grosser Community maintained

### 3. Migrationsaufwand
- Kompletter Umbau bestehender i18n-Setups erforderlich
- Alle Komponenten muessen umgeschrieben werden
- Neue Content Declaration Files pro Komponente erstellen
- Config, Tooling und CI/CD anpassen

### 4. Vendor Lock-in (CMS/Editor)
- Visual Editor und CMS binden an Intlayer-Infrastruktur
- Bei Wechsel der i18n-Library geht dieses Tooling verloren
- Core-Library ist Open Source, aber CMS-Features koennten kostenpflichtig werden

### 5. Dependency-Gewicht
- Mehr transitive Dependencies als das schlanke i18next-Ecosystem
- Build-Pipeline wird komplexer (Content Compilation Step)
- Hoehere Wahrscheinlichkeit von Dependency-Konflikten

### 6. Weniger Ecosystem-Plugins
- i18next hat Plugins fuer: HTTP Backend, LocalStorage, Namespace Loading, Pluralization, ICU, etc.
- Intlayer deckt vieles intern ab, aber weniger Flexibilitaet bei Sonderfaellen
- Weniger Third-Party-Integrationen verfuegbar

## Wann Intlayer waehlen?

**Gut geeignet fuer:**
- Neue Projekte ohne bestehende i18n-Loesung
- Grosse Projekte mit 10+ Sprachen und 50+ Komponenten
- Teams mit Non-Dev Content-Editoren (CMS-Feature)
- Projekte die strikte Typsicherheit bei Translations priorisieren
- Monorepos mit geteilten Komponenten (Per-Component Declarations)

**Nicht geeignet fuer:**
- Bestehende Projekte mit funktionierender react-i18next Integration
- Kleine Projekte mit 2-3 Sprachen und <200 Keys
- Sicherheitskritische Projekte die auf bewaehrte Libraries setzen muessen
- Teams ohne TypeScript
- Projekte die minimale Dependencies benoetigen

## Vergleich: Installation

### Intlayer
```bash
npm install intlayer react-intlayer
npx intlayer init
```

### react-i18next (aktuelles Setup)
```bash
npm install i18next react-i18next i18next-browser-languagedetector i18next-http-backend
```

## Fazit

Intlayer loest echte Probleme (Typsicherheit, Build-Time Validation, Co-Location), die bei react-i18next nur mit Zusatztools erreichbar sind. Fuer **neue, grosse Projekte** mit TypeScript ist es eine ernstzunehmende Option.

Fuer **bestehende Projekte** oder **kleine bis mittlere Anwendungen** ueberwiegen die Risiken (geringe Verbreitung, einzelner Maintainer, Migrationsaufwand) gegenueber den Vorteilen.

**Empfehlung:** Bei neuen Projekten evaluieren, bei bestehenden Projekten bei react-i18next bleiben. Intlayer im Auge behalten - wenn die Community waechst und der Maintainer-Kreis sich erweitert, wird es eine starke Alternative.

## Quellen

- [Intlayer GitHub Repository](https://github.com/aymericzip/intlayer)
- [Intlayer npm](https://www.npmjs.com/package/intlayer)
- [react-i18next vs react-intl vs intlayer (Intlayer Blog)](https://github.com/aymericzip/intlayer/blob/main/docs/blog/en/react-i18next_vs_react-intl_vs_intlayer.md)
- [Best i18n Libraries for React - Phrase](https://phrase.com/blog/posts/react-i18n-best-libraries/)
- [Best i18n Libraries for Next.js App Router 2025 - Medium](https://medium.com/better-dev-nextjs-react/the-best-i18n-libraries-for-next-js-app-router-in-2025-21cb5ab2219a)
