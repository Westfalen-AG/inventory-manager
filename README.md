# RJ45 Kabel Inventar-Manager

Ein modernes, mobile-optimiertes Tool für die Inventarisierung von RJ45-Kabeln mit QR-Code-Scanning und Label-Generation für Brother PT-P950NW Drucker.

## 🚀 Features

- **Mobile-optimierte Web-Anwendung** - Perfekt für Smartphone-Nutzung
- **QR-Code Scanning** - Schnelles Ein- und Auschecken über Kamera
- **Brother Label-Integration** - Generiert PDF-Labels für PT-P950NW (12mm & 24mm)
- **Benutzerrollen** - Manager und User mit unterschiedlichen Berechtigungen
- **Vollständige Inventarverwaltung** - RJ45-Kabel mit Länge, Farbe, CAT-Version, Indoor/Outdoor
- **Transaction-Logging** - Lückenlose Nachverfolgung aller Bewegungen
- **Standort-Tracking** - Organisieren Sie Ihr Inventar nach Standorten

## 🏗️ Technologie-Stack

### Backend
- **Node.js** mit Express.js
- **SQLite** Datenbank
- **JWT** Authentifizierung
- **QR-Code & PDF** Generation

### Frontend
- **React** mit Material-UI
- **Mobile-First** Design
- **QR-Code Scanner** Integration
- **Progressive Web App** Funktionen

## 📦 Installation

### Voraussetzungen
- Node.js (Version 16 oder höher)
- npm oder yarn

### 1. Repository klonen und Dependencies installieren

```bash
# Hauptprojekt
npm install

# Frontend Dependencies
cd client
npm install
cd ..
```

### 2. Server starten

```bash
# Entwicklungsmodus mit Nodemon
npm run dev

# Oder produktiv
npm start
```

### 3. Frontend bauen (für Produktion)

```bash
npm run build
```

Der Server läuft standardmäßig auf Port 3000. Das Frontend wird automatisch von Express ausgeliefert.

## 🔑 Standard-Anmeldedaten

- **Benutzername:** admin
- **Passwort:** admin123
- **Rolle:** Manager

## 📱 Nutzung

### Für Manager
1. **Items erstellen** - Neue RJ45-Kabel mit allen Details anlegen
2. **Labels generieren** - PDF-Labels für Brother Drucker erstellen
3. **Benutzer verwalten** - Neue User anlegen und Rollen zuweisen
4. **Inventar überblicken** - Vollständige Übersicht und Statistiken

### Für User
1. **QR-Code scannen** - Kamera für schnelle Item-Erkennung nutzen
2. **Check-out/Check-in** - Kabel entnehmen und zurückgeben
3. **Historie einsehen** - Eigene Transaktionen verfolgen

## 🏷️ Label-Generation

Das Tool generiert PDF-Labels, die perfekt für Brother PT-P950NW Drucker optimiert sind:

### 12mm Labels
- Kompakte Informationen
- QR-Code + Item-Name
- Ideal für kurze Kabel

### 24mm Labels  
- Erweiterte Informationen
- QR-Code + Name + Details (Länge, CAT, Farbe)
- Platz für Firmen-Logo

## 🗂️ Projektstruktur

```
inventory-manager/
├── server.js              # Express Server
├── package.json           # Backend Dependencies
├── database/
│   ├── database.js        # SQLite Setup & Schema
│   └── inventory.db       # SQLite Datenbankdatei
├── routes/                # API Routen
│   ├── auth.js           # Authentifizierung
│   ├── items.js          # Inventar-Management
│   ├── transactions.js   # Check-in/Check-out
│   ├── labels.js         # Label-Generation
│   └── users.js          # Benutzerverwaltung
├── middleware/
│   └── auth.js           # JWT Middleware
├── uploads/              # Generierte Files
│   └── labels/           # PDF Labels
└── client/               # React Frontend
    ├── package.json      # Frontend Dependencies
    ├── src/
    │   ├── components/   # React Komponenten
    │   ├── contexts/     # React Contexts
    │   ├── services/     # API Services
    │   └── App.js        # Haupt-App
    └── public/           # Statische Assets
```

## 🔧 Konfiguration

### Umgebungsvariablen
Erstellen Sie eine `.env` Datei im Hauptverzeichnis:

```env
PORT=3000
JWT_SECRET=ihr-geheimer-jwt-schluessel
NODE_ENV=production
```

### Brother Drucker Setup
1. Stellen Sie sicher, dass Ihr PT-P950NW im Netzwerk erreichbar ist
2. Labels werden als PDF generiert - drucken Sie diese über Ihren Browser oder PDF-Viewer
3. Verwenden Sie die "Tatsächliche Größe" Druckeinstellung für optimale Ergebnisse

## 🚀 Deployment

### Auf VPS/Server
1. Repository auf Server klonen
2. Dependencies installieren: `npm install && cd client && npm install && cd ..`
3. Frontend bauen: `npm run build`
4. PM2 für Prozess-Management: `pm2 start server.js --name inventory-manager`
5. Nginx als Reverse Proxy konfigurieren

### Docker (optional)
```dockerfile
# Dockerfile wird bei Bedarf bereitgestellt
```

## 🛡️ Sicherheit

- JWT-basierte Authentifizierung
- Passwort-Hashing mit bcrypt
- Rate Limiting für API-Endpunkte
- Eingabe-Validierung und Sanitisierung
- CORS-Konfiguration

## 📊 API-Dokumentation

### Authentifizierung
- `POST /api/auth/login` - Benutzer anmelden
- `GET /api/auth/me` - Aktuelle Benutzerdaten
- `POST /api/auth/change-password` - Passwort ändern

### Items
- `GET /api/items` - Alle Items (mit Paginierung)
- `POST /api/items` - Neues Item erstellen (Manager)
- `GET /api/items/:id` - Item-Details
- `PUT /api/items/:id` - Item aktualisieren (Manager)
- `DELETE /api/items/:id` - Item löschen (Manager)

### Transaktionen
- `POST /api/transactions/checkout` - Item auschecken
- `POST /api/transactions/checkin` - Item einchecken
- `GET /api/transactions` - Transaktions-Historie
- `GET /api/transactions/my-history` - Eigene Transaktionen

### Labels
- `POST /api/labels/generate/:item_id` - Label generieren (Manager)
- `GET /api/labels/download/:filename` - Label herunterladen

## 🤝 Contributing

1. Fork das Repository
2. Erstellen Sie einen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Commiten Sie Ihre Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffnen Sie eine Pull Request

## 📝 Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Siehe [LICENSE](LICENSE) für Details.

## 📞 Support

Bei Fragen oder Problemen öffnen Sie bitte ein Issue im Repository oder kontaktieren Sie das Entwicklungsteam.

---

**Hinweis:** Dieses Tool wurde speziell für die Inventarisierung von RJ45-Kabeln entwickelt, kann aber leicht für andere Inventar-Typen angepasst werden. 