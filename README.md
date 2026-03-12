[README.md](https://github.com/user-attachments/files/25940149/README.md)
# 📸 NIT Class Gallery

A photo-sharing platform where students upload class photos and the CR (Class Representative) approves them before they appear publicly.

---

## 🚀 Quick Start

```bash
npx create-react-app nit-gallery
cd nit-gallery
npm install firebase
# Replace src/App.js with the provided App.jsx
npm start
```

---

## 🔥 Firebase Setup (Step by Step)

### 1. Create Firebase Project
- Go to https://console.firebase.google.com
- Click **Add project** → Name it (e.g. `nit-gallery`) → Create

### 2. Enable Authentication
- Sidebar → **Authentication** → Get Started
- Sign-in method → **Email/Password** → Enable → Save

### 3. Create CR Admin Account
- Authentication → **Users** tab → **Add User**
- Email: `cr@nitcampus.edu` (match `CR_EMAIL` in App.jsx)
- Password: choose a strong one

### 4. Enable Firestore
- Sidebar → **Firestore Database** → Create database
- Choose **Production mode** → Select region → Done

### 5. Enable Storage
- Sidebar → **Storage** → Get started → Done

### 6. Get Firebase Config
- Project Settings (gear icon) → Your Apps → **Add App** (Web `</>`)
- Register app → Copy the `firebaseConfig` object
- Paste into `App.jsx` at the top

---

## 🔐 Security Rules

### Firestore Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /photos/{photoId} {
      // Anyone can read approved photos
      allow read: if resource.data.status == 'approved'
                  || request.auth != null;
      // Anyone can upload (create)
      allow create: if request.resource.data.keys()
                      .hasAll(['title','imageUrl','status','createdAt'])
                    && request.resource.data.status == 'pending';
      // Only CR can approve/reject
      allow update: if request.auth != null
                    && request.auth.token.email == 'cr@nitcampus.edu';
      allow delete: if request.auth != null
                    && request.auth.token.email == 'cr@nitcampus.edu';
    }
  }
}
```

### Storage Rules
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/{allPaths=**} {
      allow read: if true;
      allow write: if request.resource.size < 10 * 1024 * 1024
                    && request.resource.contentType.matches('image/.*');
    }
  }
}
```

---

## 📁 File Structure

```
src/
└── App.jsx          ← Single-file React app (all components)
public/
└── index.html       ← Default CRA HTML
```

---

## ✨ Features

| Feature | Details |
|---|---|
| 📤 Student Upload | Drag-and-drop, title + name + description |
| ⏳ Pending Queue | All uploads go to CR for review first |
| ✅ CR Dashboard | Approve / Reject with one click |
| 🖼️ Public Gallery | Only approved photos visible |
| 📋 My Uploads | Students see status of their own uploads |
| 🔍 Lightbox | Full-screen view + download |
| 📱 Mobile Friendly | Responsive on all screen sizes |
| 🔔 Notifications | Toast notifications for all actions |

---

## 🔑 Admin Login

- **URL**: Click "CR Login" in the navbar
- **Email**: `cr@nitcampus.edu` (change in App.jsx)
- **Password**: Set in Firebase Console → Authentication

---

## 🌐 Deployment (Free)

### Firebase Hosting
```bash
npm install -g firebase-tools
npm run build
firebase login
firebase init hosting  # select build folder
firebase deploy
```

### Vercel
```bash
npm install -g vercel
npm run build
vercel --prod
```

---

## 🛠 Customization

| What | Where |
|---|---|
| CR Email | `const CR_EMAIL = "..."` at top of App.jsx |
| Brand name | Search `NIT·Gallery` in App.jsx |
| Accent color | CSS variable `--blue: #2563eb` |
| Max file size | Storage rule `10 * 1024 * 1024` |

---

Built with ❤️ for NIT students by Naveen 🚀
